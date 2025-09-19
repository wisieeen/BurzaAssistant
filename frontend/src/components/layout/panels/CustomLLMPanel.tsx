import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Copy, Download, Loader2, Settings, Play, Square, Trash2, Edit2, Check, X } from 'lucide-react'
import { PanelSettingsMenu } from './PanelSettingsMenu'
import { usePanelLayout } from '@/contexts/PanelLayoutContext'

export interface CustomLLMResult {
  id: string
  panelId: string
  prompt: string
  model: string
  result: string
  processing_time: number
  timestamp: string
  status: 'processing' | 'completed' | 'error'
  error?: string
}

interface CustomLLMPanelProps {
  panelId: string
  panelTitle: string
  onRemove?: (panelId: string) => void
  sessionTranscript?: string
}

export function CustomLLMPanel({ 
  panelId,
  panelTitle,
  onRemove,
  sessionTranscript = ''
}: CustomLLMPanelProps) {
  const { updatePanelName } = usePanelLayout()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState<CustomLLMResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editingName, setEditingName] = useState(panelTitle)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const [selectedPreviousResult, setSelectedPreviousResult] = useState<string | null>(null)
  const [settings, setSettings] = useState({
    model: 'artifish/llama3.2-uncensored:latest',
    prompt: "Please analyze the transcript and list all topics with short descriptions not listed in previous results. If nothing new is mentioned in transcript, return simple 'none'.\nTranscript:\n'''\n{transcript}\n'''\nPrevious result:\n'''\n{previous_result}\n'''",
    appendToPrevious: true
  })

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem(`customLLMPanel_${panelId}`)
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        setSettings(prev => ({ ...prev, ...parsed }))
      } catch (error) {
        console.error('Failed to load custom LLM panel settings:', error)
      }
    }
  }, [panelId])

  // Save settings to localStorage when they change
  const handleSettingsChange = (newSettings: any) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings }
      localStorage.setItem(`customLLMPanel_${panelId}`, JSON.stringify(updated))
      return updated
    })
  }

  // Handle name editing
  const handleNameDoubleClick = () => {
    setIsEditingName(true)
    setEditingName(panelTitle)
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingName(e.target.value)
  }

  const handleNameSave = () => {
    if (editingName.trim() && editingName !== panelTitle) {
      updatePanelName(panelId, editingName.trim())
    }
    setIsEditingName(false)
  }

  const handleNameCancel = () => {
    setEditingName(panelTitle)
    setIsEditingName(false)
  }

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNameSave()
    } else if (e.key === 'Escape') {
      handleNameCancel()
    }
  }

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus()
      nameInputRef.current.select()
    }
  }, [isEditingName])

  // Update editing name when panelTitle prop changes
  useEffect(() => {
    setEditingName(panelTitle)
  }, [panelTitle])

  const processWithLLM = async () => {
    if (!sessionTranscript.trim()) {
      setError('No transcript available for processing')
      return
    }

    // No need to check for previous result - we'll handle it in prompt processing

    setIsProcessing(true)
    setError(null)

    // Create a new result entry for tracking
    const resultId = `result_${Date.now()}`
    const newResult: CustomLLMResult = {
      id: resultId,
      panelId,
      prompt: settings.prompt,
      model: settings.model,
      result: '',
      processing_time: 0,
      timestamp: new Date().toISOString(),
      status: 'processing'
    }

    setResults(prev => [newResult, ...prev])

    try {
      // Replace placeholders with actual content
      let processedPrompt = settings.prompt.replace('{transcript}', sessionTranscript)
      
      // Replace {previous_result} placeholder - use selected result or 'none' if none selected
      if (processedPrompt.includes('{previous_result}')) {
        const previousResultValue = selectedPreviousResult || 'none'
        processedPrompt = processedPrompt.replace('{previous_result}', previousResultValue)
      }

      const response = await fetch('http://localhost:8000/llm/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: settings.model,
          prompt: processedPrompt,
          panel_id: panelId
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('LLM API response:', data)
      console.log('LLM result text:', data.result)
      console.log('LLM result length:', data.result?.length)
      console.log('LLM result chars:', data.result?.split('').map((char: string, i: number) => ({ char, code: char.charCodeAt(0), index: i })))

      if (data.success) {
        // Check if result is 'none' - if so, don't add new content
        if (data.result.toLowerCase().trim() === 'none') {
          // Remove the result entry entirely when LLM returns 'none'
          setResults(prev => prev.filter(result => result.id !== resultId))
        } else {
          // Handle append mode
          let finalResult = data.result
          console.log('Append mode enabled:', settings.appendToPrevious)
          console.log('Results length:', results.length)
          if (settings.appendToPrevious && results.length > 0) {
            // Find the most recent completed result to append to
            const mostRecentResult = results.find(r => r.status === 'completed')
            console.log('Most recent result found:', mostRecentResult)
            if (mostRecentResult) {
              console.log('Previous result:', mostRecentResult.result)
              console.log('New result:', data.result)
              finalResult = mostRecentResult.result + '\n\n' + data.result
              console.log('Final appended result:', finalResult)
            }
          }

          // Update the result with the response
          console.log('Storing final result:', finalResult)
          setResults(prev => {
            const newResults = prev.map(result => 
              result.id === resultId 
                ? {
                    ...result,
                    result: finalResult,
                    processing_time: data.processing_time || 0,
                    status: 'completed' as const
                  }
                : result
            )
            console.log('Updated results state:', newResults)
            return newResults
          })
        }
      } else {
        throw new Error(data.message || 'Failed to process with LLM')
      }
    } catch (error) {
      console.error('Custom LLM processing error:', error)
      setError(error instanceof Error ? error.message : 'Unknown error occurred')
      
      // Update the result with error status
      setResults(prev => prev.map(result => 
        result.id === resultId 
          ? {
              ...result,
              status: 'error' as const,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          : result
      ))
    } finally {
      setIsProcessing(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const downloadResult = (result: CustomLLMResult) => {
    const content = `Custom LLM Analysis (${panelTitle})\n\nPrompt: ${result.prompt}\nModel: ${result.model}\n\nResult:\n${result.result}`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `custom_llm_analysis_${panelId}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const clearResults = () => {
    setResults([])
    setError(null)
  }

  const formatResult = (text: string) => {
    // Debug logging
    console.log('formatResult input:', text)
    console.log('formatResult input length:', text.length)
    console.log('formatResult input chars:', text.split('').map((char: string, i: number) => ({ char, code: char.charCodeAt(0), index: i })))
    
    // Split the result into lines and process each line
    const lines = text.split('\n')
    console.log('formatResult lines:', lines)
    
    return lines.map((line, index) => {
      const trimmedLine = line.trim()
      console.log(`formatResult line ${index}:`, { original: line, trimmed: trimmedLine, length: line.length })
      
      
      // Handle append separator - just add some spacing, no visual separator
      if (trimmedLine === '---') {
        return <div key={index} className="my-4"></div>
      }
      
      // Skip empty lines
      if (!trimmedLine) {
        return <div key={index} className="h-2"></div>
      }
      
      // Handle numbered lists (e.g., "1. ", "2. ", etc.)
      const numberedListMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/)
      if (numberedListMatch) {
        return (
          <div key={index} className="flex items-start space-x-2 mb-2">
            <span className="text-sm font-medium text-primary min-w-[20px]">
              {numberedListMatch[1]}.
            </span>
            <p className="text-sm text-muted-foreground leading-relaxed flex-1">
              {numberedListMatch[2]}
            </p>
          </div>
        )
      }
      
      // Handle bullet points (e.g., "- ", "* ", "• ")
      const bulletMatch = trimmedLine.match(/^[-*•]\s+(.+)$/)
      if (bulletMatch) {
        return (
          <div key={index} className="flex items-start space-x-2 mb-2">
            <span className="text-sm text-primary mt-1">•</span>
            <p className="text-sm text-muted-foreground leading-relaxed flex-1">
              {bulletMatch[1]}
            </p>
          </div>
        )
      }
      
      // Handle section headers (lines that end with colon and are followed by content)
      if (trimmedLine.endsWith(':') && trimmedLine.length < 50) {
        return (
          <div key={index} className="mt-4 mb-2">
            <h4 className="text-sm font-semibold text-primary">{trimmedLine}</h4>
          </div>
        )
      }
      
      // Handle bold text with ** markers
      if (trimmedLine.includes('**')) {
        const parts = trimmedLine.split(/\*\*([^*]+)\*\*/)
        return (
          <div key={index} className="mb-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {parts.map((part, partIndex) => {
                if (partIndex % 2 === 1) {
                  // This is bold text
                  return <span key={partIndex} className="font-semibold text-primary">{part}</span>
                } else {
                  // This is regular text
                  return part
                }
              })}
            </p>
          </div>
        )
      }
      
      // Regular paragraph text
      return (
        <div key={index} className="mb-2">
          <p className="text-sm text-muted-foreground leading-relaxed">{trimmedLine}</p>
        </div>
      )
    })
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between p-4 pb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isEditingName ? (
            <div className="flex items-center gap-2 flex-1">
              <Input
                ref={nameInputRef}
                value={editingName}
                onChange={handleNameChange}
                onKeyDown={handleNameKeyDown}
                onBlur={handleNameSave}
                className="text-lg font-semibold h-8 px-2 py-1"
                placeholder="Panel name"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={handleNameSave}
                className="h-6 w-6 p-0"
              >
                <Check className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleNameCancel}
                className="h-6 w-6 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <h3 
              className="text-lg font-semibold cursor-pointer hover:bg-muted/50 px-2 py-1 rounded transition-colors flex items-center gap-2 group"
              onDoubleClick={handleNameDoubleClick}
              title="Double-click to edit name"
            >
              {panelTitle}
              <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h3>
          )}
        </div>
        <div className="flex items-center gap-2">
          {results.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Use result:</label>
              <select
                value={selectedPreviousResult || ''}
                onChange={(e) => setSelectedPreviousResult(e.target.value || null)}
                className={`text-xs px-2 py-1 border rounded bg-background ${
                  selectedPreviousResult 
                    ? 'border-primary' 
                    : 'border-border'
                }`}
              >
                <option value="">None</option>
                {results.map((result, index) => (
                  <option key={result.id} value={result.result}>
                    Result {results.length - index} ({new Date(result.timestamp).toLocaleTimeString()})
                  </option>
                ))}
              </select>
              {selectedPreviousResult && (
                <Badge variant="secondary" className="text-xs">
                  Using previous result
                </Badge>
              )}
              {settings.appendToPrevious && (
                <Badge variant="outline" className="text-xs">
                  Append mode
                </Badge>
              )}
            </div>
          )}
          <Button 
            variant="outline" 
            size="sm"
            onClick={processWithLLM}
            disabled={isProcessing || !sessionTranscript.trim()}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Play className="w-3 h-3 mr-1" />
                Process
              </>
            )}
          </Button>
          
          {results.length > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={clearResults}
            >
              <Square className="w-3 h-3" />
            </Button>
          )}
          
          <Button 
            variant="outline"
            size="sm"
            onClick={() => setIsSettingsOpen(true)}
          >
            <Settings className="w-3 h-3" />
          </Button>
          
          {onRemove && (
            <Button 
              variant="outline"
              size="sm"
              onClick={() => onRemove(panelId)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="px-4 pb-2">
          <Card className="border-destructive">
            <CardContent className="p-3">
              <div className="flex items-center space-x-2">
                <Badge variant="destructive">Error</Badge>
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {settings.prompt.includes('{previous_result}') && results.length === 0 && (
        <div className="px-4 pb-2">
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-3">
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-blue-700 border-blue-300">Info</Badge>
                <p className="text-sm text-blue-700">
                  Your prompt uses {'{previous_result}'} - it will be replaced with 'none' for the first generation. 
                  Subsequent generations can reference previous results.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 pb-4 min-h-0">
        {results.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <svg 
                  className="w-8 h-8 text-muted-foreground" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" 
                  />
                </svg>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {!sessionTranscript.trim() ? 'No transcript available' : 'Ready to process'}
              </p>
              <p className="text-xs text-muted-foreground">
                {!sessionTranscript.trim() ? 'Select a session with transcript data' : 'Click Process to analyze with custom LLM'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {results.map((result) => (
              <Card key={result.id} className="border-l-4 border-l-primary">
                <CardContent className="p-4">
                  {result.status === 'processing' ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Processing with {result.model}...</span>
                      </div>
                    </div>
                  ) : result.status === 'error' ? (
                    <div className="flex items-center space-x-2">
                      <Badge variant="destructive">Error</Badge>
                      <p className="text-sm text-destructive">{result.error}</p>
                    </div>
                  ) : (
                    <>
                      <div className="text-sm text-muted-foreground leading-relaxed">
                        {formatResult(result.result)}
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-md mt-3">
                        <span>Model: {result.model}</span>
                        <div className="flex items-center space-x-2">
                          <span>{result.processing_time.toFixed(1)}s • {new Date(result.timestamp).toLocaleTimeString()}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(result.result)}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadResult(result)}
                            className="h-6 w-6 p-0"
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Panel Settings Menu */}
      <PanelSettingsMenu
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsChange={handleSettingsChange}
        customSettings={settings}
        isCustomLLMPanel={true}
      />
    </div>
  )
}
