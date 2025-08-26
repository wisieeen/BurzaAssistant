import React, { createContext, useContext, useState, ReactNode } from 'react'

export interface PanelData {
  id: string
  type: 'input' | 'output' | 'control' | 'settings' | 'llm_summary' | 'mind_map'
  title: string
  gridPosition: { row: number; col: number }
}

interface PanelLayoutContextType {
  panels: PanelData[]
  expandedPanelId: string | null
  movePanel: (fromIndex: number, toIndex: number) => void
  getPanelAtPosition: (row: number, col: number) => PanelData | undefined
  expandPanel: (panelId: string) => void
  collapsePanel: () => void
}

const PanelLayoutContext = createContext<PanelLayoutContextType | undefined>(undefined)

// Initial panel layout (2x2 grid)
const initialPanels: PanelData[] = [
  {
    id: 'mind-map-panel',
    type: 'mind_map',
    title: 'Mind Map',
    gridPosition: { row: 0, col: 0 }
  },
  {
    id: 'transcription-panel',
    type: 'output',
    title: 'Transcription',
    gridPosition: { row: 0, col: 1 }
  },
  {
    id: 'llm-summary-panel',
    type: 'llm_summary',
    title: 'Session Analysis',
    gridPosition: { row: 1, col: 0 }
  },
  {
    id: 'settings-panel',
    type: 'settings',
    title: 'Settings',
    gridPosition: { row: 1, col: 1 }
  }
]

export function PanelLayoutProvider({ children }: { children: ReactNode }) {
  const [panels, setPanels] = useState<PanelData[]>(initialPanels)
  const [expandedPanelId, setExpandedPanelId] = useState<string | null>(null)

  const movePanel = (fromIndex: number, toIndex: number) => {
    setPanels(prevPanels => {
      const newPanels = [...prevPanels]
      const [movedPanel] = newPanels.splice(fromIndex, 1)
      newPanels.splice(toIndex, 0, movedPanel)
      
      // Update grid positions based on new order
      return newPanels.map((panel, index) => ({
        ...panel,
        gridPosition: {
          row: Math.floor(index / 2),
          col: index % 2
        }
      }))
    })
  }

  const getPanelAtPosition = (row: number, col: number) => {
    return panels.find(panel => 
      panel.gridPosition.row === row && panel.gridPosition.col === col
    )
  }

  const expandPanel = (panelId: string) => {
    setExpandedPanelId(panelId)
  }

  const collapsePanel = () => {
    setExpandedPanelId(null)
  }

  return (
    <PanelLayoutContext.Provider value={{ 
      panels, 
      expandedPanelId, 
      movePanel, 
      getPanelAtPosition, 
      expandPanel, 
      collapsePanel 
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
