# Mind Map Panel

## Overview

The Mind Map Panel displays concept relationships from transcribed text in an interactive visual graph format. It receives JSON data from the Ollama LLM and renders nodes (concepts) connected by edges (relationships) using a force-directed layout algorithm with zoom, pan, and drag capabilities.

## Current Features

### 1. **Interactive Visual Mind Map**
- **Force-directed Layout**: Automatic node positioning using physics simulation
- **Interactive Nodes**: Drag nodes to reposition them manually
- **Zoom and Pan**: Mouse wheel zoom and drag pan functionality
- **Navigation Controls**: Zoom in/out and reset view buttons
- **Responsive Design**: Adapts to different panel sizes and orientations

### 2. **Session Integration**
- **Session Selection**: Shows mind maps for selected sessions
- **Session History**: Displays the most recent mind map for the selected session
- **Session Switching**: Automatically updates when switching between sessions
- **Session Content Loading**: Loads historical mind maps from backend API

### 3. **Advanced Layout Algorithm**
- **Force-directed Simulation**: Uses attractive and repulsive forces for optimal positioning
- **Component Separation**: Disconnected components are positioned separately
- **Dynamic Sizing**: Container adapts to content bounds
- **Smooth Animations**: Fluid transitions and interactions

### 4. **Rich User Interface**
- **Visual Controls**: Zoom, pan, and reset buttons
- **Status Indicators**: Zoom level display and node/edge counts
- **Loading States**: Clear feedback during content loading
- **Error Handling**: Graceful error display with user-friendly messages

## Technical Implementation

### 1. **Force-directed Layout Algorithm**
```typescript
class ForceDirectedLayout {
  private nodes: NodePosition[]
  private edges: MindMapEdge[]
  
  // Calculate attractive forces between connected nodes
  private attractiveForce(edge: MindMapEdge, strength: number = 0.1)
  
  // Calculate repulsive forces between all nodes
  private repulsiveForce(strength: number = 800)
  
  // Apply velocity to positions with damping
  private applyVelocity(damping: number = 0.9)
  
  // Keep nodes within bounds
  private applyBounds()
  
  // Find and position connected components
  private findConnectedComponents(): string[][]
  private positionComponents(components: string[][])
  
  // Run the complete layout algorithm
  public run(iterations: number = 100)
}
```

### 2. **Interactive Features**
```typescript
// Mouse wheel zoom
const handleWheel = useCallback((e: React.WheelEvent) => {
  e.preventDefault()
  const delta = e.deltaY > 0 ? 0.9 : 1.1
  const newScale = Math.max(0.1, Math.min(3, viewport.scale * delta))
  // Zoom towards mouse position
}, [viewport])

// Node dragging
const handleMouseDown = useCallback((e: React.MouseEvent) => {
  const target = e.target as HTMLElement
  if (target.closest('.mind-map-node')) {
    const nodeId = target.closest('.mind-map-node')?.getAttribute('data-node-id')
    if (nodeId) {
      setDraggedNode(nodeId)
      setIsDragging(true)
    }
  }
}, [viewport])
```

### 3. **Session Integration**
```typescript
// Load session mind maps when session is selected
const loadSessionContent = async (sessionId: string) => {
  const mindMapResponse = await fetch(`/api/sessions/${sessionId}/mind-maps`)
  if (mindMapResponse.ok) {
    const mindMapData = await mindMapResponse.json()
    if (mindMapData.success) {
      const mindMaps = mindMapData.mind_maps.map((mindMap: any) => ({
        nodes: mindMap.nodes || [],
        edges: mindMap.edges || [],
        session_id: sessionId,
        timestamp: mindMap.created_at
      }))
      setSessionMindMaps(mindMaps)
    }
  }
}
```

## Data Structures

### MindMapData Interface
```typescript
interface MindMapData {
  nodes: MindMapNode[]
  edges: MindMapEdge[]
  session_id?: string
  timestamp?: string
}

interface MindMapNode {
  id: string
  label: string
  type?: string
  position?: { x: number; y: number }
}

interface MindMapEdge {
  id: string
  source: string
  target: string
  label?: string
  type?: string
}
```

### MindMapPanel Props
```typescript
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
```

## Backend Integration

The panel expects the backend to:
1. Process transcribed text through Ollama LLM with mind map prompt
2. Generate mind map JSON structure with nodes and edges
3. Send results via WebSocket with type `mind_map_result`
4. Provide API endpoint `/api/sessions/{sessionId}/mind-maps` for session data
5. Support random mind map generation with `?use_random_seed=true` parameter

### API Endpoints

#### Session Mind Maps
```
GET /api/sessions/{sessionId}/mind-maps
```
Returns historical mind maps for a specific session.

#### Generate Random Mind Map
```
POST /api/sessions/{sessionId}/mind-maps?use_random_seed=true
```
Generates a new mind map using random seed for the specified session.

#### WebSocket Messages
```json
{
  "type": "mind_map_result",
  "data": {
    "nodes": [
      {
        "id": "concept_1",
        "label": "Main Topic",
        "type": "topic"
      }
    ],
    "edges": [
      {
        "id": "edge_1",
        "source": "concept_1",
        "target": "concept_2",
        "label": "relates to",
        "type": "relationship"
      }
    ],
    "session_id": "session-123"
  },
  "timestamp": "2024-01-01T12:00:00Z",
  "sessionId": "session-123"
}
```

## Interactive Features

### 1. **Zoom Controls**
- **Mouse Wheel**: Scroll to zoom in/out
- **Zoom Buttons**: Click to zoom in/out by 20%
- **Reset View**: Return to fit-all-nodes view
- **Zoom Level Display**: Shows current zoom percentage

### 2. **Pan Controls**
- **Drag Background**: Click and drag empty space to pan
- **Smooth Panning**: Fluid movement with proper bounds checking
- **Pan Limits**: Prevents panning beyond reasonable bounds

### 3. **Node Interaction**
- **Node Dragging**: Click and drag nodes to reposition
- **Visual Feedback**: Nodes highlight when dragged
- **Position Persistence**: Node positions maintained during interactions

### 4. **Viewport Management**
- **Dynamic Sizing**: Container adapts to content bounds
- **Responsive Layout**: Works in both normal and expanded modes
- **Bounds Calculation**: Automatic viewport adjustment to fit content

## Usage Scenarios

### 1. **Current Session Mind Map**
- User starts recording
- LLM processes transcripts and generates mind map
- Interactive mind map appears in panel
- User can explore relationships and concepts

### 2. **Session Selection**
- User selects a session from SettingsPanel
- Panel loads historical mind maps from backend
- Displays most recent mind map for selected session
- User can generate random mind maps for the session

### 3. **Interactive Exploration**
- User zooms in to examine specific concepts
- User drags nodes to reorganize the layout
- User pans around to explore different areas
- User resets view to see the full mind map

### 4. **Random Generation**
- User clicks "Generate Random" button
- Backend generates new mind map with random seed
- Panel updates with new visualization
- User can compare different mind map variations

## Benefits

### ✅ **Interactive Visualization**
- Engaging user experience
- Intuitive concept exploration
- Flexible layout customization
- Smooth performance

### ✅ **Session Context**
- Historical mind maps accessible
- Session-specific concept relationships
- Seamless session switching
- Persistent mind map data

### ✅ **Advanced Layout**
- Automatic optimal positioning
- Physics-based simulation
- Component separation
- Dynamic sizing

### ✅ **User Control**
- Manual node positioning
- Zoom and pan capabilities
- View reset functionality
- Random generation options

## Future Enhancements

### 1. **Enhanced Interactivity**
- Node selection and highlighting
- Edge labels and styling
- Node clustering and grouping
- Search and filter functionality

### 2. **Layout Improvements**
- Different layout algorithms
- Hierarchical tree layout
- Circular layout options
- Custom layout templates

### 3. **Visual Enhancements**
- Node icons and images
- Color coding by concept type
- Animation effects
- Export to image/PDF

### 4. **Advanced Features**
- Mind map templates
- Collaborative editing
- Version history
- Mind map comparison

## Status

✅ **COMPLETE** - The Mind Map Panel is fully implemented with interactive features, force-directed layout, session support, and comprehensive user controls. The implementation provides an engaging and intuitive way to explore concept relationships from transcribed content.
