import { Mic, MicOff, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface VoiceInputPanelProps {
  isListening: boolean
  isProcessing: boolean
  audioLevel: number
  isAudioInitialized: boolean
  onStartListening: () => void
  onStopListening: () => void
}

export function VoiceInputPanel({ 
  isListening, 
  isProcessing,
  audioLevel,
  isAudioInitialized,
  onStartListening, 
  onStopListening
}: VoiceInputPanelProps) {
  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center space-y-6">
        {/* Microphone Status */}
        <div className="text-center">
          <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center transition-colors ${
            isListening ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          }`}>
            {isListening ? (
              <Mic className="w-10 h-10 animate-pulse" />
            ) : (
              <Mic className="w-10 h-10" />
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {isListening ? 'Listening for voice input...' : 'Click to start listening'}
          </p>
        </div>
        
        {/* Listening Controls */}
        <div className="flex space-x-3">
          <Button 
            onClick={onStartListening}
            disabled={isListening || isProcessing || !isAudioInitialized}
            variant="default"
            size="lg"
            className="flex-1"
          >
            <Mic className="w-4 h-4" />
            <span>{isProcessing ? 'Starting...' : 'Start'}</span>
          </Button>
          <Button 
            onClick={onStopListening}
            disabled={!isListening || isProcessing}
            variant="secondary"
            size="lg"
            className="flex-1"
          >
            <MicOff className="w-4 h-4" />
            <span>{isProcessing ? 'Stopping...' : 'Stop'}</span>
          </Button>
        </div>
        
        {/* Audio Level Indicator */}
        <div className="w-full max-w-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Volume2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Audio Level</span>
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
    </div>
  )
}
