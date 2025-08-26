import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface Session {
  id: string
  name?: string
  description?: string
  is_active: boolean
  created_at: string
  last_activity: string
}

interface SessionSummary {
  session_id: string
  name?: string
  description?: string
  is_active: boolean
  created_at: string
  last_activity: string
  transcript_count: number
  llm_result_count: number
  total_audio_duration: number
  average_processing_time: number
}

interface SessionManagementPanelProps {
  onSessionSelect?: (sessionId: string) => void
  selectedSessionId?: string
}

export function SessionManagementPanel({ onSessionSelect, selectedSessionId }: SessionManagementPanelProps) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedSession, setSelectedSession] = useState<SessionSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newSession, setNewSession] = useState({
    name: '',
    description: ''
  })

  useEffect(() => {
    loadSessions()
  }, [])

  useEffect(() => {
    if (selectedSessionId) {
      loadSessionSummary(selectedSessionId)
    }
  }, [selectedSessionId])

  const loadSessions = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('http://localhost:8000/api/sessions/')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setSessions(data.sessions)
        }
      }
    } catch (error) {
      console.error('Failed to load sessions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadSessionSummary = async (sessionId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/sessions/${sessionId}/summary`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setSelectedSession(data.summary)
        }
      }
    } catch (error) {
      console.error('Failed to load session summary:', error)
    }
  }

  const handleCreateSession = async () => {
    if (!newSession.name.trim()) return

    setIsLoading(true)
    try {
      const sessionId = `session-${Date.now()}`
      const response = await fetch('http://localhost:8000/api/sessions/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sessionId,
          name: newSession.name,
          description: newSession.description
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setNewSession({ name: '', description: '' })
          setShowCreateForm(false)
          await loadSessions()
          if (onSessionSelect) {
            onSessionSelect(sessionId)
          }
        }
      }
    } catch (error) {
      console.error('Failed to create session:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleActivateSession = async (sessionId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/sessions/${sessionId}/activate`, {
        method: 'POST'
      })
      if (response.ok) {
        await loadSessions()
        if (onSessionSelect) {
          onSessionSelect(sessionId)
        }
      }
    } catch (error) {
      console.error('Failed to activate session:', error)
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session?')) return

    try {
      const response = await fetch(`http://localhost:8000/api/sessions/${sessionId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        await loadSessions()
        if (selectedSessionId === sessionId) {
          setSelectedSession(null)
        }
      }
    } catch (error) {
      console.error('Failed to delete session:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}m ${remainingSeconds}s`
  }

  return (
    <div className="p-4 h-full flex flex-col space-y-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Session Management</h2>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : 'New Session'}
        </Button>
      </div>

      {/* Create Session Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create New Session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Session Name</label>
              <Input
                value={newSession.name}
                onChange={(e) => setNewSession(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter session name..."
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description (Optional)</label>
              <Textarea
                value={newSession.description}
                onChange={(e) => setNewSession(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter session description..."
                className="mt-1"
                rows={3}
              />
            </div>
            <Button 
              onClick={handleCreateSession}
              disabled={isLoading || !newSession.name.trim()}
              className="w-full"
            >
              {isLoading ? 'Creating...' : 'Create Session'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No sessions found. Create your first session to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedSessionId === session.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => onSessionSelect?.(session.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium">
                          {session.name || `Session ${session.id.slice(-8)}`}
                        </h3>
                        <Badge variant={session.is_active ? 'default' : 'secondary'}>
                          {session.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      {session.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {session.description}
                        </p>
                      )}
                      <div className="text-xs text-muted-foreground mt-2">
                        Created: {formatDate(session.created_at)}
                        {session.last_activity !== session.created_at && (
                          <span className="ml-4">
                            Last activity: {formatDate(session.last_activity)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {!session.is_active && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleActivateSession(session.id)
                          }}
                        >
                          Activate
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteSession(session.id)
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Session Details */}
      {selectedSession && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Session Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium">{selectedSession.name || `Session ${selectedSession.session_id.slice(-8)}`}</h3>
              {selectedSession.description && (
                <p className="text-sm text-muted-foreground mt-1">{selectedSession.description}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {selectedSession.transcript_count}
                </div>
                <div className="text-xs text-muted-foreground">Transcripts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {selectedSession.llm_result_count}
                </div>
                <div className="text-xs text-muted-foreground">LLM Results</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {formatDuration(selectedSession.total_audio_duration)}
                </div>
                <div className="text-xs text-muted-foreground">Audio Duration</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {selectedSession.average_processing_time.toFixed(1)}s
                </div>
                <div className="text-xs text-muted-foreground">Avg Processing</div>
              </div>
            </div>

            <Separator />

            <div className="text-xs text-muted-foreground space-y-1">
              <div>Created: {formatDate(selectedSession.created_at)}</div>
              <div>Last Activity: {formatDate(selectedSession.last_activity)}</div>
              <div>Status: {selectedSession.is_active ? 'Active' : 'Inactive'}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Refresh Button */}
      <Button 
        variant="outline" 
        onClick={loadSessions}
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? 'Refreshing...' : 'Refresh Sessions'}
      </Button>
    </div>
  )
}
