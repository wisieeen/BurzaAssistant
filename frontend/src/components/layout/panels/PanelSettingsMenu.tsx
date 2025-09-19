import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'

// Types for panel-specific settings
interface PanelSettings {
  ollamaSummaryModel: string
  ollamaTaskPrompt: string
}

// Types for custom LLM panel settings
interface CustomLLMSettings {
  model: string
  prompt: string
  appendToPrevious: boolean
}

// Available Ollama models (same as SettingsPanel)
const FALLBACK_OLLAMA_MODELS = [
  { id: 'none', name: 'None (Disabled)', description: 'Skip this type of processing' },
  { id: 'artifish/llama3.2-uncensored:latest', name: 'Llama 3.2 Uncensored', description: 'Current default model' },
  { id: 'llama2:latest', name: 'Llama 2', description: 'Meta\'s Llama 2 model' },
  { id: 'mistral:latest', name: 'Mistral', description: 'Mistral AI model' },
  { id: 'codellama:latest', name: 'Code Llama', description: 'Specialized for code' }
]

// Default settings
const DEFAULT_PANEL_SETTINGS: PanelSettings = {
  ollamaSummaryModel: 'artifish/llama3.2-uncensored:latest',
  ollamaTaskPrompt: 'Please analyze the following transcript and provide insights:\n\nTRANSCRIPT:\n{transcript}\n\nPlease provide:\n1. A brief summary of the main topics discussed\n2. Key points or important information mentioned\n3. Any questions, concerns, or action items identified\n4. Overall sentiment or tone of the conversation\n\nPlease be concise but thorough in your analysis.'
}

interface PanelSettingsMenuProps {
  isOpen: boolean
  onClose: () => void
  onSettingsChange?: (settings: PanelSettings | CustomLLMSettings) => void
  customSettings?: CustomLLMSettings
  isCustomLLMPanel?: boolean
}

export function PanelSettingsMenu({ 
  isOpen, 
  onClose, 
  onSettingsChange,
  customSettings,
  isCustomLLMPanel = false
}: PanelSettingsMenuProps) {
  const [settings, setSettings] = useState<PanelSettings | CustomLLMSettings>(
    isCustomLLMPanel && customSettings ? customSettings : DEFAULT_PANEL_SETTINGS
  )
  const [isLoading, setIsLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [availableOllamaModels, setAvailableOllamaModels] = useState<Array<{id: string, name: string, description: string}>>(FALLBACK_OLLAMA_MODELS)
  const [isLoadingModels, setIsLoadingModels] = useState(false)

  // Load settings from backend on component mount
  useEffect(() => {
    if (isOpen) {
      if (isCustomLLMPanel) {
        // For custom LLM panels, just load models, settings are passed as props
        loadAvailableOllamaModels()
      } else {
        loadSettingsFromBackend()
        loadAvailableOllamaModels()
      }
    }
  }, [isOpen, isCustomLLMPanel])

  const loadSettingsFromBackend = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/settings/')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          const backendSettings = {
            ollamaSummaryModel: data.settings.ollama_summary_model || data.settings.ollama_model,
            ollamaTaskPrompt: data.settings.ollama_task_prompt
          }
          setSettings(backendSettings)
          console.log('Panel settings loaded from backend:', backendSettings)
        }
      } else {
        console.error('Failed to load settings from backend:', response.status)
        // Fallback to localStorage
        const savedSettings = localStorage.getItem('panelSettings')
        if (savedSettings) {
          try {
            const parsed = JSON.parse(savedSettings)
            setSettings({ ...DEFAULT_PANEL_SETTINGS, ...parsed })
          } catch (error) {
            console.error('Failed to parse saved panel settings:', error)
          }
        }
      }
    } catch (error) {
      console.error('Error loading panel settings from backend:', error)
      // Fallback to localStorage
      const savedSettings = localStorage.getItem('panelSettings')
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings)
          setSettings({ ...DEFAULT_PANEL_SETTINGS, ...parsed })
        } catch (error) {
          console.error('Failed to parse saved panel settings:', error)
        }
      }
    }
  }

  const loadAvailableOllamaModels = async () => {
    setIsLoadingModels(true)
    try {
      const response = await fetch('http://localhost:8000/llm/models')
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.models) {
          // Add 'none' option at the beginning
          const noneOption = { id: 'none', name: 'None (Disabled)', description: 'Skip this type of processing' }
          const models = [noneOption, ...data.models.map((model: any) => ({
            id: model.name,
            name: model.display_name || model.name,
            description: model.size && model.size !== 'Unknown' ? `${model.name} (${model.size})` : model.name
          }))]
          setAvailableOllamaModels(models)
          console.log('Ollama models loaded for panel:', models)
        }
      } else {
        console.warn('Failed to load Ollama models from backend, using fallback')
        setAvailableOllamaModels(FALLBACK_OLLAMA_MODELS)
      }
    } catch (error) {
      console.error('Error loading Ollama models for panel:', error)
      // Fallback to default models
      setAvailableOllamaModels(FALLBACK_OLLAMA_MODELS)
    } finally {
      setIsLoadingModels(false)
    }
  }

  const handleSettingChange = (key: string, value: any) => {
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
      if (isCustomLLMPanel) {
        // For custom LLM panels, just notify parent component
        onSettingsChange?.(settings as CustomLLMSettings)
        setSaveStatus('saved')
        console.log('Custom LLM panel settings updated')
      } else {
        // Save to backend API for regular panels
        const response = await fetch('http://localhost:8000/api/settings/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ollama_summary_model: (settings as PanelSettings).ollamaSummaryModel,
            ollama_task_prompt: (settings as PanelSettings).ollamaTaskPrompt
          })
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            // Also save to localStorage as backup
            localStorage.setItem('panelSettings', JSON.stringify(settings))
            setSaveStatus('saved')
            console.log('Panel settings saved to backend successfully')
            
            // Notify parent component of settings change
            onSettingsChange?.(settings as PanelSettings)
          } else {
            throw new Error(data.message || 'Failed to save panel settings')
          }
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
      }

      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      console.error('Failed to save panel settings:', error)
      setSaveStatus('error')
      
      // Fallback: save to localStorage only
      try {
        localStorage.setItem('panelSettings', JSON.stringify(settings))
        console.log('Panel settings saved to localStorage as fallback')
      } catch (localError) {
        console.error('Failed to save to localStorage:', localError)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const getOllamaModelName = (modelId: string) => {
    return availableOllamaModels.find(m => m.id === modelId)?.name || modelId
  }

  if (!isOpen) return null

  return (
         <div className="fixed inset-0 bg-white bg-opacity-70 flex items-center justify-center z-50">
       <div className="bg-background/95 backdrop-blur-sm border-2 border-border p-6 rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">
            {isCustomLLMPanel ? 'Custom LLM Panel Settings' : 'LLM Summary Panel Settings'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="space-y-6">
          {/* Status Badge */}
          <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border/50">
            <span className="text-sm font-medium text-foreground">Settings Status</span>
            <Badge variant={saveStatus === 'saved' ? 'default' : saveStatus === 'error' ? 'destructive' : 'secondary'}>
              {saveStatus === 'saving' ? 'Saving...' : 
               saveStatus === 'saved' ? 'Saved!' : 
               saveStatus === 'error' ? 'Error' : 'Unsaved changes'}
            </Badge>
          </div>

                     {/* Model Selection */}
                       <Card className="border-2 border-border/50 bg-card/95 hover:border-primary/50 transition-all duration-200 hover:shadow-lg">
              <CardHeader className="bg-muted/30 rounded-t-lg">
                <CardTitle className="text-base">
                  {isCustomLLMPanel ? 'LLM Model' : 'Summary Analysis Model'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                             <div className="flex items-center justify-between mb-2">
                 <label className="text-sm font-semibold text-foreground">Model</label>
                 <Button 
                   variant="outline" 
                   size="sm"
                   onClick={loadAvailableOllamaModels}
                   disabled={isLoadingModels}
                   className="h-6 px-2 text-xs border-2 hover:bg-primary hover:text-primary-foreground"
                 >
                   {isLoadingModels ? 'Loading...' : 'Refresh'}
                 </Button>
               </div>
              
              <select 
                className="w-full px-3 py-2 border-2 border-border rounded-md bg-background/90 resize-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={isCustomLLMPanel ? (settings as CustomLLMSettings).model : (settings as PanelSettings).ollamaSummaryModel}
                onChange={(e) => handleSettingChange(isCustomLLMPanel ? 'model' : 'ollamaSummaryModel', e.target.value)}
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
              
                             <p className="text-xs text-foreground bg-muted/30 p-2 rounded border border-border/50">
                 {isCustomLLMPanel 
                   ? `Selected model: ${getOllamaModelName((settings as CustomLLMSettings).model)}`
                   : `Used for transcript analysis and summaries: ${getOllamaModelName((settings as PanelSettings).ollamaSummaryModel)}`
                 }
               </p>
            </CardContent>
          </Card>

                     {/* Task Prompt */}
                       <Card className="border-2 border-border/50 bg-card/95 hover:border-primary/50 transition-all duration-200 hover:shadow-lg">
              <CardHeader className="bg-muted/30 rounded-t-lg">
                <CardTitle className="text-base">
                  {isCustomLLMPanel ? 'Custom Prompt' : 'Analysis Prompt'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
              <textarea 
                className="w-full px-3 py-2 border-2 border-border rounded-md bg-background/90 resize-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                rows={8}
                value={isCustomLLMPanel ? (settings as CustomLLMSettings).prompt : (settings as PanelSettings).ollamaTaskPrompt}
                onChange={(e) => handleSettingChange(isCustomLLMPanel ? 'prompt' : 'ollamaTaskPrompt', e.target.value)}
                placeholder={isCustomLLMPanel ? "Enter your custom prompt for LLM processing..." : "Enter the prompt template for LLM analysis..."}
              />
                             <p className="text-xs text-foreground bg-muted/30 p-2 rounded border border-border/50">
                 {isCustomLLMPanel 
                   ? "Use {transcript} for transcript text and {previous_result} for previous generation results (replaced with 'none' if no previous result selected). This prompt will be used for all processing requests in this panel."
                   : `Use ${'{transcript}'} as a placeholder for the transcript text`
                 }
               </p>
            </CardContent>
          </Card>

          {/* Append to Previous Option - Only for Custom LLM Panels */}
          {isCustomLLMPanel && (
            <Card className="border-2 border-border/50 bg-card/95 hover:border-primary/50 transition-all duration-200 hover:shadow-lg">
              <CardHeader className="bg-muted/30 rounded-t-lg">
                <CardTitle className="text-base">Result Handling</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1 flex-1">
                    <label className="text-sm font-semibold text-foreground">Append to Previous</label>
                    <p className="text-xs text-muted-foreground">
                      When enabled, new results will be appended to the previous result instead of replacing it.
                      Useful for incremental processing where you want to build upon previous results.
                    </p>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(settings as CustomLLMSettings).appendToPrevious || false}
                        onChange={(e) => handleSettingChange('appendToPrevious', e.target.checked)}
                        className="w-4 h-4 text-primary bg-background border-2 border-muted-foreground rounded focus:ring-primary focus:ring-2"
                      />
                      <span className="text-sm text-muted-foreground">Enable</span>
                    </label>
                  </div>
                </div>
                <p className="text-xs text-foreground bg-muted/30 p-2 rounded border border-border/50">
                  <strong>Note:</strong> When this option is enabled, make sure your prompt asks the LLM to return only new information, 
                  as it will be appended to the existing result.
                </p>
              </CardContent>
            </Card>
          )}

                     {/* Action Buttons */}
           <div className="flex space-x-3 pt-4">
             <Button 
               variant="outline"
               onClick={onClose}
               className="flex-1 border-2 hover:bg-muted hover:text-foreground"
             >
               Cancel
             </Button>
             <Button 
               variant="default"
               onClick={handleSaveSettings}
               disabled={isLoading || saveStatus === 'saving'}
               className="flex-1 shadow-lg hover:shadow-xl transition-shadow"
             >
               {isLoading ? 'Saving...' : 'Save Settings'}
             </Button>
           </div>
        </div>
      </div>
    </div>
  )
}
