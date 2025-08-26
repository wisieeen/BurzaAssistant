# Database Setup

This directory contains the database setup for the Voice Assistant project.

## Database Schema

### Tables

1. **sessions** - WebSocket session management
   - `id` (TEXT, PRIMARY KEY) - Session identifier
   - `created_at` (TIMESTAMP) - When session was created
   - `last_activity` (TIMESTAMP) - Last activity timestamp
   - `is_active` (BOOLEAN) - Whether session is active

2. **transcripts** - Transcription storage
   - `id` (INTEGER, PRIMARY KEY) - Auto-incrementing ID
   - `session_id` (TEXT, FOREIGN KEY) - Reference to sessions table
   - `text` (TEXT) - Transcribed text from Whisper
   - `language` (TEXT) - Detected language code
   - `model` (TEXT) - Whisper model used
   - `created_at` (TIMESTAMP) - When transcript was created
   - `processed_at` (TIMESTAMP) - When LLM processed it (NULL if unprocessed)

3. **llm_results** - LLM processing results
   - `id` (INTEGER, PRIMARY KEY) - Auto-incrementing ID
   - `transcript_id` (INTEGER, FOREIGN KEY) - Reference to transcripts table
   - `prompt` (TEXT) - Prompt sent to LLM
   - `response` (TEXT) - LLM response
   - `model` (TEXT) - Ollama model used
   - `processing_time` (FLOAT) - Time taken in seconds
   - `created_at` (TIMESTAMP) - When result was created

## Usage

### Database Connection
```python
from database import get_db, create_tables

# Create tables (called on startup)
create_tables()

# Get database session
db = next(get_db())
```

### Database Service
```python
from services.database_service import DatabaseService

# Create service instance
db_service = DatabaseService(db)

# Create session
session = db_service.create_session("session-123")

# Create transcript
transcript = db_service.create_transcript(transcript_data)

# Get unprocessed transcripts
unprocessed = db_service.get_unprocessed_transcripts()
```

## API Endpoints

- `GET /database/stats` - Get database statistics
- `GET /database/sessions` - Get all active sessions
- `GET /database/sessions/{session_id}/transcripts` - Get session transcripts
- `GET /database/transcripts/unprocessed` - Get unprocessed transcripts
- `GET /database/transcripts/{transcript_id}/llm-results` - Get LLM results for transcript

## Database File

The SQLite database file will be created as `voice_assistant.db` in the backend directory when the application starts.
