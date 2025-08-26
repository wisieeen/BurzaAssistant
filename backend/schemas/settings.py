from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class UserSettingsBase(BaseModel):
    """Base settings schema"""
    whisper_language: str = Field(default="auto", description="Whisper language code or 'auto' for auto-detection")
    whisper_model: str = Field(default="base", description="Whisper model to use")
    ollama_model: str = Field(default="artifish/llama3.2-uncensored:latest", description="Ollama model to use")
    ollama_task_prompt: Optional[str] = Field(default=None, description="Custom prompt template for LLM analysis")
    ollama_mind_map_prompt: Optional[str] = Field(default=None, description="Custom prompt template for mind map generation")
    voice_chunk_length: int = Field(default=500, description="Voice chunk length in milliseconds")
    voice_chunks_number: int = Field(default=40, description="Number of chunks to accumulate before processing")
    active_session_id: Optional[str] = Field(default=None, description="Active session ID")

class UserSettingsCreate(UserSettingsBase):
    """Schema for creating user settings"""
    user_id: str = Field(default="default", description="User ID")

class UserSettingsUpdate(UserSettingsBase):
    """Schema for updating user settings"""
    pass

class UserSettings(UserSettingsBase):
    """Schema for user settings response"""
    id: int
    user_id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class SettingsResponse(BaseModel):
    """Response schema for settings API"""
    success: bool
    settings: UserSettings
    message: str = "Settings retrieved successfully"

class SettingsUpdateResponse(BaseModel):
    """Response schema for settings update API"""
    success: bool
    settings: UserSettings
    message: str = "Settings updated successfully"
