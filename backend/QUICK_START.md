# Backend Quick Start Guide

## Prerequisites
- Python 3.8+ installed
- Windows PowerShell or Command Prompt
- Ollama installed and running (for LLM features)

## Quick Setup

### 1. Activate Virtual Environment
```bash
# PowerShell
.\venv\Scripts\Activate.ps1

# Command Prompt
.\venv\Scripts\activate.bat
```

### 2. Verify Installation
```bash
python test_whisper.py
```

### 3. Start the Server
```bash
# Option 1: Using the batch file
.\start-backend.bat

# Option 2: Direct command
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Access the API
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health
- **Root Endpoint**: http://localhost:8000/

## Available Endpoints

### Core Endpoints
- `GET /` - API root with feature list
- `GET /health` - Overall API health check

### Transcription Endpoints
- `POST /api/transcription/test` - Test transcription with uploaded audio file
- `POST /api/transcription/` - Transcribe audio from uploaded file

### LLM Endpoints
- `GET /llm/model-info` - Get LLM model information and Ollama connection status
- `GET /llm/models` - Get list of available Ollama models
- `POST /llm/process-transcript/{transcript_id}` - Process a single transcript
- `POST /llm/process-all` - Process all unprocessed transcripts
- `POST /llm/process-all-background` - Process transcripts in background
- `POST /llm/process-session/{session_id}` - Process all transcripts from a session
- `GET /llm/health` - LLM service health check

### Session Management
- `GET /api/sessions/` - Get all sessions (with optional filtering)
- `GET /api/sessions/{session_id}` - Get specific session details
- `POST /api/sessions/` - Create a new session
- `PUT /api/sessions/{session_id}` - Update a session
- `DELETE /api/sessions/{session_id}` - Delete (deactivate) a session
- `POST /api/sessions/{session_id}/activate` - Activate a session
- `PATCH /api/sessions/{session_id}/name` - Update session name
- `GET /api/sessions/{session_id}/summary` - Get session summary

### Session Content
- `GET /api/sessions/{session_id}/transcripts` - Get session transcripts
- `GET /api/sessions/{session_id}/llm-results` - Get session LLM results
- `DELETE /api/sessions/{session_id}/content` - Erase session content

### Mind Maps
- `POST /api/sessions/{session_id}/mind-maps` - Generate mind map for session
- `GET /api/sessions/{session_id}/mind-maps` - Get session mind maps
- `DELETE /api/sessions/{session_id}/mind-maps/{mind_map_id}` - Delete mind map

### Settings
- `GET /api/settings/` - Get current user settings
- `POST /api/settings/` - Update user settings
- `GET /api/settings/whisper/languages` - Get available Whisper languages
- `GET /api/settings/whisper/models` - Get available Whisper models

### Database
- `GET /api/database/stats` - Get database statistics
- `POST /api/database/reset` - Reset database (clear all data)

### WebSocket
- `WS /ws/audio` - WebSocket endpoint for real-time audio streaming

## Testing the API

### Using the Interactive Docs
1. Go to http://localhost:8000/docs
2. Click on any endpoint to expand it
3. Click "Try it out" to test the endpoint
4. Upload an audio file or provide parameters
5. Click "Execute" to run the request

### Using curl (examples)
```bash
# Health check
curl http://localhost:8000/health

# Get LLM model info
curl http://localhost:8000/llm/model-info

# Get available sessions
curl http://localhost:8000/api/sessions/

# Get settings
curl http://localhost:8000/api/settings/

# Upload audio file for transcription
curl -X POST "http://localhost:8000/api/transcription/" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@path/to/audio.wav"
```

## Features

### Whisper Transcription
- **Audio File Upload**: Upload audio files for transcription
- **Multiple Formats**: Supports MP3, MP4, M4A, WAV, MPEG, MPGA, WEBM, OGG
- **Language Detection**: Auto-detect or specify language
- **Model Selection**: Choose from different Whisper models

### LLM Integration
- **Ollama Integration**: Uses Ollama for local LLM processing
- **Session Analysis**: Process transcripts to generate insights
- **Mind Map Generation**: Create concept maps from session content
- **Background Processing**: Process transcripts asynchronously

### Session Management
- **Session Creation**: Create and manage recording sessions
- **Content Organization**: Organize transcripts and LLM results by session
- **Session Switching**: Switch between different sessions
- **Content Management**: View, update, and delete session content

### Settings Management
- **Whisper Configuration**: Configure language and model settings
- **LLM Configuration**: Configure Ollama model and prompts
- **Audio Processing**: Configure chunk length and processing parameters
- **Session Settings**: Manage active session and preferences

## Troubleshooting

### Common Issues
1. **Port already in use**: Change port in the uvicorn command
2. **Whisper model download**: First run may take time to download the model
3. **Memory issues**: Use smaller Whisper models (tiny, base) for limited RAM
4. **Ollama not running**: Start Ollama service before using LLM features
5. **Database issues**: Check database file permissions and disk space

### Logs
- Check console output for detailed error messages
- Whisper service logs are displayed during initialization
- LLM service logs show Ollama connection status
- WebSocket logs show real-time communication status

### Database
- SQLite database file: `voice_assistant.db`
- Database is automatically created on first run
- Use `/api/database/reset` to clear all data if needed
