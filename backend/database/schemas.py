from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# Session schemas
class SessionBase(BaseModel):
    id: str
    is_active: bool = True

class SessionCreate(SessionBase):
    pass

class Session(SessionBase):
    created_at: datetime
    last_activity: datetime
    
    class Config:
        from_attributes = True

# Transcript schemas
class TranscriptBase(BaseModel):
    session_id: str
    text: str
    language: Optional[str] = None
    model: str

class TranscriptCreate(TranscriptBase):
    pass

class Transcript(TranscriptBase):
    id: int
    created_at: datetime
    processed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# LLM Result schemas
class LLMResultBase(BaseModel):
    transcript_id: int
    prompt: str
    response: str
    model: str
    processing_time: Optional[float] = None

class LLMResultCreate(LLMResultBase):
    pass

class LLMResult(LLMResultBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Combined schemas for API responses
class TranscriptWithLLMResults(Transcript):
    llm_results: List[LLMResult] = []

class SessionWithTranscripts(Session):
    transcripts: List[TranscriptWithLLMResults] = []

# API Response schemas
class DatabaseStats(BaseModel):
    total_sessions: int
    total_transcripts: int
    total_llm_results: int
    active_sessions: int
    unprocessed_transcripts: int

# Import settings schemas for backward compatibility
from schemas.settings import UserSettingsCreate, UserSettingsUpdate, UserSettings, SettingsResponse, SettingsUpdateResponse
