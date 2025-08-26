import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface AudioProcessingStats {
  chunksCollected: number
  chunksNeeded: number
  audioDuration: number
  targetDuration: number
  status: 'idle' | 'collecting' | 'transcribing' | 'processing'
  model?: string
  language?: string
}

interface AudioProcessingPanelProps {
  sessionId?: string
}

export function AudioProcessingPanel({ sessionId }: AudioProcessingPanelProps) {
  const [stats, setStats] = useState<AudioProcessingStats>({
    chunksCollected: 0,
    chunksNeeded: 40,
    audioDuration: 0,
    targetDuration: 20,
    status: 'idle'
  })

  const [settings, setSettings] = useState({
    voiceChunkLength: 500,
    voiceChunksNumber: 40
  })

  useEffect(() => {
    // Load settings from backend
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/settings/')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setSettings({
            voiceChunkLength: data.settings.voice_chunk_length,
            voiceChunksNumber: data.settings.voice_chunks_number
          })
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  const getProgressPercentage = () => {
    if (stats.chunksNeeded === 0) return 0
    return Math.min((stats.chunksCollected / stats.chunksNeeded) * 100, 100)
  }

  const getStatusColor = () => {
    switch (stats.status) {
      case 'collecting':
        return 'bg-blue-500'
      case 'transcribing':
        return 'bg-yellow-500'
      case 'processing':
        return 'bg-green-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusText = () => {
    switch (stats.status) {
      case 'collecting':
        return 'Collecting Audio'
      case 'transcribing':
        return 'Transcribing'
      case 'processing':
        return 'Processing'
      default:
        return 'Idle'
    }
  }

  return (
    <div className="p-4 h-full flex flex-col space-y-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Audio Processing</h2>
        <Badge className={getStatusColor()}>
          {getStatusText()}
        </Badge>
      </div>

      {/* Real-time Processing Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Processing Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Audio Collection Progress</span>
              <span>{Math.round(getProgressPercentage())}%</span>
            </div>
            <Progress value={getProgressPercentage()} className="w-full" />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats.chunksCollected}
              </div>
              <div className="text-xs text-muted-foreground">
                Chunks Collected
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats.chunksNeeded}
              </div>
              <div className="text-xs text-muted-foreground">
                Chunks Needed
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {stats.audioDuration.toFixed(1)}s
              </div>
              <div className="text-xs text-muted-foreground">
                Audio Duration
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {stats.targetDuration.toFixed(1)}s
              </div>
              <div className="text-xs text-muted-foreground">
                Target Duration
              </div>
            </div>
          </div>

          {/* Model Info */}
          {stats.model && (
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-sm font-medium">Current Model</div>
              <div className="text-xs text-muted-foreground">
                {stats.model} • {stats.language || 'Auto-detect'}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium">Chunk Length</div>
              <div className="text-xs text-muted-foreground">
                {settings.voiceChunkLength}ms
              </div>
            </div>
            <div>
              <div className="text-sm font-medium">Chunks Before Processing</div>
              <div className="text-xs text-muted-foreground">
                {settings.voiceChunksNumber} chunks
              </div>
            </div>
          </div>
          
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-sm font-medium text-blue-800">
              Expected Processing Time
            </div>
            <div className="text-xs text-blue-600">
              {(settings.voiceChunkLength * settings.voiceChunksNumber / 1000).toFixed(1)}s of audio per batch
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-xs text-muted-foreground">
            <strong>Faster Processing:</strong> Use shorter chunk lengths and fewer chunks
          </div>
          <div className="text-xs text-muted-foreground">
            <strong>Better Accuracy:</strong> Use longer chunk lengths and more chunks
          </div>
          <div className="text-xs text-muted-foreground">
            <strong>Balanced:</strong> 500ms chunks with 20-40 chunks is recommended
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
