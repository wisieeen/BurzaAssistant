from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class SessionBase(BaseModel):
    """Base session schema"""
    id: str = Field(..., description="Unique session identifier")
    name: Optional[str] = Field(None, description="Session name")
    description: Optional[str] = Field(None, description="Session description")
    is_active: bool = Field(default=True, description="Whether the session is active")

class SessionCreate(SessionBase):
    """Schema for creating a new session"""
    pass

class SessionUpdate(BaseModel):
    """Schema for updating a session"""
    name: Optional[str] = Field(None, description="Session name")
    description: Optional[str] = Field(None, description="Session description")
    is_active: Optional[bool] = Field(None, description="Whether the session is active")

class Session(SessionBase):
    """Schema for session response"""
    created_at: datetime
    last_activity: datetime
    
    class Config:
        from_attributes = True

class SessionResponse(BaseModel):
    """Response schema for single session"""
    success: bool
    session: Session
    message: str = "Session retrieved successfully"

class SessionListResponse(BaseModel):
    """Response schema for session list"""
    success: bool
    sessions: List[Session]
    total: int
    message: str = "Sessions retrieved successfully"

class SessionSummary(BaseModel):
    session_id: str
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: bool
    created_at: datetime
    last_activity: datetime
    transcript_count: int
    llm_result_count: int
    total_audio_duration: float
    average_processing_time: float

class SessionSummaryResponse(BaseModel):
    """Response schema for session summary"""
    success: bool
    summary: SessionSummary
    message: str

# Transcript and LLM Result Schemas
class TranscriptSchema(BaseModel):
    """Schema for transcript data"""
    id: int
    session_id: str
    text: str
    language: Optional[str] = None
    model: Optional[str] = None
    confidence: Optional[float] = None
    processing_time: Optional[float] = None
    processed_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class LLMResultSchema(BaseModel):
    """Schema for LLM result data"""
    id: int
    transcript_id: int
    prompt: str
    response: str
    model: str
    processing_time: Optional[float] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# Session Content Response Schemas
class SessionTranscriptResponse(BaseModel):
    success: bool
    transcripts: List[TranscriptSchema]
    total: int
    message: str

class SessionLLMResultsResponse(BaseModel):
    success: bool
    llm_results: List[LLMResultSchema]
    total: int
    message: str
