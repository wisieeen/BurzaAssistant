// Webhook service for backend communication
import { BACKEND_CONFIG, getApiUrl } from '@/config/backend'

export interface ListeningResponse {
  success: boolean
  message: string
  sessionId?: string
  webhookUrl?: string // Optional webhook URL for audio level updates
}

export interface AudioLevelData {
  audioLevel: number // 0-100 percentage
  timestamp: string
  sessionId?: string
}

export class WebhookService {
  private static audioLevelCallbacks: ((data: AudioLevelData) => void)[] = []
  private static webhookEndpoint: string | null = null

  /**
   * Start listening for voice input
   * @returns Promise with the response from the backend
   */
  static async startListening(): Promise<ListeningResponse> {
    try {
      const response = await fetch(getApiUrl(BACKEND_CONFIG.ENDPOINTS.LISTEN_START), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      // If backend provides a webhook URL for audio level updates, store it
      if (result.webhookUrl) {
        this.webhookEndpoint = result.webhookUrl
        console.log('Audio level webhook endpoint received:', result.webhookUrl)
      }

      return result
    } catch (error) {
      console.error('Error starting listening:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to start listening',
      }
    }
  }

  /**
   * Stop listening for voice input
   * @returns Promise with the response from the backend
   */
  static async stopListening(): Promise<ListeningResponse> {
    try {
      const response = await fetch(getApiUrl(BACKEND_CONFIG.ENDPOINTS.LISTEN_STOP), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      // Clear webhook endpoint when stopping
      this.webhookEndpoint = null
      console.log('Audio level webhook endpoint cleared')

      return result
    } catch (error) {
      console.error('Error stopping listening:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to stop listening',
      }
    }
  }

  /**
   * Get current listening status
   * @returns Promise with the current listening status
   */
  static async getListeningStatus(): Promise<{ isListening: boolean; sessionId?: string }> {
    try {
      const response = await fetch(getApiUrl(BACKEND_CONFIG.ENDPOINTS.LISTEN_STATUS), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return {
        isListening: data.isListening || false,
        sessionId: data.sessionId,
      }
    } catch (error) {
      console.error('Error getting listening status:', error)
      return {
        isListening: false,
      }
    }
  }

  /**
   * Register a callback to receive audio level updates from backend webhooks
   * @param callback Function to call when audio level data is received
   * @returns Function to unregister the callback
   */
  static onAudioLevelUpdate(callback: (data: AudioLevelData) => void): () => void {
    this.audioLevelCallbacks.push(callback)
    
    // Return unregister function
    return () => {
      const index = this.audioLevelCallbacks.indexOf(callback)
      if (index > -1) {
        this.audioLevelCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Process incoming audio level webhook data from backend
   * This method should be called when the backend sends audio level updates
   * @param data Audio level data received from backend
   */
  static processAudioLevelWebhook(data: AudioLevelData): void {
    console.log('Received audio level webhook:', data)
    
    // Validate audio level (0-100 range)
    if (typeof data.audioLevel === 'number' && data.audioLevel >= 0 && data.audioLevel <= 100) {
      // Notify all registered callbacks
      this.audioLevelCallbacks.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error('Error in audio level callback:', error)
        }
      })
    } else {
      console.warn('Invalid audio level data received:', data)
    }
  }

  /**
   * Get the current webhook endpoint URL (if any)
   * @returns Webhook endpoint URL or null
   */
  static getWebhookEndpoint(): string | null {
    return this.webhookEndpoint
  }

  /**
   * Clear all audio level callbacks
   */
  static clearAudioLevelCallbacks(): void {
    this.audioLevelCallbacks = []
  }
}
