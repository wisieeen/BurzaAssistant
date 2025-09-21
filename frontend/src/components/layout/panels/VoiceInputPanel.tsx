import { Mic, MicOff, Volume2, Upload, FileAudio } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState, useRef, useCallback } from 'react'
import { FileUploadService, FileUploadResult } from '@/services/fileUploadService'
import { TranscriptionResult } from '@/services/websocketService'

interface VoiceInputPanelProps {
  isListening: boolean
  isProcessing: boolean
  audioLevel: number
  isAudioInitialized: boolean
  onStartListening: () => void
  onStopListening: () => void
  onTranscriptionReceived?: (transcription: TranscriptionResult) => void
  sessionId?: string
}

export function VoiceInputPanel({ 
  isListening, 
  isProcessing,
  audioLevel,
  isAudioInitialized,
  onStartListening, 
  onStopListening,
  onTranscriptionReceived,
  sessionId
}: VoiceInputPanelProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    setUploadError(null)

    const files = Array.from(e.dataTransfer.files)
    const audioFile = files.find(file => FileUploadService.isValidAudioFile(file))

    if (!audioFile) {
      setUploadError('Please drop a valid audio file (mp3, wav, m4a, ogg, etc.)')
      return
    }

    await handleFileUpload(audioFile)
  }, [sessionId, onTranscriptionReceived])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadError(null)
      await handleFileUpload(file)
    }
  }, [sessionId, onTranscriptionReceived])

  const handleFileUpload = async (file: File) => {
    setIsUploading(true)
    setUploadError(null)

    try {
      const result = await FileUploadService.uploadAudioFile(file, sessionId)
      
      if (result.success && result.result) {
        // Notify parent component of transcription result
        if (onTranscriptionReceived) {
          onTranscriptionReceived(result.result)
        }
        console.log('File transcription completed:', result.result)
      } else {
        setUploadError(result.error || 'Transcription failed')
      }
    } catch (error) {
      console.error('File upload error:', error)
      setUploadError(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }
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

        {/* Divider */}
        <div className="flex items-center w-full max-w-xs">
          <div className="flex-1 border-t border-muted"></div>
          <span className="px-3 text-xs text-muted-foreground">OR</span>
          <div className="flex-1 border-t border-muted"></div>
        </div>

        {/* File Drop Zone */}
        <div 
          className={`w-full max-w-xs border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
            isDragOver 
              ? 'border-primary bg-primary/5' 
              : 'border-muted hover:border-muted-foreground/50'
          } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={openFileDialog}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <div className="flex flex-col items-center space-y-2">
            {isUploading ? (
              <>
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-muted-foreground">Processing audio...</p>
              </>
            ) : (
              <>
                <FileAudio className="w-8 h-8 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    Drop audio file here
                  </p>
                  <p className="text-xs text-muted-foreground">
                    or click to browse
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Supports: MP3, WAV, M4A, OGG, WebM, FLAC
                </p>
              </>
            )}
          </div>
        </div>

        {/* Upload Error */}
        {uploadError && (
          <div className="w-full max-w-xs p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{uploadError}</p>
          </div>
        )}
        
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
