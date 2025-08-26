import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Toggle } from '@/components/ui/toggle'
import { Switch } from '@/components/ui/switch'
import { 
  Play, 
  Pause, 
  Square, 
  Circle, 
  Wifi, 
  WifiOff,
  PanelLeft,
  Settings,
  Eye,
  EyeOff,
  Mic,
  MicOff,
  Volume2
} from 'lucide-react'

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
  return (
    <div className="w-80 bg-card border-r flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b">
        <h2 className="text-lg font-semibold text-foreground mb-2">Controls</h2>
        <p className="text-sm text-muted-foreground">Application control panel</p>
      </div>

      {/* Control Buttons */}
      <div className="p-6 space-y-4">
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
      </div>

      {/* Footer */}
      <div className="p-6 border-t">
        <Button variant="outline" size="sm" className="w-full">
          <Settings className="w-4 h-4 mr-2" />
          Advanced Settings
        </Button>
      </div>
    </div>
  )
}
