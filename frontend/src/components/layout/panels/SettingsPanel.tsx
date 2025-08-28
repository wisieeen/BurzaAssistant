import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { AudioCaptureService } from '@/services/audioCaptureService'
import { Input } from '@/components/ui/input'

// Types for settings
interface SessionSettings {
  whisperLanguage: string
  whisperModel: string
  ollamaModel: string
  ollamaTaskPrompt: string
  ollamaMindMapPrompt: string
  voiceChunkLength: number
  voiceChunksNumber: number
  activeSessionId: string | null
}

// Available options
const WHISPER_LANGUAGES = [
  { code: 'auto', name: 'Auto-detect' },
  { code: 'en', name: 'English' },
  { code: 'pl', name: 'Polish' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' }
]

const WHISPER_MODELS = [
  { id: 'tiny', name: 'Tiny (39M)', description: 'Fastest, least accurate' },
  { id: 'base', name: 'Base (74M)', description: 'Good balance of speed and accuracy' },
  { id: 'small', name: 'Small (244M)', description: 'Better accuracy, slower' },
  { id: 'medium', name: 'Medium (769M)', description: 'High accuracy, slower' },
  { id: 'large', name: 'Large (1550M)', description: 'Best accuracy, slowest' }
]

// Fallback models in case backend is unavailable
const FALLBACK_OLLAMA_MODELS = [
  { id: 'artifish/llama3.2-uncensored:latest', name: 'Llama 3.2 Uncensored', description: 'Current default model' },
  { id: 'llama2:latest', name: 'Llama 2', description: 'Meta\'s Llama 2 model' },
  { id: 'mistral:latest', name: 'Mistral', description: 'Mistral AI model' },
  { id: 'codellama:latest', name: 'Code Llama', description: 'Specialized for code' }
]

const VOICE_CHUNK_LENGTHS = [
  { value: 250, label: '0.25 seconds (Very fast, less accurate)' },
  { value: 500, label: '0.5 seconds (Fast, good balance)' },
  { value: 1000, label: '1 second (Balanced, recommended)' },
  { value: 2000, label: '2 seconds (Slower, more accurate)' },
  { value: 5000, label: '5 seconds (Slowest, most accurate)' }
]

const VOICE_CHUNKS_NUMBERS = [
  { value: 10, label: '10 chunks (Very fast - 5s audio)' },
  { value: 20, label: '20 chunks (Fast - 10s audio, recommended)' },
  { value: 40, label: '40 chunks (Balanced - 20s audio)' },
  { value: 60, label: '60 chunks (Slower - 30s audio)' },
  { value: 100, label: '100 chunks (Slowest - 50s audio)' }
]

// Default settings
const DEFAULT_SETTINGS: SessionSettings = {
  whisperLanguage: 'auto',
  whisperModel: 'base',
  ollamaModel: 'artifish/llama3.2-uncensored:latest',
  ollamaTaskPrompt: 'Please analyze the following transcript and provide insights:\n\nTRANSCRIPT:\n{transcript}\n\nPlease provide:\n1. A brief summary of the main topics discussed\n2. Key points or important information mentioned\n3. Any questions, concerns, or action items identified\n4. Overall sentiment or tone of the conversation\n\nPlease be concise but thorough in your analysis.',
  ollamaMindMapPrompt: 'Please analyze the following transcript and create a mind map of concepts and relationships.\n\nTRANSCRIPT:\n{transcript}\n\nCreate a mind map in JSON format with the following structure:\n{\n  "nodes": [\n    {\n      "id": "unique_id_1",\n      "label": "Main Topic",\n      "type": "topic"\n    },\n    {\n      "id": "unique_id_2", \n      "label": "Related Concept",\n      "type": "concept"\n    }\n  ],\n  "edges": [\n    {\n      "id": "edge_1",\n      "source": "unique_id_1",\n      "target": "unique_id_2",\n      "label": "relates to",\n      "type": "relationship"\n    }\n  ]\n}\n\nGuidelines:\n- Extract key concepts, topics, entities, and ideas from the transcript\n- Create meaningful relationships between concepts\n- Use descriptive labels for nodes and edges\n- Focus on the most important concepts mentioned\n- Keep the structure logical and hierarchical\n- Return ONLY valid JSON, no additional text\n\nReturn the mind map as a valid JSON object:',
  voiceChunkLength: 500,
  voiceChunksNumber: 10,
  activeSessionId: null
}

interface SettingsPanelProps {
  onSessionSelect?: (sessionId: string) => void
  selectedSessionId?: string | null
  onSessionContentChanged?: () => void
}

export function SettingsPanel({ onSessionSelect, selectedSessionId, onSessionContentChanged }: SettingsPanelProps) {
  const [settings, setSettings] = useState<SessionSettings>(DEFAULT_SETTINGS)
  const [isLoading, setIsLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [availableSessions, setAvailableSessions] = useState<Array<{id: string, name: string, lastActivity: string}>>([])
  const [showNameEdit, setShowNameEdit] = useState(false)
  const [newSessionName, setNewSessionName] = useState('')
  const [availableOllamaModels, setAvailableOllamaModels] = useState<Array<{id: string, name: string, description: string}>>(FALLBACK_OLLAMA_MODELS)
  const [isLoadingModels, setIsLoadingModels] = useState(false)

  // Load settings from backend on component mount
  useEffect(() => {
    loadSettingsFromBackend()
    loadAvailableSessions()
    loadAvailableOllamaModels()
  }, [])

  const loadSettingsFromBackend = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/settings/')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          const backendSettings = {
            whisperLanguage: data.settings.whisper_language,
            whisperModel: data.settings.whisper_model,
            ollamaModel: data.settings.ollama_model,
            ollamaTaskPrompt: data.settings.ollama_task_prompt,
            ollamaMindMapPrompt: data.settings.ollama_mind_map_prompt,
            voiceChunkLength: data.settings.voice_chunk_length,
            voiceChunksNumber: data.settings.voice_chunks_number,
            activeSessionId: data.settings.active_session_id
          }
          setSettings(backendSettings)
          console.log('Settings loaded from backend:', backendSettings)
        }
      } else {
        console.error('Failed to load settings from backend:', response.status)
        // Fallback to localStorage
        const savedSettings = localStorage.getItem('sessionSettings')
        if (savedSettings) {
          try {
            const parsed = JSON.parse(savedSettings)
            setSettings({ ...DEFAULT_SETTINGS, ...parsed })
          } catch (error) {
            console.error('Failed to parse saved settings:', error)
          }
        }
      }
    } catch (error) {
      console.error('Error loading settings from backend:', error)
      // Fallback to localStorage
      const savedSettings = localStorage.getItem('sessionSettings')
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings)
          setSettings({ ...DEFAULT_SETTINGS, ...parsed })
        } catch (error) {
          console.error('Failed to parse saved settings:', error)
        }
      }
    }
  }

  const loadAvailableSessions = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/sessions/?active_only=true')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          const sessions = data.sessions.map((session: any) => ({
            id: session.id,
            name: session.name || `Session ${session.id.slice(-8)}`,
            lastActivity: new Date(session.last_activity).toLocaleString()
          }))
          setAvailableSessions(sessions)
        }
      }
    } catch (error) {
      console.error('Failed to load sessions:', error)
      // Fallback to empty array
      setAvailableSessions([])
    }
  }

  const loadAvailableOllamaModels = async () => {
    setIsLoadingModels(true)
    try {
      const response = await fetch('http://localhost:8000/llm/models')
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.models) {
          const models = data.models.map((model: any) => ({
            id: model.name,
            name: model.display_name || model.name,
            description: model.size && model.size !== 'Unknown' ? `${model.name} (${model.size})` : model.name
          }))
          setAvailableOllamaModels(models)
          console.log('Ollama models loaded:', models)
        }
      } else {
        console.warn('Failed to load Ollama models from backend, using fallback')
        setAvailableOllamaModels(FALLBACK_OLLAMA_MODELS)
      }
    } catch (error) {
      console.error('Error loading Ollama models:', error)
      // Fallback to default models
      setAvailableOllamaModels(FALLBACK_OLLAMA_MODELS)
    } finally {
      setIsLoadingModels(false)
    }
  }

  const handleSettingChange = (key: keyof SessionSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
    setSaveStatus('idle')
  }

  const handleSaveSettings = async () => {
    setIsLoading(true)
    setSaveStatus('saving')

    try {
      // Save to backend API
      const response = await fetch('http://localhost:8000/api/settings/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Also save to localStorage as backup
          localStorage.setItem('sessionSettings', JSON.stringify(settings))
          setSaveStatus('saved')
          console.log('Settings saved to backend successfully')
          
          // Update audio capture settings if they changed
          try {
            await AudioCaptureService.updateSettings({
              chunkDuration: settings.voiceChunkLength,
              chunksToAccumulate: settings.voiceChunksNumber
            })
            console.log('Audio capture settings updated successfully')
          } catch (error) {
            console.warn('Failed to update audio capture settings:', error)
          }
        } else {
          throw new Error(data.message || 'Failed to save settings')
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      console.error('Failed to save settings:', error)
      setSaveStatus('error')
      
      // Fallback: save to localStorage only
      try {
        localStorage.setItem('sessionSettings', JSON.stringify(settings))
        console.log('Settings saved to localStorage as fallback')
      } catch (localError) {
        console.error('Failed to save to localStorage:', localError)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const getModelDescription = (modelId: string) => {
    return WHISPER_MODELS.find(m => m.id === modelId)?.description || ''
  }

  const getOllamaModelName = (modelId: string) => {
    return availableOllamaModels.find(m => m.id === modelId)?.name || modelId
  }

  const handleApplySettings = async () => {
    try {
      // Update audio capture settings immediately
      await AudioCaptureService.updateSettings({
        chunkDuration: settings.voiceChunkLength,
        chunksToAccumulate: settings.voiceChunksNumber
      })
      console.log('Settings applied immediately')
      
      // Show temporary success message
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 1000)
    } catch (error) {
      console.error('Failed to apply settings:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 2000)
    }
  }

  const handleSessionSelect = (sessionId: string) => {
    setSettings(prev => ({ ...prev, activeSessionId: sessionId }))
    onSessionSelect?.(sessionId)
  }

  const handleDeleteSession = async (sessionId: string) => {
    if (!window.confirm('Are you sure you want to delete this session? This action cannot be undone and will remove the session from the database.')) {
      return
    }
    setIsLoading(true)
    try {
      const response = await fetch(`http://localhost:8000/api/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          console.log('Session deleted successfully')
          loadAvailableSessions() // Refresh sessions list
          onSessionContentChanged?.() // Notify parent to refresh content
          // Clear active session if it was the deleted one
          if (settings.activeSessionId === sessionId) {
            handleSettingChange('activeSessionId', null)
          }
          setSaveStatus('saved')
          setTimeout(() => setSaveStatus('idle'), 1000)
        } else {
          throw new Error(data.message || 'Failed to delete session')
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Failed to delete session:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateSessionName = async (sessionId: string) => {
    if (!newSessionName.trim()) {
      alert('Session name cannot be empty.')
      return
    }
    setIsLoading(true)
    try {
      const response = await fetch(`http://localhost:8000/api/sessions/${sessionId}/name`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSessionName.trim() })
      })
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          console.log('Session name updated successfully')
          loadAvailableSessions() // Refresh sessions to show updated name
          setShowNameEdit(false)
          setNewSessionName('')
          setSaveStatus('saved')
          setTimeout(() => setSaveStatus('idle'), 1000)
        } else {
          throw new Error(data.message || 'Failed to update session name')
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Failed to update session name:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-4 h-full flex flex-col space-y-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Session Settings</h2>
        <Badge variant={saveStatus === 'saved' ? 'default' : saveStatus === 'error' ? 'destructive' : 'secondary'}>
          {saveStatus === 'saving' ? 'Saving...' : 
           saveStatus === 'saved' ? 'Saved!' : 
           saveStatus === 'error' ? 'Error' : 'Unsaved changes'}
        </Badge>
      </div>

      {/* Whisper Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Whisper Transcription</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Language Selection */}
          <div>
            <label className="text-sm font-medium">Language</label>
            <select 
              className="mt-1 w-full px-3 py-2 border rounded-md bg-background"
              value={settings.whisperLanguage}
              onChange={(e) => handleSettingChange('whisperLanguage', e.target.value)}
            >
              {WHISPER_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              {settings.whisperLanguage === 'auto' ? 'Whisper will automatically detect the language' : `Transcribe in ${WHISPER_LANGUAGES.find(l => l.code === settings.whisperLanguage)?.name}`}
            </p>
          </div>

          {/* Model Selection */}
          <div>
            <label className="text-sm font-medium">Model</label>
            <select 
              className="mt-1 w-full px-3 py-2 border rounded-md bg-background"
              value={settings.whisperModel}
              onChange={(e) => handleSettingChange('whisperModel', e.target.value)}
            >
              {WHISPER_MODELS.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              {getModelDescription(settings.whisperModel)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Ollama Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ollama LLM</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Model Selection */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium">Model</label>
              <Button 
                variant="outline" 
                size="sm"
                onClick={loadAvailableOllamaModels}
                disabled={isLoadingModels}
                className="h-6 px-2 text-xs"
              >
                {isLoadingModels ? 'Loading...' : 'Refresh'}
              </Button>
            </div>
            <select 
              className="mt-1 w-full px-3 py-2 border rounded-md bg-background"
              value={settings.ollamaModel}
              onChange={(e) => handleSettingChange('ollamaModel', e.target.value)}
              disabled={isLoadingModels}
            >
              {isLoadingModels ? (
                <option>Loading models...</option>
              ) : (
                availableOllamaModels.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))
              )}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              {getOllamaModelName(settings.ollamaModel)}
            </p>
            {availableOllamaModels.length === 0 && !isLoadingModels && (
              <p className="text-xs text-orange-600 mt-1">
                No models found. Make sure Ollama is running and has models installed.
              </p>
            )}
          </div>

          {/* Task Prompt */}
          <div>
            <label className="text-sm font-medium">Analysis Prompt</label>
            <textarea 
              className="mt-1 w-full px-3 py-2 border rounded-md bg-background resize-none"
              rows={8}
              value={settings.ollamaTaskPrompt}
              onChange={(e) => handleSettingChange('ollamaTaskPrompt', e.target.value)}
              placeholder="Enter the prompt template for LLM analysis..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use {'{transcript}'} as a placeholder for the transcript text
            </p>
          </div>

          {/* Mind Map Prompt */}
          <div>
            <label className="text-sm font-medium">Mind Map Prompt</label>
            <textarea 
              className="mt-1 w-full px-3 py-2 border rounded-md bg-background resize-none"
              rows={8}
              value={settings.ollamaMindMapPrompt}
              onChange={(e) => handleSettingChange('ollamaMindMapPrompt', e.target.value)}
              placeholder="Enter the prompt template for mind map generation..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use {'{transcript}'} as a placeholder for the transcript text. Should return valid JSON.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Audio Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Audio Processing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Voice Chunk Length */}
          <div>
            <label className="text-sm font-medium">Voice Chunk Length</label>
            <select 
              className="mt-1 w-full px-3 py-2 border rounded-md bg-background"
              value={settings.voiceChunkLength}
              onChange={(e) => handleSettingChange('voiceChunkLength', parseInt(e.target.value))}
            >
              {VOICE_CHUNK_LENGTHS.map(chunk => (
                <option key={chunk.value} value={chunk.value}>
                  {chunk.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Shorter chunks = faster response, longer chunks = better accuracy
            </p>
          </div>

          {/* Voice Chunks Number */}
          <div>
            <label className="text-sm font-medium">Chunks Before Processing</label>
            <select 
              className="mt-1 w-full px-3 py-2 border rounded-md bg-background"
              value={settings.voiceChunksNumber}
              onChange={(e) => handleSettingChange('voiceChunksNumber', parseInt(e.target.value))}
            >
              {VOICE_CHUNKS_NUMBERS.map(chunk => (
                <option key={chunk.value} value={chunk.value}>
                  {chunk.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Fewer chunks = faster processing, more chunks = better context
            </p>
            <div className="mt-2 p-2 bg-muted rounded text-xs">
              <p><strong>Current Processing:</strong></p>
              <p>• {settings.voiceChunksNumber} chunks × {settings.voiceChunkLength}ms = {(settings.voiceChunksNumber * settings.voiceChunkLength / 1000).toFixed(1)}s of audio</p>
              <p>• Processing every {(settings.voiceChunksNumber * settings.voiceChunkLength / 1000).toFixed(1)} seconds</p>
            </div>
          </div>

          {/* Processing Time Calculator */}
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-sm font-medium text-blue-800 mb-2">
              Processing Time Calculator
            </div>
            <div className="text-xs text-blue-600 space-y-1">
              <div>Current settings: {settings.voiceChunkLength}ms chunks × {settings.voiceChunksNumber} chunks</div>
              <div>Total audio per batch: {(settings.voiceChunkLength * settings.voiceChunksNumber / 1000).toFixed(1)} seconds</div>
              <div>Expected processing frequency: Every {(settings.voiceChunkLength * settings.voiceChunksNumber / 1000).toFixed(1)}s of speech</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Session Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Active Session */}
          <div>
            <label className="text-sm font-medium">Active Session</label>
            <select 
              className="mt-1 w-full px-3 py-2 border rounded-md bg-background"
              value={selectedSessionId || settings.activeSessionId || ''}
              onChange={(e) => {
                const sessionId = e.target.value || null
                handleSettingChange('activeSessionId', sessionId)
                if (sessionId) {
                  handleSessionSelect(sessionId)
                }
              }}
            >
              <option value="">Start New Session</option>
              {availableSessions.map(session => (
                <option key={session.id} value={session.id}>
                  {session.name} ({session.lastActivity})
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              {settings.activeSessionId ? 'Continue existing session' : 'Start a new session'}
            </p>
          </div>

          {/* Session Actions */}
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={loadAvailableSessions}
              disabled={isLoading}
            >
              Refresh Sessions
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleSettingChange('activeSessionId', null)}
              disabled={!settings.activeSessionId}
            >
              Clear Session
            </Button>
          </div>

          {/* Session Content Management */}
          {selectedSessionId && (
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Session Management</h4>
                <Badge variant="secondary">{selectedSessionId.slice(-8)}</Badge>
              </div>
              
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleDeleteSession(selectedSessionId)}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Delete Session
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowNameEdit(true)}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Change Name
                </Button>
              </div>

              {/* Name Edit Modal */}
              {showNameEdit && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-background p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
                    <h3 className="text-lg font-semibold mb-4">Change Session Name</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">New Session Name</label>
                        <Input
                          value={newSessionName}
                          onChange={(e) => setNewSessionName(e.target.value)}
                          placeholder="Enter new session name..."
                          className="mt-1"
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowNameEdit(false)
                            setNewSessionName('')
                          }}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button 
                          variant="default"
                          size="sm"
                          onClick={() => handleUpdateSessionName(selectedSessionId)}
                          disabled={!newSessionName.trim() || isLoading}
                          className="flex-1"
                        >
                          {isLoading ? 'Updating...' : 'Update Name'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Action Buttons */}
      <div className="pt-4 space-y-2">
        <div className="text-xs text-muted-foreground mb-2">
          <p><strong>Apply Now:</strong> Changes take effect immediately but are not saved</p>
          <p><strong>Save Settings:</strong> Saves to backend and applies changes</p>
        </div>
        <Button 
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleApplySettings}
          disabled={isLoading}
        >
          Apply Now (Temporary)
        </Button>
        <Button 
          variant="default"
          size="sm"
          className="w-full"
          onClick={handleSaveSettings}
          disabled={isLoading || saveStatus === 'saving'}
        >
          {isLoading ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}
