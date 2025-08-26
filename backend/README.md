# Backend - FastAPI + SQLite + Whisper + Ollama

## Overview
A comprehensive voice assistant backend that provides real-time transcription, LLM analysis, session management, and mind map generation using FastAPI, SQLite, OpenAI Whisper, and Ollama.

## Setup Instructions

### 1. Virtual Environment
The virtual environment is already created. To activate it:
```bash
# Windows PowerShell
.\venv\Scripts\Activate.ps1

# Windows Command Prompt
.\venv\Scripts\activate.bat

# Linux/Mac
source venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Start Ollama (Required for LLM features)
```bash
# Install Ollama from https://ollama.ai/
# Then start the service
ollama serve

# Pull a model (e.g., Llama 3.2)
ollama pull artifish/llama3.2-uncensored:latest
```

### 4. Run Development Server
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Project Structure
```
backend/
├── venv/                 # Python virtual environment
├── requirements.txt      # Python dependencies
├── main.py              # FastAPI application entry point
├── models/              # Database models
├── schemas/             # Pydantic schemas
├── routes/              # API routes
│   ├── transcription.py # Transcription endpoints
│   ├── llm.py          # LLM processing endpoints
│   ├── sessions.py     # Session management
│   ├── settings.py     # Settings management
│   ├── mind_maps.py    # Mind map generation
│   ├── database.py     # Database operations
│   └── websocket.py    # WebSocket communication
├── services/            # Business logic services
│   ├── whisper_service.py  # Whisper transcription service
│   ├── llm_service.py      # LLM processing service
│   ├── database_service.py # Database operations service
│   ├── settings_service.py # Settings management service
│   └── websocket_service.py # WebSocket communication service
├── database/            # Database configuration
├── tasks/               # Background tasks
└── README.md           # This file
```

## Features

### Whisper Transcription
- **Audio File Upload**: Upload audio files for transcription
- **Real-time Streaming**: WebSocket-based real-time audio processing
- **Multiple Formats**: Supports MP3, MP4, M4A, WAV, MPEG, MPGA, WEBM, OGG
- **Language Detection**: Auto-detect or specify language
- **Model Selection**: Choose from different Whisper models (tiny, base, small, medium, large)

### LLM Integration (Ollama)
- **Local LLM Processing**: Uses Ollama for local LLM inference
- **Session Analysis**: Process transcripts to generate insights and summaries
- **Mind Map Generation**: Create concept maps from session content
- **Background Processing**: Process transcripts asynchronously
- **Model Management**: Support for multiple Ollama models

### Session Management
- **Session Creation**: Create and manage recording sessions
- **Content Organization**: Organize transcripts and LLM results by session
- **Session Switching**: Switch between different sessions seamlessly
- **Content Management**: View, update, and delete session content
- **Session Persistence**: All session data stored in SQLite database

### Settings Management
- **Whisper Configuration**: Configure language and model settings
- **LLM Configuration**: Configure Ollama model and custom prompts
- **Audio Processing**: Configure chunk length and processing parameters
- **Session Settings**: Manage active session and preferences
- **Settings Persistence**: All settings stored in database

### Real-time Communication
- **WebSocket Support**: Real-time audio streaming and transcription
- **Live Updates**: Real-time transcription and analysis updates
- **Session-aware**: WebSocket connections are session-aware
- **Error Handling**: Comprehensive error handling and recovery

## API Endpoints

### Core Endpoints
- `GET /` - API root with feature list
- `GET /health` - Overall API health check

### Transcription
- `POST /api/transcription/test` - Test transcription with uploaded audio file
- `POST /api/transcription/` - Transcribe audio from uploaded file

### LLM Processing
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

## Dependencies
- **FastAPI**: Modern web framework for building APIs
- **Uvicorn**: ASGI server for running FastAPI
- **SQLAlchemy**: ORM for database operations
- **Pydantic**: Data validation using Python type annotations
- **python-multipart**: For handling form data
- **python-dotenv**: For environment variable management
- **openai-whisper**: OpenAI's speech recognition model
- **torch**: PyTorch for machine learning operations
- **numpy**: Numerical computing library
- **websockets**: WebSocket support for real-time communication
- **pydub**: Audio processing library
- **langchain**: LangChain framework for LLM integration
- **langchain-community**: Community integrations for LangChain
- **langchain-core**: Core LangChain functionality
- **ollama**: Python client for Ollama

## Database Schema
The application uses SQLite with the following main tables:
- **sessions**: Session management and metadata
- **transcripts**: Stored transcription results
- **llm_results**: LLM processing results and analysis
- **mind_maps**: Generated mind map data
- **user_settings**: User configuration and preferences

## Development
- **API Documentation**: Available at http://localhost:8000/docs
- **Interactive Testing**: Use the Swagger UI for testing endpoints
- **Database**: SQLite database file created automatically
- **Logging**: Comprehensive logging for debugging and monitoring
