import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { WebSocketService } from '@/lib/websocketService'

export interface SessionAnalysis {
  session_id: string
  llm_result_id: number
  processing_time: number
  analysis: string
  timestamp: string
}

interface LLMSummaryPanelProps {
  sessionAnalysis?: SessionAnalysis | null
  error?: string | null
  onClearAnalysis?: () => void
  selectedSessionId?: string | null
  sessionLLMResults?: SessionAnalysis[]
  isLoadingSessionContent?: boolean
}

export function LLMSummaryPanel({ 
  sessionAnalysis = null, 
  error = null, 
  onClearAnalysis,
  selectedSessionId = null,
  sessionLLMResults = [],
  isLoadingSessionContent = false
}: LLMSummaryPanelProps) {

  const formatAnalysis = (analysis: string) => {
    // Split the analysis into sections based on common patterns
    const sections = analysis.split(/\*\*([^*]+)\*\*/)
    return sections.map((section, index) => {
      if (index % 2 === 1) {
        // This is a bold header
        return (
          <div key={index} className="mt-4 mb-2">
            <h4 className="text-sm font-semibold text-primary">{section}</h4>
          </div>
        )
      } else if (section.trim()) {
        // This is content
        return (
          <div key={index} className="mb-2">
            <p className="text-sm text-muted-foreground leading-relaxed">{section}</p>
          </div>
        )
      }
      return null
    })
  }

  const clearAnalysis = () => {
    onClearAnalysis?.()
  }

  const getPanelTitle = () => {
    if (selectedSessionId) {
      return `Session Analysis (${selectedSessionId.slice(-8)})`
    }
    return 'Session Analysis'
  }

  const getDisplayContent = () => {
    if (isLoadingSessionContent) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading session analysis...</span>
          </div>
        </div>
      )
    }

    if (selectedSessionId && sessionLLMResults.length > 0) {
      // Display only the last (most recent) session LLM result
      const lastResult = sessionLLMResults[sessionLLMResults.length - 1]
      return (
        <div className="flex-1 overflow-y-auto px-4 pb-4 min-h-0">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground leading-relaxed">
                {formatAnalysis(lastResult.analysis)}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-md mt-3">
                <span>ID: {lastResult.llm_result_id}</span>
                <span>{lastResult.processing_time.toFixed(1)}s • {new Date(lastResult.timestamp).toLocaleTimeString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    if (sessionAnalysis) {
      // Display current session analysis
      return (
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 min-h-0">
          <div className="flex-1 min-h-0">
            <div className="text-sm text-muted-foreground leading-relaxed">
              {formatAnalysis(sessionAnalysis.analysis)}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
            <span>ID: {sessionAnalysis.llm_result_id}</span>
            <span>{sessionAnalysis.processing_time.toFixed(1)}s • {new Date(sessionAnalysis.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>
      )
    }

    // Default empty state
    return (
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
              />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            {selectedSessionId ? 'No analysis found for this session' : 'No session analysis yet'}
          </p>
          <p className="text-xs text-muted-foreground">
            {selectedSessionId ? 'This session has no LLM results' : 'Start recording to generate AI-powered insights'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between p-4 pb-2">
        <h3 className="text-lg font-semibold">{getPanelTitle()}</h3>
        {(sessionAnalysis || (selectedSessionId && sessionLLMResults.length > 0)) && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={clearAnalysis}
          >
            Clear
          </Button>
        )}
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

      {getDisplayContent()}
    </div>
  )
}
