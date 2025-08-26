// Backend configuration
export const BACKEND_CONFIG = {
  // Base URL for the FastAPI backend
  BASE_URL: 'http://localhost:8000',
  
  // API endpoints
  ENDPOINTS: {
    LISTEN_START: '/api/listen/start',
    LISTEN_STOP: '/api/listen/stop',
    LISTEN_STATUS: '/api/listen/status',
    WEBSOCKET: '/ws/audio',
  },
  
  // Webhook configuration for receiving data from backend
  WEBHOOK: {
    // Endpoint where backend can send webhook data
    RECEIVER_ENDPOINT: '/api/webhook/receive',
    // Secret key for webhook signature validation (if implemented)
    SECRET_KEY: 'your-webhook-secret-key',
  },
  
  // Request timeout in milliseconds
  TIMEOUT: 10000,
  
  // Retry attempts for failed requests
  MAX_RETRIES: 3,
} as const

// Helper function to get full API URL
export const getApiUrl = (endpoint: string): string => {
  return `${BACKEND_CONFIG.BASE_URL}${endpoint}`
}

// Helper function to get webhook receiver URL
export const getWebhookReceiverUrl = (): string => {
  return `${BACKEND_CONFIG.BASE_URL}${BACKEND_CONFIG.WEBHOOK.RECEIVER_ENDPOINT}`
}
