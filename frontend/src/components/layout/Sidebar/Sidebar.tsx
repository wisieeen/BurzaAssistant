import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Play, 
  Pause, 
  Square, 
  Wifi, 
  WifiOff,
  Settings,
  Volume2,
  Grid,
  Layout,
  CheckSquare,
  Square as SquareIcon
} from 'lucide-react'
import { usePanelLayout, LayoutType } from '@/contexts/PanelLayoutContext'

interface SidebarProps {
  isListening: boolean
  isConnected: boolean
  isProcessing: boolean
  audioLevel: number
  isAudioInitialized: boolean
  onStartListening: () => void
  onStopListening: () => void
}

export function Sidebar({
  isListening,
  isConnected,
  isProcessing,
  audioLevel,
  isAudioInitialized,
  onStartListening,
  onStopListening
}: SidebarProps) {
  const { 
    availablePanels, 
    selectedPanelIds, 
    currentLayout,
    selectPanel, 
    deselectPanel, 
    changeLayout,
    updatePanelOrder 
  } = usePanelLayout()

  const layoutOptions: { type: LayoutType; label: string; icon: React.ReactNode }[] = [
    { type: '2x2', label: '2x2 Grid', icon: <Grid className="w-4 h-4" /> },
    { type: '1x2', label: '1x2 Row', icon: <Layout className="w-4 h-4" /> },
    { type: '1x3', label: '1x3 Row', icon: <Layout className="w-4 h-4" /> },
    { type: '1x4', label: '1x4 Row', icon: <Layout className="w-4 h-4" /> },
    { type: 'custom', label: 'Custom', icon: <Grid className="w-4 h-4" /> }
  ]

  const handlePanelToggle = (panelId: string) => {
    if (selectedPanelIds.includes(panelId)) {
      deselectPanel(panelId)
    } else {
      selectPanel(panelId)
    }
  }

  const movePanelUp = (index: number) => {
    if (index > 0) {
      const newOrder = [...selectedPanelIds]
      const temp = newOrder[index]
      newOrder[index] = newOrder[index - 1]
      newOrder[index - 1] = temp
      updatePanelOrder(newOrder)
    }
  }

  const movePanelDown = (index: number) => {
    if (index < selectedPanelIds.length - 1) {
      const newOrder = [...selectedPanelIds]
      const temp = newOrder[index]
      newOrder[index] = newOrder[index + 1]
      newOrder[index + 1] = temp
      updatePanelOrder(newOrder)
    }
  }

  return (
    <div className="w-80 bg-card border-r flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="p-6 border-b">
        <h2 className="text-lg font-semibold text-foreground mb-2">Controls</h2>
        <p className="text-sm text-muted-foreground">Application control panel</p>
      </div>

      

      {/* Control Buttons */}
      
      <div className="p-6 space-y-4">

        {/* Connection Status */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Connection</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <Wifi className="w-4 h-4 text-green-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-500" />
              )}
              <span className="text-sm text-muted-foreground">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? 'Online' : 'Offline'}
            </Badge>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Listening</h3>
          <div className="flex space-x-2">
            <Button 
              onClick={onStartListening}
              disabled={isListening || isProcessing || !isAudioInitialized}
              variant={isListening ? "default" : "outline"}
              size="sm"
              className="flex-1"
            >
              {isListening ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  <span>{isProcessing ? 'Starting...' : 'Start'}</span>
                </>
              )}
            </Button>
            <Button 
              onClick={onStopListening}
              disabled={!isListening || isProcessing}
              variant="outline" 
              size="sm"
              className="flex-1"
            >
              <Square className="w-4 h-4 mr-2" />
              <span>{isProcessing ? 'Stopping...' : 'Stop'}</span>
            </Button>
          </div>
        </div>

        <Separator />

        {/* Audio Level Indicator */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Audio Level</h3>
          <div className="w-full">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Volume2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Level</span>
              </div>
              <span className="text-xs text-muted-foreground">{Math.round(audioLevel)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-75 ${
                  isListening ? 'bg-primary' : 'bg-muted-foreground'
                }`}
                style={{ width: `${audioLevel}%` }}
              ></div>
            </div>
          </div>
        </div>

        <Separator />

      </div>

      {/* Layout Selection */}
      <div className="p-6 border-b">
        <h3 className="text-sm font-medium text-foreground mb-3">Layout</h3>
        <div className="grid grid-cols-2 gap-2">
          {layoutOptions.map((option) => (
            <Button
              key={option.type}
              variant={currentLayout.type === option.type ? "default" : "outline"}
              size="sm"
              onClick={() => changeLayout(option.type)}
              className="flex flex-col items-center gap-1 h-auto py-2"
            >
              {option.icon}
              <span className="text-xs">{option.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Panel Selection */}
      <div className="p-6 border-b">
        <h3 className="text-sm font-medium text-foreground mb-3">Active Panels</h3>
        <div className="space-y-2">
          {availablePanels.map((panel) => (
            <div key={panel.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePanelToggle(panel.id)}
                  className="flex items-center justify-center w-4 h-4"
                >
                  {selectedPanelIds.includes(panel.id) ? (
                    <CheckSquare className="w-4 h-4 text-primary" />
                  ) : (
                    <SquareIcon className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
                <span className="text-sm text-muted-foreground">{panel.title}</span>
              </div>
              {selectedPanelIds.includes(panel.id) && (
                <div className="flex space-x-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => movePanelUp(selectedPanelIds.indexOf(panel.id))}
                    disabled={selectedPanelIds.indexOf(panel.id) === 0}
                    className="h-6 w-6 p-0"
                  >
                    ↑
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => movePanelDown(selectedPanelIds.indexOf(panel.id))}
                    disabled={selectedPanelIds.indexOf(panel.id) === selectedPanelIds.length - 1}
                    className="h-6 w-6 p-0"
                  >
                    ↓
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>


      {/* Footer */}
      <div className="p-6 border-t mt-auto">
        <Button variant="outline" size="sm" className="w-full">
          <Settings className="w-4 h-4 mr-2" />
          Advanced Settings
        </Button>
      </div>
    </div>
  )
}
