// WebSocket service for real-time audio streaming and transcription
import { BACKEND_CONFIG, getApiUrl } from '@/config/backend'

export interface AudioChunk {
  data: ArrayBuffer
  timestamp: string
  sessionId?: string
}

export interface TranscriptionResult {
  success: boolean
  text: string
  language: string
  segments: any[]
  model: string
  timestamp: string
  sessionId?: string
  error?: string
}

export interface AudioLevelData {
  audioLevel: number // 0-100 percentage
  timestamp: string
  sessionId?: string
}

export interface WebSocketMessage {
  type: 'audio_chunk' | 'transcription_result' | 'audio_level' | 'error' | 'status' | 'session_analysis' | 'mind_map_result'
  data: any
  timestamp: string
  sessionId?: string
}

export class WebSocketService {
  private static ws: WebSocket | null = null
  private static isConnected = false
  private static reconnectAttempts = 0
  private static maxReconnectAttempts = 5
  private static reconnectDelay = 1000 // Start with 1 second
  
  // Callback arrays for different message types
  private static transcriptionCallbacks: ((data: TranscriptionResult) => void)[] = []
  private static audioLevelCallbacks: ((data: AudioLevelData) => void)[] = []
  private static statusCallbacks: ((data: any) => void)[] = []
  private static errorCallbacks: ((error: string) => void)[] = []
  private static sessionAnalysisCallbacks: ((data: any) => void)[] = []
  private static mindMapCallbacks: ((data: any) => void)[] = []

  /**
   * Connect to the WebSocket server
   * @param sessionId Optional session ID to use for this connection
   * @returns Promise that resolves when connected
   */
  static async connect(sessionId?: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        // Convert HTTP URL to WebSocket URL
        let wsUrl = getApiUrl(BACKEND_CONFIG.ENDPOINTS.WEBSOCKET).replace('http', 'ws')
        
        // Add session ID as query parameter if provided
        if (sessionId) {
          wsUrl += `?session_id=${encodeURIComponent(sessionId)}`
        }
        
        console.log('Connecting to WebSocket:', wsUrl)
        
        this.ws = new WebSocket(wsUrl)
        
        this.ws.onopen = () => {
          console.log('WebSocket connected successfully')
          this.isConnected = true
          this.reconnectAttempts = 0
          this.reconnectDelay = 1000
          resolve(true)
        }
        
        this.ws.onmessage = (event) => {
          this.handleMessage(event.data)
        }
        
        this.ws.onclose = (event) => {
          console.log('WebSocket connection closed:', event.code, event.reason)
          this.isConnected = false
          this.handleReconnect()
        }
        
        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          this.isConnected = false
          reject(error)
        }
        
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error)
        reject(error)
      }
    })
  }

  /**
   * Disconnect from the WebSocket server
   */
  static disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.isConnected = false
  }

  /**
   * Send audio chunk to the server
   * @param audioChunk Audio data to send
   */
  static sendAudioChunk(audioChunk: AudioChunk): boolean {
    if (!this.isConnected || !this.ws) {
      console.warn('WebSocket not connected, cannot send audio chunk')
      return false
    }

    try {
      // Convert ArrayBuffer to base64 string using a more robust method
      const uint8Array = new Uint8Array(audioChunk.data)
      const base64String = this.arrayBufferToBase64(uint8Array)
      
      const message: WebSocketMessage = {
        type: 'audio_chunk',
        data: {
          data: base64String,
          timestamp: audioChunk.timestamp,
          sessionId: audioChunk.sessionId
        },
        timestamp: new Date().toISOString(),
        sessionId: audioChunk.sessionId
      }

      this.ws.send(JSON.stringify(message))
      return true
    } catch (error) {
      console.error('Failed to send audio chunk:', error)
      return false
    }
  }

  /**
   * Send binary audio data (for better performance)
   * @param audioData Raw audio data
   * @param sessionId Session identifier
   */
  static sendBinaryAudio(audioData: ArrayBuffer, sessionId?: string): boolean {
    if (!this.isConnected || !this.ws) {
      console.warn('WebSocket not connected, cannot send binary audio')
      return false
    }

    try {
      // Send binary data directly
      this.ws.send(audioData)
      return true
    } catch (error) {
      console.error('Failed to send binary audio:', error)
      return false
    }
  }

  /**
   * Start audio streaming session
   * @param sessionId Optional session identifier
   */
  static startAudioStream(sessionId?: string): boolean {
    if (!this.isConnected || !this.ws) {
      console.warn('WebSocket not connected, cannot start audio stream')
      return false
    }

    try {
      console.log('WebSocketService starting audio stream with session ID:', sessionId)
      const message: WebSocketMessage = {
        type: 'status',
        data: { action: 'start_stream', sessionId },
        timestamp: new Date().toISOString(),
        sessionId
      }

      this.ws.send(JSON.stringify(message))
      console.log('WebSocket message sent:', message)
      return true
    } catch (error) {
      console.error('Failed to start audio stream:', error)
      return false
    }
  }

  /**
   * Stop audio streaming session
   * @param sessionId Optional session identifier
   */
  static stopAudioStream(sessionId?: string): boolean {
    if (!this.isConnected || !this.ws) {
      console.warn('WebSocket not connected, cannot stop audio stream')
      return false
    }

    try {
      const message: WebSocketMessage = {
        type: 'status',
        data: { action: 'stop_stream', sessionId },
        timestamp: new Date().toISOString(),
        sessionId
      }

      this.ws.send(JSON.stringify(message))
      return true
    } catch (error) {
      console.error('Failed to stop audio stream:', error)
      return false
    }
  }

  /**
   * Handle incoming WebSocket messages
   * @param data Raw message data
   */
  private static handleMessage(data: any): void {
    try {
      const message: WebSocketMessage = JSON.parse(data)
      
      switch (message.type) {
        case 'transcription_result':
          console.log('WebSocket received transcription result with session ID:', message.sessionId)
          const transcriptionResult: TranscriptionResult = {
            success: message.data.success,
            text: message.data.text,
            language: message.data.language,
            segments: message.data.segments || [],
            model: message.data.model,
            timestamp: message.timestamp,
            sessionId: message.sessionId,
            error: message.data.error
          }
          
          this.transcriptionCallbacks.forEach(callback => {
            try {
              callback(transcriptionResult)
            } catch (error) {
              console.error('Error in transcription callback:', error)
            }
          })
          break

        case 'audio_level':
          const audioLevelData: AudioLevelData = {
            audioLevel: message.data.audioLevel,
            timestamp: message.timestamp,
            sessionId: message.sessionId
          }
          
          this.audioLevelCallbacks.forEach(callback => {
            try {
              callback(audioLevelData)
            } catch (error) {
              console.error('Error in audio level callback:', error)
            }
          })
          break

        case 'status':
          this.statusCallbacks.forEach(callback => {
            try {
              callback(message.data)
            } catch (error) {
              console.error('Error in status callback:', error)
            }
          })
          break

        case 'error':
          this.errorCallbacks.forEach(callback => {
            try {
              callback(message.data.error || 'Unknown error')
            } catch (error) {
              console.error('Error in error callback:', error)
            }
          })
          break

        case 'session_analysis':
          this.sessionAnalysisCallbacks.forEach(callback => {
            try {
              callback(message.data)
            } catch (error) {
              console.error('Error in session analysis callback:', error)
            }
          })
          break

        case 'mind_map_result':
          this.mindMapCallbacks.forEach(callback => {
            try {
              callback(message.data)
            } catch (error) {
              console.error('Error in mind map callback:', error)
            }
          })
          break

        default:
          console.warn('Unknown WebSocket message type:', message.type)
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error)
    }
  }

  /**
   * Handle reconnection logic
   */
  private static handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)

    setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnection failed:', error)
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 10000) // Exponential backoff, max 10s
      })
    }, this.reconnectDelay)
  }

  /**
   * Register callback for transcription results
   * @param callback Function to call when transcription result is received
   * @returns Function to unregister the callback
   */
  static onTranscriptionResult(callback: (data: TranscriptionResult) => void): () => void {
    this.transcriptionCallbacks.push(callback)
    
    return () => {
      const index = this.transcriptionCallbacks.indexOf(callback)
      if (index > -1) {
        this.transcriptionCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Register callback for audio level updates
   * @param callback Function to call when audio level data is received
   * @returns Function to unregister the callback
   */
  static onAudioLevelUpdate(callback: (data: AudioLevelData) => void): () => void {
    this.audioLevelCallbacks.push(callback)
    
    return () => {
      const index = this.audioLevelCallbacks.indexOf(callback)
      if (index > -1) {
        this.audioLevelCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Register callback for status updates
   * @param callback Function to call when status update is received
   * @returns Function to unregister the callback
   */
  static onStatusUpdate(callback: (data: any) => void): () => void {
    this.statusCallbacks.push(callback)
    
    return () => {
      const index = this.statusCallbacks.indexOf(callback)
      if (index > -1) {
        this.statusCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Register callback for error messages
   * @param callback Function to call when error is received
   * @returns Function to unregister the callback
   */
  static onError(callback: (error: string) => void): () => void {
    this.errorCallbacks.push(callback)
    
    return () => {
      const index = this.errorCallbacks.indexOf(callback)
      if (index > -1) {
        this.errorCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Register callback for session analysis results
   * @param callback Function to call when session analysis is received
   * @returns Function to unregister the callback
   */
  static onSessionAnalysis(callback: (data: any) => void): () => void {
    this.sessionAnalysisCallbacks.push(callback)
    
    return () => {
      const index = this.sessionAnalysisCallbacks.indexOf(callback)
      if (index > -1) {
        this.sessionAnalysisCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Register callback for mind map results
   * @param callback Function to call when mind map is received
   * @returns Function to unregister the callback
   */
  static onMindMapResult(callback: (data: any) => void): () => void {
    this.mindMapCallbacks.push(callback)
    
    return () => {
      const index = this.mindMapCallbacks.indexOf(callback)
      if (index > -1) {
        this.mindMapCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Get connection status
   * @returns Whether the WebSocket is connected
   */
  static getConnectionStatus(): boolean {
    return this.isConnected
  }

  /**
   * Clear all callbacks
   */
  static clearCallbacks(): void {
    this.transcriptionCallbacks = []
    this.audioLevelCallbacks = []
    this.statusCallbacks = []
    this.errorCallbacks = []
    this.sessionAnalysisCallbacks = []
    this.mindMapCallbacks = []
  }

  /**
   * Convert ArrayBuffer to base64 string safely
   * @param uint8Array Uint8Array to convert
   * @returns Base64 string
   */
  private static arrayBufferToBase64(uint8Array: Uint8Array): string {
    // Use a more efficient method that avoids spread operator issues
    const bytes = new Uint8Array(uint8Array)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return window.btoa(binary)
  }
}
