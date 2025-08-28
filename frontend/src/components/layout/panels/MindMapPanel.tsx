import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, Network, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'

export interface MindMapNode {
  id: string
  label: string
  type?: string
  position?: { x: number; y: number }
}

export interface MindMapEdge {
  id: string
  source: string
  target: string
  label?: string
  type?: string
}

export interface MindMapData {
  nodes: MindMapNode[]
  edges: MindMapEdge[]
  session_id?: string
  timestamp?: string
}

interface MindMapPanelProps {
  mindMapData?: MindMapData | null
  error?: string | null
  onClearMindMap?: () => void
  onGenerateRandomMindMap?: () => void
  selectedSessionId?: string | null
  sessionMindMaps?: MindMapData[]
  isLoadingSessionContent?: boolean
  isGeneratingRandom?: boolean
  isGeneratingAutomatic?: boolean
}

interface ViewportState {
  scale: number
  translateX: number
  translateY: number
}

interface NodePosition {
  id: string
  x: number
  y: number
  vx: number // velocity x
  vy: number // velocity y
  fx?: number // fixed position x
  fy?: number // fixed position y
}

// Force-directed graph layout algorithm
class ForceDirectedLayout {
  private nodes: NodePosition[]
  private edges: MindMapEdge[]
  private width: number
  private height: number
  private centerX: number
  private centerY: number

  constructor(nodes: NodePosition[], edges: MindMapEdge[], width: number, height: number) {
    this.nodes = nodes
    this.edges = edges
    this.width = width
    this.height = height
    this.centerX = width / 2
    this.centerY = height / 2
  }

  // Calculate attractive forces between connected nodes
  private attractiveForce(edge: MindMapEdge, strength: number = 0.1) {
    const source = this.nodes.find(n => n.id === edge.source)
    const target = this.nodes.find(n => n.id === edge.target)
    
    if (!source || !target) return

    const dx = target.x - source.x
    const dy = target.y - source.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance === 0) return

    const force = (distance - 80) * strength // Reduced target distance for tighter clustering
    
    source.vx += (dx / distance) * force
    source.vy += (dy / distance) * force
    target.vx -= (dx / distance) * force
    target.vy -= (dy / distance) * force
  }

  // Calculate repulsive forces between all nodes
  private repulsiveForce(strength: number = 800) {
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const nodeA = this.nodes[i]
        const nodeB = this.nodes[j]
        
        const dx = nodeB.x - nodeA.x
        const dy = nodeB.y - nodeA.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance === 0) {
          // Add small random offset to prevent exact overlap
          nodeA.x += (Math.random() - 0.5) * 10
          nodeA.y += (Math.random() - 0.5) * 10
          continue
        }
        
        const force = strength / (distance * distance)
        
        nodeA.vx -= (dx / distance) * force
        nodeA.vy -= (dy / distance) * force
        nodeB.vx += (dx / distance) * force
        nodeB.vy += (dy / distance) * force
      }
    }
  }

  // Apply velocity to positions
  private applyVelocity(damping: number = 0.9) {
    this.nodes.forEach(node => {
      if (node.fx !== undefined && node.fy !== undefined) {
        // Fixed position nodes don't move
        node.vx = 0
        node.vy = 0
        return
      }
      
      node.x += node.vx
      node.y += node.vy
      node.vx *= damping
      node.vy *= damping
    })
  }

  // Keep nodes within bounds - more restrictive for squarish layout
  private applyBounds() {
    const padding = 80 // Reduced padding for tighter layout
    const maxWidth = this.width - padding * 2
    const maxHeight = this.height - padding * 2
    
    this.nodes.forEach(node => {
      if (node.fx !== undefined && node.fy !== undefined) return
      
      // Keep nodes within a more squarish area
      if (node.x < padding) {
        node.x = padding
        node.vx = 0
      } else if (node.x > this.width - padding) {
        node.x = this.width - padding
        node.vx = 0
      }
      
      if (node.y < padding) {
        node.y = padding
        node.vy = 0
      } else if (node.y > this.height - padding) {
        node.y = this.height - padding
        node.vy = 0
      }
    })
  }

  // Find connected components
  private findConnectedComponents(): string[][] {
    const visited = new Set<string>()
    const components: string[][] = []
    
    const dfs = (nodeId: string, component: string[]) => {
      if (visited.has(nodeId)) return
      visited.add(nodeId)
      component.push(nodeId)
      
      // Find all connected nodes
      this.edges.forEach(edge => {
        if (edge.source === nodeId && !visited.has(edge.target)) {
          dfs(edge.target, component)
        } else if (edge.target === nodeId && !visited.has(edge.source)) {
          dfs(edge.source, component)
        }
      })
    }
    
    this.nodes.forEach(node => {
      if (!visited.has(node.id)) {
        const component: string[] = []
        dfs(node.id, component)
        components.push(component)
      }
    })
    
    return components
  }

  // Position components in a more squarish grid layout
  private positionComponents(components: string[][]) {
    if (components.length <= 1) return
    
    const padding = 80 // Reduced padding for tighter layout
    const maxWidth = this.width - padding * 2
    const maxHeight = this.height - padding * 2
    
    const componentSpacing = 200 // Reduced spacing
    const maxComponentsPerRow = Math.ceil(Math.sqrt(components.length))
    let currentRow = 0
    let currentCol = 0
    
    components.forEach((component, index) => {
      // Calculate component bounds
      const componentNodes = this.nodes.filter(n => component.includes(n.id))
      const minX = Math.min(...componentNodes.map(n => n.x))
      const maxX = Math.max(...componentNodes.map(n => n.x))
      const minY = Math.min(...componentNodes.map(n => n.y))
      const maxY = Math.max(...componentNodes.map(n => n.y))
      const width = maxX - minX
      const height = maxY - minY
      
      // Calculate target position in grid
      const targetX = padding + currentCol * (maxWidth + componentSpacing)
      const targetY = padding + currentRow * (maxHeight + componentSpacing)
      
      // Move component to new position
      const offsetX = targetX - minX
      const offsetY = targetY - minY
      
      componentNodes.forEach(node => {
        node.x += offsetX
        node.y += offsetY
      })
      
      // Move to next position in grid
      currentCol++
      if (currentCol >= maxComponentsPerRow) {
        currentCol = 0
        currentRow++
      }
    })
  }

  // Run the layout algorithm
  public run(iterations: number = 100) {
    // Initialize positions in a more squarish pattern
    this.nodes.forEach((node, index) => {
      if (node.x === 0 && node.y === 0) {
        // Place nodes in a square grid pattern initially
        const gridSize = Math.ceil(Math.sqrt(this.nodes.length))
        const row = Math.floor(index / gridSize)
        const col = index % gridSize
        
        const spacing = Math.min(this.width, this.height) / (gridSize + 1)
        node.x = this.centerX + (col - gridSize / 2) * spacing
        node.y = this.centerY + (row - gridSize / 2) * spacing
      }
    })

    // Run force simulation
    for (let i = 0; i < iterations; i++) {
      this.repulsiveForce()
      this.edges.forEach(edge => this.attractiveForce(edge))
      this.applyVelocity()
      this.applyBounds()
    }

    // Separate disconnected components
    const components = this.findConnectedComponents()
    if (components.length > 1) {
      this.positionComponents(components)
    }

    return this.nodes
  }
}

export function MindMapPanel({ 
  mindMapData = null, 
  error = null, 
  onClearMindMap,
  onGenerateRandomMindMap,
  selectedSessionId = null,
  sessionMindMaps = [],
  isLoadingSessionContent = false,
  isGeneratingRandom = false,
  isGeneratingAutomatic = false
}: MindMapPanelProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Viewport state for zoom and pan
  const [viewport, setViewport] = useState<ViewportState>({
    scale: 1,
    translateX: 0,
    translateY: 0
  })
  
  // Node positions for dragging
  const [nodePositions, setNodePositions] = useState<NodePosition[]>([])
  const [draggedNode, setDraggedNode] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  
  // Container dimensions for responsive sizing
  const [containerDimensions, setContainerDimensions] = useState({ width: 1200, height: 800 })

  const clearMindMap = () => {
    onClearMindMap?.()
    // Reset viewport when clearing
    setViewport({ scale: 1, translateX: 0, translateY: 0 })
    setNodePositions([])
  }

  const getPanelTitle = () => {
    if (selectedSessionId) {
      return `Mind Map (${selectedSessionId.slice(-8)})`
    }
    return 'Mind Map'
  }

  // Initialize node positions when data changes
  useEffect(() => {
    const data = mindMapData || (sessionMindMaps.length > 0 ? sessionMindMaps[sessionMindMaps.length - 1] : null)
    if (data?.nodes && data?.edges) {
      // Create initial node positions
      const initialPositions: NodePosition[] = data.nodes.map((node, index) => {
        if (node.position) {
          return { 
            id: node.id, 
            x: node.position.x, 
            y: node.position.y,
            vx: 0,
            vy: 0
          }
        }
        
        // Use force-directed layout for better positioning
        const angle = (index * 2 * Math.PI) / data.nodes.length
        const radius = Math.min(200, Math.max(150, data.nodes.length * 20))
        const x = Math.cos(angle) * radius
        const y = Math.sin(angle) * radius
        
        return { 
          id: node.id, 
          x, 
          y,
          vx: 0,
          vy: 0
        }
      })

      // Run force-directed layout
      const layout = new ForceDirectedLayout(
        initialPositions,
        data.edges,
        containerDimensions.width,
        containerDimensions.height
      )
      
      const optimizedPositions = layout.run(150) // More iterations for better layout
      setNodePositions(optimizedPositions)

      // Calculate bounds and adjust viewport to fit all nodes
      if (optimizedPositions.length > 0) {
        const bounds = calculateNodeBounds(optimizedPositions)
        adjustViewportToFit(bounds)
      }
    }
  }, [mindMapData, sessionMindMaps, containerDimensions])

  // Calculate the bounds of all nodes
  const calculateNodeBounds = (positions: NodePosition[]) => {
    if (positions.length === 0) return null

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

    positions.forEach(pos => {
      // Account for node size (approximate based on typical node dimensions)
      const nodeWidth = 120 // Approximate node width
      const nodeHeight = 60  // Approximate node height
      
      minX = Math.min(minX, pos.x - nodeWidth / 2)
      maxX = Math.max(maxX, pos.x + nodeWidth / 2)
      minY = Math.min(minY, pos.y - nodeHeight / 2)
      maxY = Math.max(maxY, pos.y + nodeHeight / 2)
    })

    return { minX, minY, maxX, maxY }
  }

  // Adjust viewport to fit all nodes as closely as possible
  const adjustViewportToFit = (bounds: { minX: number, minY: number, maxX: number, maxY: number } | null) => {
    if (!bounds) return

    const padding = 40 // Minimal padding for tight fit
    const contentWidth = bounds.maxX - bounds.minX + padding * 2
    const contentHeight = bounds.maxY - bounds.minY + padding * 2
    
    const containerWidth = Math.max(containerDimensions.width, 800)
    const containerHeight = Math.max(containerDimensions.height, 600)
    
    // Calculate scale to fit content - allow zooming in slightly for better visibility
    const scaleX = containerWidth / contentWidth
    const scaleY = containerHeight / contentHeight
    const scale = Math.min(scaleX, scaleY, 1.2) // Allow up to 120% zoom for better readability
    
    // Calculate translation to center content
    const centerX = (bounds.minX + bounds.maxX) / 2
    const centerY = (bounds.minY + bounds.maxY) / 2
    
    const translateX = (containerWidth / 2 - centerX * scale)
    const translateY = (containerHeight / 2 - centerY * scale)
    
    setViewport({
      scale,
      translateX,
      translateY
    })
  }

  // Update container dimensions when container ref changes
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        // Only update if we have valid dimensions
        if (rect.width > 0 && rect.height > 0) {
          setContainerDimensions({
            width: rect.width,
            height: rect.height
          })
        }
      }
    }

    // Initial update with a small delay to ensure container is rendered
    const timer = setTimeout(updateDimensions, 100)
    
    // Add resize listener
    const resizeObserver = new ResizeObserver(updateDimensions)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => {
      clearTimeout(timer)
      resizeObserver.disconnect()
    }
  }, [])

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.max(0.1, Math.min(3, viewport.scale * delta))
    
    // Zoom towards mouse position
    const rect = svgRef.current?.getBoundingClientRect()
    if (rect) {
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      
      const scaleDiff = newScale - viewport.scale
      const newTranslateX = viewport.translateX - (mouseX * scaleDiff)
      const newTranslateY = viewport.translateY - (mouseY * scaleDiff)
      
      setViewport({
        scale: newScale,
        translateX: newTranslateX,
        translateY: newTranslateY
      })
    }
  }, [viewport])

  // Pan functionality
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('.mind-map-node')) {
      // Start node dragging
      const nodeId = target.closest('.mind-map-node')?.getAttribute('data-node-id')
      if (nodeId) {
        setDraggedNode(nodeId)
        setIsDragging(true)
        setDragStart({ x: e.clientX, y: e.clientY })
      }
    } else {
      // Start panning
      setIsPanning(true)
      setPanStart({ x: e.clientX - viewport.translateX, y: e.clientY - viewport.translateY })
    }
  }, [viewport])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && draggedNode) {
      // Handle node dragging
      const deltaX = (e.clientX - dragStart.x) / viewport.scale
      const deltaY = (e.clientY - dragStart.y) / viewport.scale
      
      setNodePositions(prev => prev.map(pos => 
        pos.id === draggedNode 
          ? { ...pos, x: pos.x + deltaX, y: pos.y + deltaY }
          : pos
      ))
      
      setDragStart({ x: e.clientX, y: e.clientY })
    } else if (isPanning) {
      // Handle panning
      setViewport(prev => ({
        ...prev,
        translateX: e.clientX - panStart.x,
        translateY: e.clientY - panStart.y
      }))
    }
  }, [isDragging, draggedNode, dragStart, isPanning, panStart, viewport])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setIsPanning(false)
    setDraggedNode(null)
  }, [])

  // Zoom controls
  const zoomIn = () => {
    setViewport(prev => ({
      ...prev,
      scale: Math.min(3, prev.scale * 1.2)
    }))
  }

  const zoomOut = () => {
    setViewport(prev => ({
      ...prev,
      scale: Math.max(0.1, prev.scale / 1.2)
    }))
  }

  const resetView = () => {
    // Reset to fit all nodes
    if (nodePositions.length > 0) {
      const bounds = calculateNodeBounds(nodePositions)
      adjustViewportToFit(bounds)
    } else {
      setViewport({ scale: 1, translateX: 0, translateY: 0 })
    }
  }

  const renderMindMap = (data: MindMapData) => {
    if (!data.nodes || data.nodes.length === 0) {
      return (
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-muted-foreground">No mind map data available</p>
        </div>
      )
    }

    // Calculate dynamic bounds based on actual node positions
    const bounds = calculateNodeBounds(nodePositions)
    const padding = 100 // Reduced padding for more compact layout
    
    // Use dynamic container size based on content bounds
    let containerWidth = Math.max(containerDimensions.width, 800)
    let containerHeight = Math.max(containerDimensions.height, 600)
    
    if (bounds) {
      // Expand container to accommodate all nodes with minimal extra space
      const contentWidth = bounds.maxX - bounds.minX + padding * 2
      const contentHeight = bounds.maxY - bounds.minY + padding * 2
      
      containerWidth = Math.max(containerWidth, contentWidth)
      containerHeight = Math.max(containerHeight, contentHeight)
    }

    return (
      <div 
        ref={containerRef}
        className="relative w-full h-full min-h-[400px] overflow-hidden bg-muted/20 rounded-lg"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Navigation Controls */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={zoomIn}
            className="w-8 h-8 p-0"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={zoomOut}
            className="w-8 h-8 p-0"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={resetView}
            className="w-8 h-8 p-0"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        {/* Zoom Level Indicator */}
        <div className="absolute bottom-4 left-4 z-20 bg-background/80 px-2 py-1 rounded text-xs">
          {Math.round(viewport.scale * 100)}%
        </div>

        <svg 
          ref={svgRef}
          width="100%" 
          height="100%" 
          viewBox={`0 0 ${containerWidth} ${containerHeight}`}
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
          onWheel={handleWheel}
          style={{
            transform: `translate(${viewport.translateX}px, ${viewport.translateY}px) scale(${viewport.scale})`,
            transformOrigin: '0 0'
          }}
        >
          {/* Connection Lines */}
          {data.edges.map((edge) => {
            const sourcePos = nodePositions.find(p => p.id === edge.source)
            const targetPos = nodePositions.find(p => p.id === edge.target)
            
            if (!sourcePos || !targetPos) return null
            
            return (
              <line
                key={edge.id}
                x1={sourcePos.x}
                y1={sourcePos.y}
                x2={targetPos.x}
                y2={targetPos.y}
                stroke="#6b7280"
                strokeWidth="2"
                strokeDasharray="4,4"
                className="pointer-events-none"
              />
            )
          })}

          {/* Nodes */}
          {data.nodes.map((node) => {
            const position = nodePositions.find(p => p.id === node.id)
            if (!position) return null
            
            const isCenter = nodePositions.indexOf(position) === 0
            const isDragged = draggedNode === node.id
            
            // Calculate text dimensions and node size
            const fontSize = 11
            const lineHeight = fontSize * 1.2
            const maxWidth = isCenter ? 120 : 100
            const padding = 8
            
            // Split text into lines
            const words = node.label.split(' ')
            const lines: string[] = []
            let currentLine = ''
            
            words.forEach(word => {
              const testLine = currentLine ? `${currentLine} ${word}` : word
              if (testLine.length * (fontSize * 0.6) <= maxWidth - padding * 2) {
                currentLine = testLine
              } else {
                if (currentLine) lines.push(currentLine)
                currentLine = word
              }
            })
            if (currentLine) lines.push(currentLine)
            
            // Calculate node dimensions
            const textHeight = lines.length * lineHeight
            const nodeHeight = textHeight + padding * 2
            const nodeWidth = Math.max(
              ...lines.map(line => line.length * (fontSize * 0.6)),
              maxWidth - padding * 2
            ) + padding * 2
            
            return (
              <g key={node.id}>
                {/* Node rounded rectangle */}
                <rect
                  x={position.x - nodeWidth / 2}
                  y={position.y - nodeHeight / 2}
                  width={nodeWidth}
                  height={nodeHeight}
                  rx="8"
                  ry="8"
                  fill={isCenter ? "#3b82f6" : "#f3f4f6"}
                  stroke={isDragged ? "#f59e0b" : "#d1d5db"}
                  strokeWidth="2"
                  className="mind-map-node cursor-move hover:opacity-80 transition-opacity"
                  data-node-id={node.id}
                />
                
                {/* Node label - multiple lines */}
                {lines.map((line, index) => (
                  <text
                    key={index}
                    x={position.x}
                    y={position.y - (textHeight / 2) + (index * lineHeight) + (lineHeight / 2)}
                    textAnchor="middle"
                    fill={isCenter ? "#ffffff" : "#374151"}
                    fontSize={fontSize}
                    fontWeight="500"
                    className="pointer-events-none select-none"
                  >
                    {line}
                  </text>
                ))}
              </g>
            )
          })}
        </svg>

        {/* Instructions */}
        <div className="absolute top-4 left-4 z-20 bg-background/80 px-3 py-2 rounded text-xs text-muted-foreground">
          <div>🖱️ Drag to pan • 🔍 Scroll to zoom • 🎯 Drag nodes to move</div>
        </div>
      </div>
    )
  }

  const getDisplayContent = () => {
    if (isLoadingSessionContent && !mindMapData && sessionMindMaps.length === 0) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading mind map...</span>
          </div>
        </div>
      )
    }

    if (isGeneratingAutomatic) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Generating mind map...</span>
          </div>
        </div>
      )
    }

    if (selectedSessionId && sessionMindMaps.length > 0) {
      // Display the most recent mind map from session
      const lastMindMap = sessionMindMaps[sessionMindMaps.length - 1]
      return (
        <div className="flex-1 overflow-hidden px-4 pb-4 min-h-0">
          <Card className="border-l-4 border-l-primary h-full">
            <CardContent className="p-4 h-full">
              {renderMindMap(lastMindMap)}
              <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-md mt-3">
                <span>Nodes: {lastMindMap.nodes.length} • Edges: {lastMindMap.edges.length}</span>
                <span>{lastMindMap.timestamp ? new Date(lastMindMap.timestamp).toLocaleTimeString() : 'Unknown time'}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    if (mindMapData) {
      // Display current mind map
      return (
        <div className="flex-1 overflow-hidden px-4 pb-4 space-y-2 min-h-0">
          <div className="flex-1 min-h-0">
            {renderMindMap(mindMapData)}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
            <span>Nodes: {mindMapData.nodes.length} • Edges: {mindMapData.edges.length}</span>
            <span>{mindMapData.timestamp ? new Date(mindMapData.timestamp).toLocaleTimeString() : 'Unknown time'}</span>
          </div>
        </div>
      )
    }

    // Default empty state
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Network className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            {selectedSessionId ? 'No mind map found for this session' : 'No mind map yet'}
          </p>
          <p className="text-xs text-muted-foreground">
            {selectedSessionId ? 'This session has no mind map data' : 'Start recording to generate concept relationships'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between p-4 pb-2">
        <h3 className="text-lg font-semibold">{getPanelTitle()}</h3>
        <div className="flex items-center gap-2">
          {selectedSessionId && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onGenerateRandomMindMap}
              disabled={isGeneratingRandom}
            >
              {isGeneratingRandom ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Random'
              )}
            </Button>
          )}
          {(mindMapData || (selectedSessionId && sessionMindMaps.length > 0)) && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={clearMindMap}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="px-4 pb-2">
          <Card className="border-destructive">
            <CardContent className="p-3">
              <div className="flex items-center space-x-2">
                <Badge variant="destructive">Error</Badge>
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {getDisplayContent()}
    </div>
  )
}
