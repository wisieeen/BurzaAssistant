import { Button } from '@/components/ui/button'
import { Copy, Download, Trash2, Loader2 } from 'lucide-react'
import { TranscriptionResult } from '@/lib/websocketService'

interface TranscriptionPanelProps {
  liveTranscription?: string
  transcriptionHistory?: TranscriptionResult[]
  onClearHistory?: () => void
  selectedSessionId?: string | null
  isLoadingSessionContent?: boolean
}

export function TranscriptionPanel({ 
  liveTranscription = '', 
  transcriptionHistory = [], 
  onClearHistory,
  selectedSessionId = null,
  isLoadingSessionContent = false
}: TranscriptionPanelProps) {
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const downloadTranscription = (transcription: TranscriptionResult) => {
    const content = `Transcription: ${transcription.text}\nLanguage: ${transcription.language}\nModel: ${transcription.model}\nTimestamp: ${transcription.timestamp}`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transcription_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleClearHistory = () => {
    onClearHistory?.()
  }

  const getDisplayText = () => {
    if (selectedSessionId) {
      return `Session: ${selectedSessionId.slice(-8)}`
    }
    return 'Start speaking to see transcription here...'
  }

  const getHistoryTitle = () => {
    if (selectedSessionId) {
      return `Session History (${selectedSessionId.slice(-8)})`
    }
    return 'History'
  }

  return (
    <div className="p-4 h-full flex flex-col">
      {/* Live Transcription */}
      <div className="mb-4">
        <div className="p-3 bg-muted rounded-md min-h-[80px] flex items-center justify-center">
          {isLoadingSessionContent ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-muted-foreground">Loading session content...</span>
            </div>
          ) : liveTranscription ? (
            <p className="text-foreground text-center">{liveTranscription}</p>
          ) : (
            <p className="text-muted-foreground text-center">{getDisplayText()}</p>
          )}
        </div>
      </div>
      
      {/* Transcription History */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-muted-foreground">{getHistoryTitle()}</h4>
          <div className="flex space-x-2">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(liveTranscription)}
              disabled={!liveTranscription}
            >
              <Copy className="w-3 h-3" />
            </Button>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => downloadTranscription(transcriptionHistory[0])}
              disabled={transcriptionHistory.length === 0}
            >
              <Download className="w-3 h-3" />
            </Button>
            <Button 
              variant="outline"
              size="sm"
              onClick={handleClearHistory}
              disabled={transcriptionHistory.length === 0}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto">
          {isLoadingSessionContent ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Loading session transcriptions...</span>
              </div>
            </div>
          ) : transcriptionHistory.length > 0 ? (
            transcriptionHistory.slice().reverse().map((transcription, index) => (
              <div key={index} className="p-2 bg-background rounded border text-sm">
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 text-muted-foreground text-xs">
                    <div className="whitespace-nowrap">
                      {new Date(transcription.timestamp).toLocaleTimeString()}
                    </div>
                    <div className="whitespace-nowrap">
                      {transcription.language} • {transcription.model}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="break-words">{transcription.text}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-sm text-center py-4">
              {selectedSessionId ? 'No transcriptions found for this session' : 'No transcriptions yet'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
