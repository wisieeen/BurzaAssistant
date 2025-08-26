# Backend Webhook Implementation Example

## Overview
This document provides examples of how your FastAPI backend can implement webhook sending to the frontend for real-time audio level updates.

## Webhook Sending from Backend

### 1. Basic Webhook Sender Function

```python
import httpx
import asyncio
from typing import Dict, Any
import json

class WebhookSender:
    def __init__(self, frontend_url: str = "http://localhost:5173"):
        self.frontend_url = frontend_url
        self.webhook_endpoint = f"{frontend_url}/api/webhook/receive"
    
    async def send_audio_level_webhook(
        self, 
        audio_level: float, 
        session_id: str = None
    ):
        """Send audio level update to frontend"""
        webhook_data = {
            "type": "audio_level",
            "data": {
                "audioLevel": audio_level,
                "timestamp": datetime.utcnow().isoformat(),
                "sessionId": session_id
            }
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.webhook_endpoint,
                    json=webhook_data,
                    headers={"Content-Type": "application/json"},
                    timeout=5.0
                )
                
                if response.status_code == 200:
                    print(f"Audio level webhook sent successfully: {audio_level}%")
                else:
                    print(f"Failed to send webhook: {response.status_code}")
                    
        except Exception as e:
            print(f"Error sending webhook: {e}")
    
    async def send_listening_status_webhook(
        self, 
        is_listening: bool, 
        session_id: str = None,
        status: str = "active"
    ):
        """Send listening status update to frontend"""
        webhook_data = {
            "type": "listening_status",
            "data": {
                "isListening": is_listening,
                "sessionId": session_id,
                "status": status
            }
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.webhook_endpoint,
                    json=webhook_data,
                    headers={"Content-Type": "application/json"},
                    timeout=5.0
                )
                
                if response.status_code == 200:
                    print(f"Status webhook sent successfully: {status}")
                else:
                    print(f"Failed to send status webhook: {response.status_code}")
                    
        except Exception as e:
            print(f"Error sending status webhook: {e}")
```

### 2. Integration with Audio Processing

```python
import asyncio
import numpy as np
from audio_processing import AudioProcessor  # Your audio processing module

class AudioListener:
    def __init__(self):
        self.webhook_sender = WebhookSender()
        self.audio_processor = AudioProcessor()
        self.is_listening = False
        self.session_id = None
    
    async def start_listening(self):
        """Start listening and sending audio level webhooks"""
        self.is_listening = True
        self.session_id = str(uuid.uuid4())
        
        # Send initial status webhook
        await self.webhook_sender.send_listening_status_webhook(
            is_listening=True, 
            session_id=self.session_id
        )
        
        # Start audio level monitoring loop
        asyncio.create_task(self._monitor_audio_level())
    
    async def stop_listening(self):
        """Stop listening and send final webhook"""
        self.is_listening = False
        
        # Send final status webhook
        await self.webhook_sender.send_listening_status_webhook(
            is_listening=False, 
            session_id=self.session_id
        )
        
        self.session_id = None
    
    async def _monitor_audio_level(self):
        """Monitor audio level and send webhooks"""
        while self.is_listening:
            try:
                # Get current audio level (0-100)
                audio_level = self.audio_processor.get_current_level()
                
                # Send webhook with audio level
                await self.webhook_sender.send_audio_level_webhook(
                    audio_level, 
                    self.session_id
                )
                
                # Wait before next update (adjust frequency as needed)
                await asyncio.sleep(0.1)  # 100ms intervals
                
            except Exception as e:
                print(f"Error in audio level monitoring: {e}")
                await asyncio.sleep(1.0)  # Wait longer on error
```

### 3. FastAPI Endpoint Integration

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import asyncio

app = FastAPI()

# Initialize audio listener
audio_listener = AudioListener()

class ListenRequest(BaseModel):
    timestamp: str

class ListenResponse(BaseModel):
    success: bool
    message: str
    sessionId: str
    webhookUrl: str

@app.post("/api/listen/start")
async def start_listening(request: ListenRequest):
    try:
        await audio_listener.start_listening()
        
        return ListenResponse(
            success=True,
            message="Listening started successfully",
            sessionId=audio_listener.session_id,
            webhookUrl=f"{app.base_url}/api/webhook/receive"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/listen/stop")
async def stop_listening(request: ListenRequest):
    try:
        await audio_listener.stop_listening()
        
        return {
            "success": True,
            "message": "Listening stopped successfully",
            "sessionId": audio_listener.session_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/listen/status")
async def get_listening_status():
    return {
        "isListening": audio_listener.is_listening,
        "sessionId": audio_listener.session_id
    }
```

### 4. Real-time Audio Level Calculation

```python
import numpy as np
import pyaudio
import threading
import time

class AudioProcessor:
    def __init__(self):
        self.audio = pyaudio.PyAudio()
        self.current_level = 0.0
        self.is_monitoring = False
        self.monitor_thread = None
        
    def get_current_level(self) -> float:
        """Get current audio level as percentage (0-100)"""
        return self.current_level
    
    def start_monitoring(self):
        """Start real-time audio level monitoring"""
        if self.is_monitoring:
            return
            
        self.is_monitoring = True
        self.monitor_thread = threading.Thread(target=self._monitor_audio)
        self.monitor_thread.daemon = True
        self.monitor_thread.start()
    
    def stop_monitoring(self):
        """Stop audio level monitoring"""
        self.is_monitoring = False
        if self.monitor_thread:
            self.monitor_thread.join()
    
    def _monitor_audio(self):
        """Monitor audio input and calculate levels"""
        chunk = 1024
        format = pyaudio.paFloat32
        channels = 1
        rate = 44100
        
        stream = self.audio.open(
            format=format,
            channels=channels,
            rate=rate,
            input=True,
            frames_per_buffer=chunk
        )
        
        try:
            while self.is_monitoring:
                data = stream.read(chunk, exception_on_overflow=False)
                audio_data = np.frombuffer(data, dtype=np.float32)
                
                # Calculate RMS (Root Mean Square) for audio level
                rms = np.sqrt(np.mean(audio_data**2))
                
                # Convert to percentage (0-100)
                # Adjust sensitivity as needed
                level = min(100.0, (rms * 1000) * 100)
                
                self.current_level = level
                time.sleep(0.01)  # 10ms intervals for smooth updates
                
        finally:
            stream.stop_stream()
            stream.close()
```

## Webhook Configuration

### Frontend Webhook Receiver URL
The frontend expects webhooks at:
```
http://localhost:5173/api/webhook/receive
```

### Webhook Data Format
All webhooks should follow this structure:
```json
{
  "type": "webhook_type",
  "data": {
    // Type-specific data
  }
}
```

### Supported Webhook Types
1. **audio_level**: Real-time audio level updates
2. **listening_status**: Listening state changes

## Error Handling

### Network Issues
- Implement retry logic for failed webhook sends
- Log failed webhook attempts
- Gracefully handle frontend unavailability

### Data Validation
- Validate audio level ranges (0-100)
- Ensure required fields are present
- Handle malformed data gracefully

## Performance Considerations

### Webhook Frequency
- Audio level: 100ms intervals (adjustable)
- Status updates: Only on state changes
- Avoid overwhelming the frontend

### Async Processing
- Use async/await for non-blocking webhook sends
- Implement connection pooling for HTTP clients
- Handle multiple concurrent webhook sends

## Security Notes

### Webhook Validation
- Implement signature validation if needed
- Use HTTPS in production
- Validate webhook payloads

### Rate Limiting
- Implement rate limiting for webhook sends
- Prevent abuse of webhook endpoints
- Monitor webhook usage patterns
