from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class TranscriptionRequest(BaseModel):
    """Schema for transcription request"""
    language: Optional[str] = Field(
        default=None, 
        description="Language code (e.g., 'en', 'es', 'fr'). If not provided, Whisper will auto-detect."
    )
    model: Optional[str] = Field(
        default="base",
        description="Whisper model to use: 'tiny', 'base', 'small', 'medium', 'large'"
    )

class TranscriptionSegment(BaseModel):
    """Schema for transcription segment"""
    id: int
    start: float
    end: float
    text: str
    tokens: List[int]
    temperature: float
    avg_logprob: float
    compression_ratio: float
    no_speech_prob: float

class TranscriptionResponse(BaseModel):
    """Schema for transcription response"""
    success: bool
    text: str = Field(description="Transcribed text")
    language: str = Field(description="Detected language code")
    segments: List[TranscriptionSegment] = Field(description="Detailed transcription segments")
    model: str = Field(description="Model used for transcription")
    error: Optional[str] = Field(default=None, description="Error message if transcription failed")

class ModelInfoResponse(BaseModel):
    """Schema for model information response"""
    model_name: str
    available_models: List[str]
    loaded: bool
    
    model_config = {
        'protected_namespaces': ()
    }
