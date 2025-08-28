import { DndContext, DragEndEvent, closestCenter, DragStartEvent } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { Panel, VoiceInputPanel, TranscriptionPanel, LLMSummaryPanel, MindMapPanel, SettingsPanel } from '@/components/layout/panels'
import { PanelLayoutProvider, usePanelLayout } from '@/contexts/PanelLayoutContext'
import { TranscriptionResult } from '@/services/websocketService'
import { SessionAnalysis } from '@/components/layout/panels/LLMSummaryPanel'
import { MindMapData } from '@/components/layout/panels/MindMapPanel'
import { WebSocketService } from '@/services/websocketService'
import { AudioCaptureService, AudioLevelData } from '@/services/audioCaptureService'
import { useState, useEffect } from 'react'

interface WorkingAreaContentProps {
  isListening: boolean
  onStartListening: () => void
  onStopListening: () => void
}

function WorkingAreaContent({ 
  isListening, 
  onStartListening, 
  onStopListening 
}: WorkingAreaContentProps) {
  const { panels, expandedPanelId, movePanel, expandPanel, collapsePanel } = usePanelLayout()
  
  // Centralized transcription state that persists across panel expansion/collapse
  const [liveTranscription, setLiveTranscription] = useState<string>('')
  const [transcriptionHistory, setTranscriptionHistory] = useState<TranscriptionResult[]>([])
  
  // Centralized session analysis state that persists across panel expansion/collapse
  const [sessionAnalysis, setSessionAnalysis] = useState<SessionAnalysis | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  
  // Centralized mind map state that persists across panel expansion/collapse
  const [mindMapData, setMindMapData] = useState<MindMapData | null>(null)
  const [mindMapError, setMindMapError] = useState<string | null>(null)
  const [isGeneratingRandomMindMap, setIsGeneratingRandomMindMap] = useState(false)
  const [isGeneratingAutomaticMindMap, setIsGeneratingAutomaticMindMap] = useState(false)
  
  // Centralized audio capture state
  const [isAudioInitialized, setIsAudioInitialized] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [audioSettings, setAudioSettings] = useState({ voiceChunkLength: 500, voiceChunksNumber: 10 })

  // Session selection and content state
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [sessionTranscriptions, setSessionTranscriptions] = useState<TranscriptionResult[]>([])
  const [sessionLLMResults, setSessionLLMResults] = useState<SessionAnalysis[]>([])
  const [sessionMindMaps, setSessionMindMaps] = useState<MindMapData[]>([])
  const [isLoadingSessionContent, setIsLoadingSessionContent] = useState(false)

  // Initialize audio capture once for the entire working area
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        // Load settings from backend first
        try {
          const response = await fetch('http://localhost:8000/api/settings/')
          if (response.ok) {
            const data = await response.json()
            if (data.success) {
              setAudioSettings({
                voiceChunkLength: data.settings.voice_chunk_length,
                voiceChunksNumber: data.settings.voice_chunks_number
              })
            }
          }
        } catch (error) {
          console.warn('Failed to load settings from backend, using defaults:', error)
        }

        const success = await AudioCaptureService.initialize({
          sampleRate: 16000,
          channels: 1,
          chunkDuration: audioSettings.voiceChunkLength,
          chunksToAccumulate: audioSettings.voiceChunksNumber,
          audioLevelThreshold: 10
        })
        
        if (success) {
          setIsAudioInitialized(true)
          console.log('Audio capture initialized successfully')
          console.log('Buffer config:', AudioCaptureService.getBufferConfig())
        } else {
          console.error('Failed to initialize audio capture')
        }
      } catch (error) {
        console.error('Error initializing audio capture:', error)
      }
    }

    initializeAudio()

    // Cleanup only when the entire working area is unmounted
    return () => {
      AudioCaptureService.cleanup()
    }
  }, [])

  // Register for audio level updates
  useEffect(() => {
    const unregisterAudioLevel = AudioCaptureService.onAudioLevelChange((data: AudioLevelData) => {
      setAudioLevel(data.level)
    })

    // Cleanup on unmount
    return () => {
      unregisterAudioLevel()
    }
  }, [])

  // Register for transcription results - this persists across panel expansion/collapse
  useEffect(() => {
    const unregister = WebSocketService.onTranscriptionResult((transcription: TranscriptionResult) => {
      console.log('WorkingArea received transcription:', transcription)
      handleTranscriptionReceived(transcription)
    })

    return () => {
      unregister()
    }
  }, [])

  // Register for session analysis results - this persists across panel expansion/collapse
  useEffect(() => {
    const unregister = WebSocketService.onSessionAnalysis((analysis: SessionAnalysis) => {
      console.log('WorkingArea received session analysis:', analysis)
      setSessionAnalysis(analysis)
      setAnalysisError(null)
      // Set loading state for automatic mind map generation
      setIsGeneratingAutomaticMindMap(true)
    })

    const unregisterError = WebSocketService.onError((errorMsg: string) => {
      setAnalysisError(errorMsg)
    })

    return () => {
      unregister()
      unregisterError()
    }
  }, [])

  // Register for mind map results - this persists across panel expansion/collapse
  useEffect(() => {
    const unregister = WebSocketService.onMindMapResult((mindMap: MindMapData) => {
      console.log('WorkingArea received mind map:', mindMap)
      setMindMapData(mindMap)
      setMindMapError(null)
      // Clear loading state for automatic mind map generation
      setIsGeneratingAutomaticMindMap(false)
    })

    const unregisterError = WebSocketService.onError((errorMsg: string) => {
      setMindMapError(errorMsg)
      // Clear loading state on error
      setIsGeneratingAutomaticMindMap(false)
    })

    return () => {
      unregister()
      unregisterError()
    }
  }, [])

  // Load session content when session is selected
  useEffect(() => {
    if (selectedSessionId) {
      console.log('Session selected, loading content for:', selectedSessionId)
      loadSessionContent(selectedSessionId)
    } else {
      // Clear session content when no session is selected
      console.log('No session selected, clearing session content')
      setSessionTranscriptions([])
      setSessionLLMResults([])
      setSessionMindMaps([])
    }
  }, [selectedSessionId])

  const loadSessionContent = async (sessionId: string) => {
    setIsLoadingSessionContent(true)
    try {
      console.log('Loading session content for session ID:', sessionId)
      // Load session transcripts
      const transcriptsResponse = await fetch(`http://localhost:8000/api/sessions/${sessionId}/transcripts`)
      if (transcriptsResponse.ok) {
        const transcriptsData = await transcriptsResponse.json()
        console.log('Session transcripts response:', transcriptsData)
        if (transcriptsData.success) {
          const transcriptResults = transcriptsData.transcripts.map((transcript: any) => ({
            id: transcript.id,
            text: transcript.text,
            language: transcript.language || 'unknown',
            model: transcript.model || 'unknown',
            confidence: transcript.confidence || 0,
            timestamp: transcript.created_at,
            success: true
          }))
          console.log('Processed transcript results:', transcriptResults)
          setSessionTranscriptions(transcriptResults)
        }
      } else {
        console.error('Failed to load session transcripts:', transcriptsResponse.status)
      }

      // Load session LLM results
      const llmResponse = await fetch(`http://localhost:8000/api/sessions/${sessionId}/llm-results`)
      if (llmResponse.ok) {
        const llmData = await llmResponse.json()
        if (llmData.success) {
          const llmResults = llmData.llm_results.map((result: any) => ({
            session_id: sessionId,
            llm_result_id: result.id,
            processing_time: result.processing_time || 0,
            analysis: result.response,
            timestamp: result.created_at
          }))
          setSessionLLMResults(llmResults)
        }
      }

      // Load session mind maps
      const mindMapResponse = await fetch(`http://localhost:8000/api/sessions/${sessionId}/mind-maps`)
      if (mindMapResponse.ok) {
        const mindMapData = await mindMapResponse.json()
        if (mindMapData.success) {
          const mindMaps = mindMapData.mind_maps.map((mindMap: any) => ({
            nodes: mindMap.nodes || [],
            edges: mindMap.edges || [],
            session_id: sessionId,
            timestamp: mindMap.created_at
          }))
          setSessionMindMaps(mindMaps)
        }
      }
    } catch (error) {
      console.error('Failed to load session content:', error)
    } finally {
      setIsLoadingSessionContent(false)
    }
  }

  const handleSessionSelect = (sessionId: string) => {
    setSelectedSessionId(sessionId)
  }

  const handleTranscriptionReceived = (transcription: TranscriptionResult) => {
    console.log('WorkingArea processing transcription:', transcription)
    console.log('Selected session ID:', selectedSessionId)
    console.log('Transcription session ID:', transcription.sessionId)
    console.log('Session ID match:', selectedSessionId === transcription.sessionId)
    
    if (transcription.success && transcription.text) {
      // Update live transcription
      setLiveTranscription(transcription.text)
      
      // Add to history
      setTranscriptionHistory(prev => [transcription, ...prev.slice(0, 9)]) // Keep last 10
      
      // If no session is selected but we have a transcription with a session ID,
      // automatically select that session
      if (!selectedSessionId && transcription.sessionId) {
        console.log('No session selected, automatically selecting session:', transcription.sessionId)
        setSelectedSessionId(transcription.sessionId)
      }
      
      // If a session is selected (either previously or just set), add to session transcriptions
      if (selectedSessionId || transcription.sessionId) {
        const sessionId = selectedSessionId || transcription.sessionId
        console.log('Adding transcription to session transcriptions for session:', sessionId)
        setSessionTranscriptions(prev => {
          const newTranscriptions = [transcription, ...prev]
          console.log('Updated session transcriptions:', newTranscriptions)
          return newTranscriptions
        })
        
        // Also refresh from database to ensure consistency
        setTimeout(() => {
          loadSessionContent(sessionId!)
        }, 1000) // Wait 1 second for database to be updated
      } else {
        console.log('No session ID available, not adding to session transcriptions')
      }
    }
  }

  const clearTranscriptionHistory = () => {
    setTranscriptionHistory([])
    setLiveTranscription('')
    
    // If a session is selected, also clear session transcriptions
    if (selectedSessionId) {
      setSessionTranscriptions([])
    }
  }

  const clearSessionAnalysis = () => {
    setSessionAnalysis(null)
    setAnalysisError(null)
  }

  const clearMindMap = () => {
    setMindMapData(null)
    setMindMapError(null)
  }

  const generateRandomMindMap = async () => {
    if (!selectedSessionId) return
    
    setIsGeneratingRandomMindMap(true)
    setMindMapError(null)
    
    try {
      const response = await fetch(`http://localhost:8000/api/sessions/${selectedSessionId}/mind-maps?use_random_seed=true`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.mind_map) {
          // Update the mind map data
          setMindMapData(data.mind_map)
          
          // Also refresh session content to get the updated mind maps
          await loadSessionContent(selectedSessionId)
        } else {
          setMindMapError('Failed to generate mind map')
        }
      } else {
        const errorData = await response.json()
        setMindMapError(errorData.detail || 'Failed to generate mind map')
      }
    } catch (error) {
      console.error('Error generating random mind map:', error)
      setMindMapError('Failed to generate mind map')
    } finally {
      setIsGeneratingRandomMindMap(false)
    }
  }

  const handleStartListening = async () => {
    if (isListening || !isAudioInitialized) return
    
    setIsProcessing(true)
    try {
      console.log('Starting recording with session ID:', selectedSessionId)
      // Pass the selected session ID if available, otherwise let AudioCaptureService generate one
      const success = await AudioCaptureService.startRecording(selectedSessionId || undefined)
      if (success) {
        onStartListening()
        console.log('Started audio recording and streaming with session ID:', selectedSessionId)
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
        onStopListening()
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

  const handleDragStart = (event: DragStartEvent) => {
    console.log('Drag started:', event.active.id)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    console.log('Drag ended:', { active: active.id, over: over?.id })
    
    if (over && active.id !== over.id) {
      const oldIndex = panels.findIndex(panel => panel.id === active.id)
      const newIndex = panels.findIndex(panel => panel.id === over.id)
      
      console.log('Moving panel:', { oldIndex, newIndex, panels: panels.map(p => p.id) })
      
      if (oldIndex !== -1 && newIndex !== -1) {
        movePanel(oldIndex, newIndex)
        console.log('Panel moved successfully!')
      }
    }
  }

  // If a panel is expanded, show only that panel
  if (expandedPanelId) {
    const expandedPanel = panels.find(panel => panel.id === expandedPanelId)
    if (!expandedPanel) return null

    return (
      <div className="flex-1 p-6 bg-muted/20 relative overflow-hidden">
        <Panel 
          key={expandedPanel.id}
          id={expandedPanel.id}
          title={expandedPanel.title}
          type={expandedPanel.type}
          isExpanded={true}
          onCollapse={collapsePanel}
        >
          {expandedPanel.type === 'mind_map' ? (
            <MindMapPanel 
              mindMapData={selectedSessionId && sessionMindMaps.length > 0 ? sessionMindMaps[sessionMindMaps.length - 1] : mindMapData}
              error={mindMapError}
              onClearMindMap={clearMindMap}
              onGenerateRandomMindMap={generateRandomMindMap}
              selectedSessionId={selectedSessionId}
              sessionMindMaps={sessionMindMaps}
              isLoadingSessionContent={isLoadingSessionContent}
              isGeneratingRandom={isGeneratingRandomMindMap}
              isGeneratingAutomatic={isGeneratingAutomaticMindMap}
            />
          ) : expandedPanel.type === 'input' ? (
            <VoiceInputPanel 
              isListening={isListening}
              isProcessing={isProcessing}
              audioLevel={audioLevel}
              isAudioInitialized={isAudioInitialized}
              onStartListening={handleStartListening}
              onStopListening={handleStopListening}
            />
          ) : expandedPanel.type === 'output' ? (
            <TranscriptionPanel 
              liveTranscription={liveTranscription}
              transcriptionHistory={selectedSessionId ? sessionTranscriptions : transcriptionHistory}
              onClearHistory={clearTranscriptionHistory}
              selectedSessionId={selectedSessionId}
              isLoadingSessionContent={isLoadingSessionContent}
            />
          ) : expandedPanel.type === 'llm_summary' ? (
            <LLMSummaryPanel 
              sessionAnalysis={selectedSessionId && sessionLLMResults.length > 0 ? sessionLLMResults[0] : sessionAnalysis}
              error={analysisError}
              onClearAnalysis={clearSessionAnalysis}
              selectedSessionId={selectedSessionId}
              sessionLLMResults={sessionLLMResults}
              isLoadingSessionContent={isLoadingSessionContent}
            />
          ) : expandedPanel.type === 'settings' ? (
            <SettingsPanel 
              onSessionSelect={handleSessionSelect} 
              selectedSessionId={selectedSessionId}
              onSessionContentChanged={() => {
                if (selectedSessionId) {
                  loadSessionContent(selectedSessionId)
                }
              }}
            />
                            ) : (
                    <MindMapPanel 
                      mindMapData={selectedSessionId && sessionMindMaps.length > 0 ? sessionMindMaps[sessionMindMaps.length - 1] : mindMapData}
                      error={mindMapError}
                      onClearMindMap={clearMindMap}
                      onGenerateRandomMindMap={generateRandomMindMap}
                      selectedSessionId={selectedSessionId}
                      sessionMindMaps={sessionMindMaps}
                      isLoadingSessionContent={isLoadingSessionContent}
                      isGeneratingRandom={isGeneratingRandomMindMap}
                      isGeneratingAutomatic={isGeneratingAutomaticMindMap}
                    />
                  )}
        </Panel>
      </div>
    )
  }

  // Normal grid layout when no panel is expanded
  return (
    <div className="flex-1 p-6 bg-muted/20 relative overflow-hidden">
      <DndContext
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="h-full grid grid-cols-2 grid-rows-2 gap-4 min-h-0">
          <SortableContext items={panels.map(p => p.id)} strategy={rectSortingStrategy}>
            {panels.map((panel) => {
              return (
                <Panel 
                  key={panel.id}
                  id={panel.id}
                  title={panel.title}
                  type={panel.type}
                  className="col-span-1 row-span-1"
                  onExpand={() => expandPanel(panel.id)}
                >
                  {panel.type === 'mind_map' ? (
                    <MindMapPanel 
                      mindMapData={selectedSessionId && sessionMindMaps.length > 0 ? sessionMindMaps[sessionMindMaps.length - 1] : mindMapData}
                      error={mindMapError}
                      onClearMindMap={clearMindMap}
                      onGenerateRandomMindMap={generateRandomMindMap}
                      selectedSessionId={selectedSessionId}
                      sessionMindMaps={sessionMindMaps}
                      isLoadingSessionContent={isLoadingSessionContent}
                      isGeneratingRandom={isGeneratingRandomMindMap}
                      isGeneratingAutomatic={isGeneratingAutomaticMindMap}
                    />
                  ) : panel.type === 'input' ? (
                    <VoiceInputPanel 
                      isListening={isListening}
                      isProcessing={isProcessing}
                      audioLevel={audioLevel}
                      isAudioInitialized={isAudioInitialized}
                      onStartListening={handleStartListening}
                      onStopListening={handleStopListening}
                    />
                  ) : panel.type === 'output' ? (
                    <TranscriptionPanel 
                      liveTranscription={liveTranscription}
                      transcriptionHistory={selectedSessionId ? sessionTranscriptions : transcriptionHistory}
                      onClearHistory={clearTranscriptionHistory}
                      selectedSessionId={selectedSessionId}
                      isLoadingSessionContent={isLoadingSessionContent}
                    />
                  ) : panel.type === 'llm_summary' ? (
                    <LLMSummaryPanel 
                      sessionAnalysis={selectedSessionId && sessionLLMResults.length > 0 ? sessionLLMResults[0] : sessionAnalysis}
                      error={analysisError}
                      onClearAnalysis={clearSessionAnalysis}
                      selectedSessionId={selectedSessionId}
                      sessionLLMResults={sessionLLMResults}
                      isLoadingSessionContent={isLoadingSessionContent}
                    />
                              ) : panel.type === 'settings' ? (
              <SettingsPanel 
                onSessionSelect={handleSessionSelect} 
                selectedSessionId={selectedSessionId}
                onSessionContentChanged={() => {
                  if (selectedSessionId) {
                    loadSessionContent(selectedSessionId)
                  }
                }}
              />
                            ) : (
            <MindMapPanel 
              mindMapData={selectedSessionId && sessionMindMaps.length > 0 ? sessionMindMaps[sessionMindMaps.length - 1] : mindMapData}
              error={mindMapError}
              onClearMindMap={clearMindMap}
              onGenerateRandomMindMap={generateRandomMindMap}
              selectedSessionId={selectedSessionId}
              sessionMindMaps={sessionMindMaps}
              isLoadingSessionContent={isLoadingSessionContent}
              isGeneratingRandom={isGeneratingRandomMindMap}
            />
          )}
                </Panel>
              )
            })}
          </SortableContext>
        </div>
      </DndContext>
    </div>
  )
}

export function WorkingArea({ 
  isListening, 
  onStartListening, 
  onStopListening 
}: WorkingAreaContentProps) {
  return (
    <PanelLayoutProvider>
      <WorkingAreaContent 
        isListening={isListening}
        onStartListening={onStartListening}
        onStopListening={onStopListening}
      />
    </PanelLayoutProvider>
  )
}
