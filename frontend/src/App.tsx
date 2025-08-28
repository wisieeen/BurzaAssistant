import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/Sidebar/Sidebar'
import { WorkingArea } from '@/components/layout/WorkingArea/WorkingArea'
import { Button } from '@/components/ui/button'
import { Play, Pause, Square, Circle, Wifi, Settings } from 'lucide-react'
import { AudioCaptureService, AudioLevelData } from '@/services/audioCaptureService'

function App() {
  const [isListening, setIsListening] = useState(false)
  const [isConnected, setIsConnected] = useState(true)
  const [isAudioInitialized, setIsAudioInitialized] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)

  // Initialize audio capture
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        const success = await AudioCaptureService.initialize({
          sampleRate: 16000,
          channels: 1,
          chunkDuration: 500,
          chunksToAccumulate: 10,
          audioLevelThreshold: 10
        })
        
        if (success) {
          setIsAudioInitialized(true)
          console.log('Audio capture initialized successfully')
        } else {
          console.error('Failed to initialize audio capture')
        }
      } catch (error) {
        console.error('Error initializing audio capture:', error)
      }
    }

    initializeAudio()

    return () => {
      AudioCaptureService.cleanup()
    }
  }, [])

  // Register for audio level updates
  useEffect(() => {
    const unregisterAudioLevel = AudioCaptureService.onAudioLevelChange((data: AudioLevelData) => {
      setAudioLevel(data.level)
    })

    return () => {
      unregisterAudioLevel()
    }
  }, [])

  const handleStartListening = async () => {
    if (isListening || !isAudioInitialized) return
    
    setIsProcessing(true)
    try {
      const success = await AudioCaptureService.startRecording()
      if (success) {
        setIsListening(true)
        console.log('Started audio recording and streaming')
      } else {
        console.error('Failed to start audio recording')
      }
    } catch (error) {
      console.error('Error starting audio recording:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleStopListening = async () => {
    if (!isListening) return
    
    setIsProcessing(true)
    try {
      const success = await AudioCaptureService.stopRecording()
      if (success) {
        setIsListening(false)
        console.log('Stopped audio recording')
      } else {
        console.error('Failed to stop audio recording')
      }
    } catch (error) {
      console.error('Error stopping audio recording:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="h-screen bg-background flex">
      {/* Sidebar */}
      <div className="flex-shrink-0">
        <Sidebar 
          isListening={isListening}
          isConnected={isConnected}
          isProcessing={isProcessing}
          audioLevel={audioLevel}
          isAudioInitialized={isAudioInitialized}
          onStartListening={handleStartListening}
          onStopListening={handleStopListening}
        />
      </div>
      
      {/* Main Working Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Top Bar */}
        <div className="h-16 border-b bg-card flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-foreground">
              Panel-Based Application
            </h1>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-muted-foreground">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
        
        {/* Working Area */}
        <WorkingArea 
          isListening={isListening}
          onStartListening={handleStartListening}
          onStopListening={handleStopListening}
        />
      </div>
    </div>
  )
}

export default App

