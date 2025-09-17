import { createContext, useContext, useState, ReactNode } from 'react'

export interface PanelData {
  id: string
  type: 'input' | 'output' | 'control' | 'settings' | 'llm_summary' | 'mind_map'
  title: string
  gridPosition: { row: number; col: number }
  isSelected: boolean
}

export type LayoutType = '2x2' | '1x2' | '1x3' | '1x4' | 'custom'

export interface LayoutConfig {
  type: LayoutType
  rows: number
  cols: number
  gridTemplate: string
  panelSizes: { [key: string]: { rowSpan?: number; colSpan?: number } }
}

interface PanelLayoutContextType {
  panels: PanelData[]
  availablePanels: PanelData[]
  selectedPanelIds: string[]
  currentLayout: LayoutConfig
  expandedPanelId: string | null
  movePanel: (fromIndex: number, toIndex: number) => void
  getPanelAtPosition: (row: number, col: number) => PanelData | undefined
  expandPanel: (panelId: string) => void
  collapsePanel: () => void
  selectPanel: (panelId: string) => void
  deselectPanel: (panelId: string) => void
  changeLayout: (layoutType: LayoutType) => void
  updatePanelOrder: (panelIds: string[]) => void
}

const PanelLayoutContext = createContext<PanelLayoutContextType | undefined>(undefined)

// All available panels
const allAvailablePanels: PanelData[] = [
  {
    id: 'mind-map-panel',
    type: 'mind_map',
    title: 'Mind Map',
    gridPosition: { row: 0, col: 0 },
    isSelected: true
  },
  {
    id: 'transcription-panel',
    type: 'output',
    title: 'Transcription',
    gridPosition: { row: 0, col: 1 },
    isSelected: true
  },
  {
    id: 'llm-summary-panel',
    type: 'llm_summary',
    title: 'Session Analysis',
    gridPosition: { row: 1, col: 0 },
    isSelected: true
  },
  {
    id: 'settings-panel',
    type: 'settings',
    title: 'Settings',
    gridPosition: { row: 1, col: 1 },
    isSelected: true
  },
  {
    id: 'voice-input-panel',
    type: 'input',
    title: 'Voice Input',
    gridPosition: { row: 0, col: 0 },
    isSelected: false
  }
]

// Layout configurations
const layoutConfigs: Record<LayoutType, LayoutConfig> = {
  '2x2': {
    type: '2x2',
    rows: 2,
    cols: 2,
    gridTemplate: 'grid-cols-2 grid-rows-2',
    panelSizes: {}
  },
  '1x2': {
    type: '1x2',
    rows: 1,
    cols: 2,
    gridTemplate: 'grid-cols-2 grid-rows-1',
    panelSizes: {}
  },
  '1x3': {
    type: '1x3',
    rows: 1,
    cols: 3,
    gridTemplate: 'grid-cols-3 grid-rows-1',
    panelSizes: {}
  },
  '1x4': {
    type: '1x4',
    rows: 1,
    cols: 4,
    gridTemplate: 'grid-cols-4 grid-rows-1',
    panelSizes: {}
  },
  'custom': {
    type: 'custom',
    rows: 2,
    cols: 3,
    gridTemplate: 'grid-cols-3 grid-rows-2',
    panelSizes: {
      'mind-map-panel': { rowSpan: 2, colSpan: 2 },
      'transcription-panel': { rowSpan: 1, colSpan: 1 },
      'llm-summary-panel': { rowSpan: 1, colSpan: 1 }
    }
  }
}

export function PanelLayoutProvider({ children }: { children: ReactNode }) {
  const [availablePanels] = useState<PanelData[]>(allAvailablePanels)
  const [selectedPanelIds, setSelectedPanelIds] = useState<string[]>(['mind-map-panel', 'transcription-panel', 'llm-summary-panel', 'settings-panel'])
  const [currentLayout, setCurrentLayout] = useState<LayoutConfig>(layoutConfigs['2x2'])
  const [expandedPanelId, setExpandedPanelId] = useState<string | null>(null)

  // Get currently selected panels in order
  const panels = selectedPanelIds
    .map(id => availablePanels.find(p => p.id === id))
    .filter(Boolean) as PanelData[]

  // Update grid positions based on current layout
  const updateGridPositions = (layout: LayoutConfig, panelIds: string[]) => {
    const positions: { [key: string]: { row: number; col: number } } = {}
    let currentRow = 0
    let currentCol = 0

    panelIds.forEach(panelId => {
      const panel = availablePanels.find(p => p.id === panelId)
      if (!panel) return

      const panelSize = layout.panelSizes[panelId] || {}
      const colSpan = panelSize.colSpan || 1

      // Check if we need to move to next row
      if (currentCol + colSpan > layout.cols) {
        currentRow += 1
        currentCol = 0
      }

      positions[panelId] = { row: currentRow, col: currentCol }
      currentCol += colSpan
    })

    return positions
  }

  const movePanel = (fromIndex: number, toIndex: number) => {
    setSelectedPanelIds(prev => {
      const newOrder = [...prev]
      const [movedPanel] = newOrder.splice(fromIndex, 1)
      newOrder.splice(toIndex, 0, movedPanel)
      return newOrder
    })
  }

  const getPanelAtPosition = (row: number, col: number) => {
    const positions = updateGridPositions(currentLayout, selectedPanelIds)
    return panels.find(panel => {
      const pos = positions[panel.id]
      return pos && pos.row === row && pos.col === col
    })
  }

  const expandPanel = (panelId: string) => {
    setExpandedPanelId(panelId)
  }

  const collapsePanel = () => {
    setExpandedPanelId(null)
  }

  const selectPanel = (panelId: string) => {
    setSelectedPanelIds(prev => {
      if (prev.includes(panelId)) return prev
      return [...prev, panelId]
    })
  }

  const deselectPanel = (panelId: string) => {
    setSelectedPanelIds(prev => prev.filter(id => id !== panelId))
  }

  const changeLayout = (layoutType: LayoutType) => {
    const newLayout = layoutConfigs[layoutType]
    setCurrentLayout(newLayout)
  }

  const updatePanelOrder = (panelIds: string[]) => {
    setSelectedPanelIds(panelIds)
  }

  return (
    <PanelLayoutContext.Provider value={{ 
      panels, 
      availablePanels,
      selectedPanelIds,
      currentLayout, 
      expandedPanelId, 
      movePanel, 
      getPanelAtPosition, 
      expandPanel, 
      collapsePanel,
      selectPanel,
      deselectPanel,
      changeLayout,
      updatePanelOrder
    }}>
      {children}
    </PanelLayoutContext.Provider>
  )
}

export function usePanelLayout() {
  const context = useContext(PanelLayoutContext)
  if (context === undefined) {
    throw new Error('usePanelLayout must be used within a PanelLayoutProvider')
  }
  return context
}
