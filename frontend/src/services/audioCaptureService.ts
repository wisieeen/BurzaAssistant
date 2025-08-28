// Audio capture service for browser-based audio recording and streaming
import { WebSocketService, AudioChunk } from './websocketService'

export interface AudioCaptureConfig {
  sampleRate: number
  channels: number
  chunkDuration: number // in milliseconds
  chunksToAccumulate: number // number of chunks to accumulate before sending
  audioLevelThreshold: number // 0-100
}

export interface AudioLevelData {
  level: number // 0-100
  timestamp: string
}

export class AudioCaptureService {
  private static mediaRecorder: MediaRecorder | null = null
  private static audioContext: AudioContext | null = null
  private static analyser: AnalyserNode | null = null
  private static microphone: MediaStreamAudioSourceNode | null = null
  private static stream: MediaStream | null = null
  private static isRecording = false
  private static sessionId: string | null = null
  
  // Custom audio buffer for more reliable chunking
  private static audioBuffer: Float32Array[] = []
  private static bufferSize = 0
  // Calculate buffer size based on chunk duration: 16kHz * 2 bytes per sample * duration in seconds
  private static maxBufferSize = 0 // Will be calculated dynamically
  private static bufferInterval: number | null = null
  private static processor: ScriptProcessorNode | null = null
  
  // Configuration
  private static config: AudioCaptureConfig = {
    sampleRate: 16000, // 16kHz for Whisper
    channels: 1, // Mono
    chunkDuration: 500, // 0.5 second chunks (reduced from 1 second for better reliability)
    chunksToAccumulate: 10, // number of chunks to accumulate before sending
    audioLevelThreshold: 10
  }
  
  // Callbacks
  private static audioLevelCallbacks: ((data: AudioLevelData) => void)[] = []
  private static recordingStateCallbacks: ((isRecording: boolean) => void)[] = []
  private static errorCallbacks: ((error: string) => void)[] = []
  private static settingsChangeCallbacks: ((config: AudioCaptureConfig) => void)[] = []

  /**
   * Initialize audio capture
   * @param config Optional configuration
   * @returns Promise that resolves when initialized
   */
  static async initialize(config?: Partial<AudioCaptureConfig>): Promise<boolean> {
    try {
      // Update configuration
      if (config) {
        this.config = { ...this.config, ...config }
      }

      // Calculate buffer size based on chunk duration
      // We want to accumulate multiple chunks before sending
      this.maxBufferSize = Math.floor(this.config.sampleRate * 4 * (this.config.chunkDuration / 1000) * this.config.chunksToAccumulate)
      console.log(`Audio buffer size calculated: ${this.maxBufferSize} bytes for ${this.config.chunksToAccumulate} chunks of ${this.config.chunkDuration}ms each`)
      console.log(`Expected samples per chunk: ${this.config.sampleRate * (this.config.chunkDuration / 1000)}`)
      console.log(`Expected total samples: ${this.config.sampleRate * (this.config.chunkDuration / 1000) * this.config.chunksToAccumulate}`)

      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.config.sampleRate,
          channelCount: this.config.channels,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })

      // Create audio context
      this.audioContext = new AudioContext({
        sampleRate: this.config.sampleRate
      })

      // Create analyser for audio level monitoring
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 256
      this.analyser.smoothingTimeConstant = 0.8

      // Create microphone source
      this.microphone = this.audioContext.createMediaStreamSource(this.stream)
      this.microphone.connect(this.analyser)

      console.log('Audio capture initialized successfully')
      return true

    } catch (error) {
      console.error('Failed to initialize audio capture:', error)
      this.notifyError(`Failed to initialize audio capture: ${error}`)
      return false
    }
  }

  /**
   * Start audio recording and streaming
   * @param sessionId Optional session ID
   * @returns Promise that resolves when started
   */
  static async startRecording(sessionId?: string): Promise<boolean> {
    try {
      if (!this.audioContext) {
        throw new Error('Audio capture not initialized')
      }

      if (this.isRecording) {
        console.warn('Already recording')
        return true
      }

      // Set session ID first
      this.sessionId = sessionId || `session_${Date.now()}`
      console.log('AudioCaptureService using session ID:', this.sessionId)

      // Connect to WebSocket if not connected
      if (!WebSocketService.getConnectionStatus()) {
        await WebSocketService.connect(this.sessionId)
      }

      // Start custom audio buffer monitoring instead of MediaRecorder
      this.startAudioBufferMonitoring()

      // Notify WebSocket service
      WebSocketService.startAudioStream(this.sessionId)

      this.isRecording = true
      this.notifyRecordingStateChange(true)
      this.startAudioLevelMonitoring()

      console.log('Audio recording started with custom buffer')
      return true

    } catch (error) {
      console.error('Failed to start recording:', error)
      this.notifyError(`Failed to start recording: ${error}`)
      return false
    }
  }

  /**
   * Stop audio recording
   * @returns Promise that resolves when stopped
   */
  static async stopRecording(): Promise<boolean> {
    try {
      if (!this.isRecording) {
        return true
      }

      // Send any remaining audio buffer
      if (this.audioBuffer.length > 0) {
        this.sendAudioBuffer()
      }

      // Stop custom audio buffer monitoring
      if (this.processor) {
        this.processor.disconnect()
        this.processor = null
      }

      // Notify WebSocket service
      if (this.sessionId) {
        WebSocketService.stopAudioStream(this.sessionId)
      }

      this.isRecording = false
      this.notifyRecordingStateChange(false)
      this.stopAudioLevelMonitoring()

      console.log('Audio recording stopped')
      return true

    } catch (error) {
      console.error('Failed to stop recording:', error)
      this.notifyError(`Failed to stop recording: ${error}`)
      return false
    }
  }

  /**
   * Start audio level monitoring
   */
  private static startAudioLevelMonitoring(): void {
    if (!this.analyser) return

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount)

    const monitorAudioLevel = () => {
      if (!this.isRecording || !this.analyser) return

      this.analyser.getByteFrequencyData(dataArray)

      // Calculate average audio level
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
      const level = Math.min(100, (average / 255) * 100)

      // Only notify if level is above threshold
      if (level > this.config.audioLevelThreshold) {
        const audioLevelData: AudioLevelData = {
          level: Math.round(level),
          timestamp: new Date().toISOString()
        }

        this.notifyAudioLevelChange(audioLevelData)
      }

      // Continue monitoring
      requestAnimationFrame(monitorAudioLevel)
    }

    monitorAudioLevel()
  }

  /**
   * Start custom audio buffer monitoring
   */
  private static startAudioBufferMonitoring(): void {
    if (!this.audioContext || !this.microphone) return

    // Create a script processor to capture raw audio data
    const bufferSize = 4096
    const processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1)
    
    processor.onaudioprocess = (event) => {
      if (!this.isRecording) return
      
      const inputBuffer = event.inputBuffer
      const inputData = inputBuffer.getChannelData(0)
      
      // Copy the audio data to our buffer
      const audioData = new Float32Array(inputData.length)
      audioData.set(inputData)
      
      // Debug: Check if we're getting audio data
      const audioLevel = Math.sqrt(audioData.reduce((sum, sample) => sum + sample * sample, 0) / audioData.length)
      if (audioLevel > 0.01) { // Only log if there's actual audio
        console.log(`Audio chunk level: ${audioLevel.toFixed(4)}`)
      }
      
      this.audioBuffer.push(audioData)
      this.bufferSize += audioData.length * 4 // 4 bytes per float32 sample
      
      // Send buffer when it reaches the target size
      if (this.bufferSize >= this.maxBufferSize) {
        console.log(`Buffer full: ${this.bufferSize} >= ${this.maxBufferSize}, sending ${this.audioBuffer.length} chunks`)
        this.sendAudioBuffer()
      }
    }
    
    this.microphone.connect(processor)
    processor.connect(this.audioContext.destination)
    
    // Store reference for cleanup
    this.processor = processor
  }

  /**
   * Send accumulated audio buffer
   */
  private static sendAudioBuffer(): void {
    if (this.audioBuffer.length === 0) return
    
    try {
      // Combine all audio data
      const totalLength = this.audioBuffer.reduce((sum, buffer) => sum + buffer.length, 0)
      const combinedAudio = new Float32Array(totalLength)
      
      let offset = 0
      for (const buffer of this.audioBuffer) {
        combinedAudio.set(buffer, offset)
        offset += buffer.length
      }
      
      // Convert to 16-bit PCM
      const pcmData = new Int16Array(combinedAudio.length)
      for (let i = 0; i < combinedAudio.length; i++) {
        pcmData[i] = Math.max(-32768, Math.min(32767, combinedAudio[i] * 32768))
      }
      
      // Create WAV file
      const wavBuffer = this.createWAVFile(pcmData)
      
      console.log(`Sending audio buffer: ${wavBuffer.byteLength} bytes (${this.audioBuffer.length} chunks, ${this.bufferSize} bytes, ${totalLength} samples)`)
      
      // Debug: Check if audio has actual content
      const audioLevel = Math.sqrt(combinedAudio.reduce((sum, sample) => sum + sample * sample, 0) / combinedAudio.length)
      console.log(`Audio RMS level: ${audioLevel}`)
      
      // Create audio chunk
      const audioChunk: AudioChunk = {
        data: wavBuffer,
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId || undefined
      }

      // Send to WebSocket service
      const success = WebSocketService.sendAudioChunk(audioChunk)
      if (!success) {
        console.error('Failed to send audio buffer to WebSocket')
        this.notifyError('Failed to send audio buffer to server')
      }
      
      // Clear buffer
      this.audioBuffer = []
      this.bufferSize = 0
      
    } catch (error) {
      console.error('Failed to send audio buffer:', error)
      this.notifyError(`Failed to send audio buffer: ${error}`)
      
      // Clear buffer on error
      this.audioBuffer = []
      this.bufferSize = 0
    }
  }

  /**
   * Create WAV file from PCM data
   */
  private static createWAVFile(pcmData: Int16Array): ArrayBuffer {
    const sampleRate = this.config.sampleRate
    const channels = this.config.channels
    const bitsPerSample = 16
    const bytesPerSample = bitsPerSample / 8
    const blockAlign = channels * bytesPerSample
    const byteRate = sampleRate * blockAlign
    const dataSize = pcmData.length * bytesPerSample
    const fileSize = 36 + dataSize
    
    const buffer = new ArrayBuffer(44 + dataSize)
    const view = new DataView(buffer)
    
    // WAV header
    let offset = 0
    
    // RIFF header
    view.setUint32(offset, 0x52494646, false) // "RIFF"
    offset += 4
    view.setUint32(offset, fileSize, true) // File size
    offset += 4
    view.setUint32(offset, 0x57415645, false) // "WAVE"
    offset += 4
    
    // fmt chunk
    view.setUint32(offset, 0x666d7420, false) // "fmt "
    offset += 4
    view.setUint32(offset, 16, true) // fmt chunk size
    offset += 4
    view.setUint16(offset, 1, true) // Audio format (PCM)
    offset += 2
    view.setUint16(offset, channels, true) // Channels
    offset += 2
    view.setUint32(offset, sampleRate, true) // Sample rate
    offset += 4
    view.setUint32(offset, byteRate, true) // Byte rate
    offset += 4
    view.setUint16(offset, blockAlign, true) // Block align
    offset += 2
    view.setUint16(offset, bitsPerSample, true) // Bits per sample
    offset += 2
    
    // data chunk
    view.setUint32(offset, 0x64617461, false) // "data"
    offset += 4
    view.setUint32(offset, dataSize, true) // Data size
    offset += 4
    
    // Audio data
    const pcmView = new Int16Array(buffer, offset)
    pcmView.set(pcmData)
    
    return buffer
  }

  /**
   * Stop audio level monitoring
   */
  private static stopAudioLevelMonitoring(): void {
    // Audio level monitoring is stopped by not calling requestAnimationFrame
  }

  /**
   * Get current recording status
   * @returns Whether currently recording
   */
  static isCurrentlyRecording(): boolean {
    return this.isRecording
  }

  /**
   * Get current session ID
   * @returns Current session ID or null
   */
  static getCurrentSessionId(): string | null {
    return this.sessionId
  }

  /**
   * Update settings dynamically
   * @param newConfig New configuration
   * @returns Promise that resolves when updated
   */
  static async updateSettings(newConfig: Partial<AudioCaptureConfig>): Promise<boolean> {
    try {
      // Update configuration
      this.config = { ...this.config, ...newConfig }
      
      // Recalculate buffer size
      this.maxBufferSize = Math.floor(this.config.sampleRate * 4 * (this.config.chunkDuration / 1000) * this.config.chunksToAccumulate)
      
      console.log(`Settings updated: ${JSON.stringify(newConfig)}`)
      console.log(`New buffer size: ${this.maxBufferSize} bytes for ${this.config.chunksToAccumulate} chunks`)
      
      // Notify callbacks
      this.notifySettingsChange(this.config)
      
      return true
    } catch (error) {
      console.error('Failed to update settings:', error)
      return false
    }
  }

  /**
   * Reinitialize audio capture with new settings
   * @param config New configuration
   * @returns Promise that resolves when reinitialized
   */
  static async reinitialize(config?: Partial<AudioCaptureConfig>): Promise<boolean> {
    // Clean up existing audio capture
    this.cleanup()
    
    // Wait a bit for cleanup
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Initialize with new settings
    return this.initialize(config)
  }

  /**
   * Manually trigger audio buffer sending (for testing)
   */
  static forceSendBuffer(): void {
    if (this.audioBuffer.length > 0) {
      console.log('Manually forcing audio buffer send...')
      this.sendAudioBuffer()
    } else {
      console.log('No audio buffer to send')
    }
  }

  /**
   * Get current settings
   * @returns Current audio capture configuration
   */
  static getCurrentSettings(): AudioCaptureConfig {
    return { ...this.config }
  }

  /**
   * Get current buffer configuration for debugging
   */
  static getBufferConfig() {
    return {
      maxBufferSize: this.maxBufferSize,
      chunkDuration: this.config.chunkDuration,
      chunksToAccumulate: this.config.chunksToAccumulate,
      sampleRate: this.config.sampleRate,
      currentBufferSize: this.bufferSize,
      audioChunksCount: this.audioBuffer.length
    }
  }

  /**
   * Clean up resources
   */
  static cleanup(): void {
    try {
      // Stop recording if active
      if (this.isRecording) {
        this.stopRecording()
      }

      // Stop all tracks
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop())
        this.stream = null
      }

      // Close audio context
      if (this.audioContext) {
        this.audioContext.close()
        this.audioContext = null
      }

      // Disconnect processor
      if (this.processor) {
        this.processor.disconnect()
        this.processor = null
      }

      // Clear audio buffer
      this.audioBuffer = []
      this.bufferSize = 0

      // Clear references
      this.mediaRecorder = null
      this.analyser = null
      this.microphone = null
      this.sessionId = null
      this.isRecording = false

      console.log('Audio capture cleaned up')

    } catch (error) {
      console.error('Error during cleanup:', error)
    }
  }

  /**
   * Register callback for audio level updates
   * @param callback Function to call when audio level changes
   * @returns Function to unregister the callback
   */
  static onAudioLevelChange(callback: (data: AudioLevelData) => void): () => void {
    this.audioLevelCallbacks.push(callback)
    
    return () => {
      const index = this.audioLevelCallbacks.indexOf(callback)
      if (index > -1) {
        this.audioLevelCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Register callback for recording state changes
   * @param callback Function to call when recording state changes
   * @returns Function to unregister the callback
   */
  static onRecordingStateChange(callback: (isRecording: boolean) => void): () => void {
    this.recordingStateCallbacks.push(callback)
    
    return () => {
      const index = this.recordingStateCallbacks.indexOf(callback)
      if (index > -1) {
        this.recordingStateCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Register callback for errors
   * @param callback Function to call when error occurs
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
   * Register callback for settings changes
   * @param callback Function to call when settings change
   * @returns Function to unregister the callback
   */
  static onSettingsChange(callback: (config: AudioCaptureConfig) => void): () => void {
    this.settingsChangeCallbacks.push(callback)
    
    return () => {
      const index = this.settingsChangeCallbacks.indexOf(callback)
      if (index > -1) {
        this.settingsChangeCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Notify audio level change to callbacks
   * @param data Audio level data
   */
  private static notifyAudioLevelChange(data: AudioLevelData): void {
    this.audioLevelCallbacks.forEach(callback => {
      try {
        callback(data)
      } catch (error) {
        console.error('Error in audio level callback:', error)
      }
    })
  }

  /**
   * Notify recording state change to callbacks
   * @param isRecording Current recording state
   */
  private static notifyRecordingStateChange(isRecording: boolean): void {
    this.recordingStateCallbacks.forEach(callback => {
      try {
        callback(isRecording)
      } catch (error) {
        console.error('Error in recording state callback:', error)
      }
    })
  }

  /**
   * Notify error to callbacks
   * @param error Error message
   */
  private static notifyError(error: string): void {
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error)
      } catch (callbackError) {
        console.error('Error in error callback:', callbackError)
      }
    })
  }

  /**
   * Notify settings change to callbacks
   * @param config New configuration
   */
  private static notifySettingsChange(config: AudioCaptureConfig): void {
    this.settingsChangeCallbacks.forEach(callback => {
      try {
        callback(config)
      } catch (error) {
        console.error('Error in settings change callback:', error)
      }
    })
  }

  /**
   * Clear all callbacks
   */
  static clearCallbacks(): void {
    this.audioLevelCallbacks = []
    this.recordingStateCallbacks = []
    this.errorCallbacks = []
    this.settingsChangeCallbacks = []
  }
}
