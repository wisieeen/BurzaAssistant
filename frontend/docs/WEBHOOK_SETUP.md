# Webhook Setup for Voice Listening

## Overview
This document describes the webhook implementation for the voice listening functionality in the frontend application, including both outgoing webhooks (to backend) and incoming webhooks (from backend).

## Architecture
- **Frontend**: React/TypeScript application with webhook service and receiver
- **Backend**: FastAPI server (expected to run on `http://localhost:8000`)
- **Communication**: 
  - Outgoing: HTTP REST API calls for start/stop listening operations
  - Incoming: Webhook receiver for real-time audio level updates from backend

## Components

### 1. Webhook Service (`/src/lib/webhookService.ts`)
Handles all backend communication for voice listening operations.

**Methods:**
- `startListening()`: POST to `/api/listen/start`
- `stopListening()`: POST to `/api/listen/stop`
- `getListeningStatus()`: GET from `/api/listen/status`
- `onAudioLevelUpdate()`: Register callback for audio level webhooks
- `processAudioLevelWebhook()`: Process incoming audio level data

### 2. Webhook Receiver (`/src/lib/webhookReceiver.ts`)
Handles incoming webhook calls from the backend.

**Methods:**
- `processWebhook()`: Process webhook data from backend
- `processWebhookFromSource()`: Process webhooks from different sources
- `validateWebhookSignature()`: Validate webhook signatures (placeholder)

### 3. Configuration (`/src/config/backend.ts`)
Centralized backend configuration including:
- Base URL
- API endpoints
- Webhook receiver endpoint
- Timeout and retry settings

### 4. Voice Input Panel (`/src/components/layout/panels/VoiceInputPanel.tsx`)
UI component that receives webhook data and displays real-time audio level.

### 5. Sidebar (`/src/components/layout/Sidebar/Sidebar.tsx`)
Control panel with listening start/stop buttons.

## API Endpoints Expected

### Start Listening
```
POST /api/listen/start
Content-Type: application/json

{
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Listening started successfully",
  "sessionId": "uuid-string",
  "webhookUrl": "http://localhost:8000/api/webhook/receive"
}
```

### Stop Listening
```
POST /api/listen/stop
Content-Type: application/json

{
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Listening stopped successfully",
  "sessionId": "uuid-string"
}
```

### Get Status
```
GET /api/listen/status
```

**Response:**
```json
{
  "isListening": true,
  "sessionId": "uuid-string"
}
```

## Incoming Webhooks (Backend → Frontend)

### Audio Level Webhook
The backend sends audio level updates to the frontend webhook receiver:

**Webhook Payload:**
```json
{
  "type": "audio_level",
  "data": {
    "audioLevel": 75.5,
    "timestamp": "2024-01-01T12:00:00.000Z",
    "sessionId": "uuid-string"
  }
}
```

**Webhook Receiver Endpoint:**
```
POST /api/webhook/receive
Content-Type: application/json
```

### Listening Status Webhook
The backend can also send listening status updates:

**Webhook Payload:**
```json
{
  "type": "listening_status",
  "data": {
    "isListening": true,
    "sessionId": "uuid-string",
    "status": "active"
  }
}
```

## State Management
- **Global State**: `isListening` boolean managed in App component
- **Local State**: `isProcessing` for button loading states, `audioLevel` for real-time audio data
- **Synchronization**: Both Sidebar and VoiceInputPanel share the same listening state
- **Real-time Updates**: Audio level is received via webhooks from backend

## Audio Level Visualization
- **Real-time Updates**: Audio level updates are received via webhooks from backend
- **Visual Feedback**: Progress bar shows current audio level from 0-100%
- **Percentage Display**: Shows exact audio level percentage
- **Smooth Transitions**: CSS transitions for smooth visual updates
- **Auto-reset**: Audio level resets to 0 when listening stops

## Webhook Flow

### 1. Start Listening
1. Frontend calls `POST /api/listen/start`
2. Backend responds with `webhookUrl` for audio level updates
3. Frontend stores webhook URL for future reference

### 2. Audio Level Updates
1. Backend continuously monitors audio input
2. Backend sends webhook to frontend with audio level data
3. Frontend webhook receiver processes the data
4. Frontend updates UI with real-time audio level

### 3. Stop Listening
1. Frontend calls `POST /api/listen/stop`
2. Backend stops monitoring and sending webhooks
3. Frontend clears webhook URL and resets audio level

## Error Handling
- Network errors are caught and logged
- Failed API calls return error responses
- UI shows appropriate disabled states during processing
- Webhook validation ensures data integrity
- Audio level gracefully falls back to 0 on errors

## Configuration
To change backend URL or endpoints, modify `/src/config/backend.ts`:
```typescript
export const BACKEND_CONFIG = {
  BASE_URL: 'http://your-backend-url:port',
  WEBHOOK: {
    RECEIVER_ENDPOINT: '/api/webhook/receive',
    SECRET_KEY: 'your-secret-key',
  },
  // ... other settings
}
```

## Development Notes
- Webhook calls are made using the native `fetch` API
- All requests include timestamps for debugging
- Console logging is included for development purposes
- Error responses maintain consistent structure
- Audio level updates are initiated by backend, not requested by frontend
- Webhook receiver can handle multiple webhook types
- Signature validation is placeholder and should be implemented for production
