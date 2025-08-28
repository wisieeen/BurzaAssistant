import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Copy, Download, Loader2 } from 'lucide-react'

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
  onGenerateSummary?: () => void
}

export function LLMSummaryPanel({ 
  sessionAnalysis = null, 
  error = null, 
  onClearAnalysis,
  selectedSessionId = null,
  sessionLLMResults = [],
  isLoadingSessionContent = false,
  onGenerateSummary
}: LLMSummaryPanelProps) {

  // Get the analysis content to copy/download
  const getAnalysisContent = () => {
    // Prioritize live session analysis over historical results
    if (sessionAnalysis) {
      return sessionAnalysis.analysis
    }
    
    if (selectedSessionId && sessionLLMResults.length > 0) {
      // Return the most recent session LLM result
      return sessionLLMResults[0].analysis
    }
    
    return ''
  }

  const copyToClipboard = () => {
    const analysisContent = getAnalysisContent()
    if (analysisContent) {
      navigator.clipboard.writeText(analysisContent)
    }
  }

  const downloadAnalysis = () => {
    const analysisContent = getAnalysisContent()
    if (!analysisContent) return

    const sessionId = selectedSessionId ? selectedSessionId.slice(-8) : 'session'
    const content = `Session Analysis (${sessionId})\n\n${analysisContent}`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `session_analysis_${sessionId}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatAnalysis = (analysis: string) => {
    // Split the analysis into lines and process each line
    const lines = analysis.split('\n')
    
    return lines.map((line, index) => {
      const trimmedLine = line.trim()
      
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
    console.log('LLMSummaryPanel getDisplayContent:', {
      isLoadingSessionContent,
      sessionAnalysis,
      sessionLLMResultsLength: sessionLLMResults.length,
      selectedSessionId,
      sessionLLMResults
    })

    if (isLoadingSessionContent && !sessionAnalysis && sessionLLMResults.length === 0) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading session analysis...</span>
          </div>
        </div>
      )
    }

    // Prioritize live session analysis over historical results
    if (sessionAnalysis) {
      console.log('Displaying live session analysis:', sessionAnalysis)
      // Display current live session analysis
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

    if (selectedSessionId && sessionLLMResults.length > 0) {
      // Display only the first (most recent) session LLM result when no live analysis is available
      // Results are sorted with newest first, so index 0 is the most recent
      const mostRecentResult = sessionLLMResults[0]
      console.log('Displaying most recent session LLM result:', mostRecentResult)
      console.log('All session LLM results:', sessionLLMResults.map(r => ({ id: r.llm_result_id, timestamp: r.timestamp })))
              return (
          <div className="flex-1 overflow-y-auto px-4 pb-4 min-h-0">
            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground leading-relaxed">
                  {formatAnalysis(mostRecentResult.analysis)}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-md mt-3">
                  <span>ID: {mostRecentResult.llm_result_id}</span>
                  <span>{mostRecentResult.processing_time.toFixed(1)}s • {new Date(mostRecentResult.timestamp).toLocaleTimeString()}</span>
                </div>
              </CardContent>
            </Card>
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
        <div className="flex items-center gap-2">
          {selectedSessionId && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onGenerateSummary}
            >
              Generate Summary
            </Button>
          )}
          {(sessionAnalysis || (selectedSessionId && sessionLLMResults.length > 0)) && (
            <>
              <Button 
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
                disabled={!getAnalysisContent()}
              >
                <Copy className="w-3 h-3" />
              </Button>
              <Button 
                variant="outline"
                size="sm"
                onClick={downloadAnalysis}
                disabled={!getAnalysisContent()}
              >
                <Download className="w-3 h-3" />
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={clearAnalysis}
              >
                Clear
              </Button>
            </>
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

      {getDisplayContent()}
    </div>
  )
}
