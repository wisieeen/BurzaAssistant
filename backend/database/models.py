from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Float, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database.database import Base

class Session(Base):
    """
    WebSocket session model
    
    Stores information about active WebSocket connections
    """
    __tablename__ = "sessions"
    
    id = Column(String, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_activity = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    is_active = Column(Boolean, default=True)
    name = Column(String, nullable=True)  # Session name for better identification
    description = Column(Text, nullable=True)  # Optional session description
    
    # Relationships
    transcripts = relationship("Transcript", back_populates="session")

class UserSettings(Base):
    """
    User settings model
    
    Stores user preferences for transcription and LLM processing
    """
    __tablename__ = "user_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, default="default")  # For future multi-user support
    whisper_language = Column(String, default="auto")
    whisper_model = Column(String, default="base")
    ollama_model = Column(String, default="artifish/llama3.2-uncensored:latest")
    ollama_summary_model = Column(String, default="artifish/llama3.2-uncensored:latest")
    ollama_mind_map_model = Column(String, default="artifish/llama3.2-uncensored:latest")
    ollama_task_prompt = Column(Text, nullable=True)
    ollama_mind_map_prompt = Column(Text, nullable=True)
    voice_chunk_length = Column(Integer, default=500)
    voice_chunks_number = Column(Integer, default=40)
    active_session_id = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Transcript(Base):
    """
    Transcription model
    
    Stores all transcription results from Whisper
    """
    __tablename__ = "transcripts"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("sessions.id"), nullable=False)
    text = Column(Text, nullable=False)
    language = Column(String, nullable=True)
    model = Column(String, nullable=True)  # Whisper model used
    confidence = Column(Float, nullable=True)
    processing_time = Column(Float, nullable=True)
    processed_at = Column(DateTime(timezone=True), nullable=True)  # When LLM processing completed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    session = relationship("Session", back_populates="transcripts")
    llm_results = relationship("LLMResult", back_populates="transcript")

class LLMResult(Base):
    """
    LLM processing result model
    
    Stores results from LangChain + Ollama processing
    """
    __tablename__ = "llm_results"
    
    id = Column(Integer, primary_key=True, index=True)
    transcript_id = Column(Integer, ForeignKey("transcripts.id"), nullable=False)
    prompt = Column(Text, nullable=False)  # The prompt sent to LLM
    response = Column(Text, nullable=False)  # LLM response
    model = Column(String(50), nullable=False)  # Ollama model used
    processing_time = Column(Float, nullable=True)  # Time taken in seconds
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    transcript = relationship("Transcript", back_populates="llm_results")

class MindMap(Base):
    """
    Mind map model
    
    Stores mind map data generated from session transcripts
    """
    __tablename__ = "mind_maps"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("sessions.id"), nullable=False)
    nodes = Column(Text, nullable=False)  # JSON string of mind map nodes
    edges = Column(Text, nullable=False)  # JSON string of mind map edges
    prompt = Column(Text, nullable=False)  # The prompt sent to LLM
    model = Column(String(50), nullable=False)  # Ollama model used
    processing_time = Column(Float, nullable=True)  # Time taken in seconds
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    session = relationship("Session")
