from sqlalchemy.orm import Session as DBSession
from typing import Dict, Any, Optional
from datetime import datetime

from database.models import UserSettings
from schemas.settings import UserSettingsCreate, UserSettingsUpdate
from services.database_service import DatabaseService

class SettingsService:
    """
    Service for handling user settings management
    
    Provides methods for managing user preferences for transcription and LLM processing
    """
    
    def __init__(self, db: DBSession):
        self.db = db
        self.db_service = DatabaseService(db)
    
    def get_user_settings(self, user_id: str = "default") -> Optional[UserSettings]:
        """
        Get user settings by user ID
        
        Args:
            user_id: User ID (defaults to "default" for single-user setup)
            
        Returns:
            UserSettings object or None if not found
        """
        return self.db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
    
    def create_user_settings(self, user_id: str = "default") -> UserSettings:
        """
        Create default user settings
        
        Args:
            user_id: User ID (defaults to "default" for single-user setup)
            
        Returns:
            Created UserSettings object
        """
        default_settings = UserSettings(
            user_id=user_id,
            whisper_language="auto",
            whisper_model="base",
            ollama_model="artifish/llama3.2-uncensored:latest",
            ollama_task_prompt="Please analyze the following transcript and provide insights:\n\nTRANSCRIPT:\n{transcript}\n\nPlease provide:\n1. A brief summary of the main topics discussed\n2. Key points or important information mentioned\n3. Any questions, concerns, or action items identified\n4. Overall sentiment or tone of the conversation\n\nPlease be concise but thorough in your analysis.",
            ollama_mind_map_prompt="Please analyze the following transcript and create a mind map of concepts and relationships.\n\nTRANSCRIPT:\n{transcript}\n\nCreate a mind map in JSON format with the following structure:\n{\n  \"nodes\": [\n    {\n      \"id\": \"unique_id_1\",\n      \"label\": \"Main Topic\",\n      \"type\": \"topic\"\n    },\n    {\n      \"id\": \"unique_id_2\", \n      \"label\": \"Related Concept\",\n      \"type\": \"concept\"\n    }\n  ],\n  \"edges\": [\n    {\n      \"id\": \"edge_1\",\n      \"source\": \"unique_id_1\",\n      \"target\": \"unique_id_2\",\n      \"label\": \"relates to\",\n      \"type\": \"relationship\"\n    }\n  ]\n}\n\nGuidelines:\n- Extract key concepts, topics, entities, and ideas from the transcript\n- Create meaningful relationships between concepts\n- Use descriptive labels for nodes and edges\n- Focus on the most important concepts mentioned\n- Keep the structure logical and hierarchical\n- Return ONLY valid JSON, no additional text\n\nReturn the mind map as a valid JSON object:",
            voice_chunk_length=500,
            voice_chunks_number=10,
            active_session_id=None
        )
        
        self.db.add(default_settings)
        self.db.commit()
        self.db.refresh(default_settings)
        return default_settings
    
    def get_or_create_user_settings(self, user_id: str = "default") -> UserSettings:
        """
        Get user settings or create default if not exists
        
        Args:
            user_id: User ID (defaults to "default" for single-user setup)
            
        Returns:
            UserSettings object
        """
        settings = self.get_user_settings(user_id)
        if not settings:
            settings = self.create_user_settings(user_id)
        return settings
    
    def update_user_settings(self, user_id: str, settings_data: Dict[str, Any]) -> Optional[UserSettings]:
        """
        Update user settings
        
        Args:
            user_id: User ID
            settings_data: Dictionary containing settings to update
            
        Returns:
            Updated UserSettings object or None if not found
        """
        settings = self.get_user_settings(user_id)
        if not settings:
            return None
        
        # Update only provided fields
        for key, value in settings_data.items():
            if hasattr(settings, key) and value is not None:
                setattr(settings, key, value)
        
        settings.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(settings)
        return settings
    
    def validate_whisper_language(self, language: str) -> bool:
        """
        Validate Whisper language code
        
        Args:
            language: Language code to validate
            
        Returns:
            True if valid, False otherwise
        """
        valid_languages = [
            'auto', 'en', 'pl', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'
        ]
        return language in valid_languages
    
    def validate_whisper_model(self, model: str) -> bool:
        """
        Validate Whisper model name
        
        Args:
            model: Model name to validate
            
        Returns:
            True if valid, False otherwise
        """
        valid_models = ['tiny', 'base', 'small', 'medium', 'large']
        return model in valid_models
    
    def get_settings_dict(self, user_id: str = "default") -> Dict[str, Any]:
        """
        Get user settings as dictionary
        
        Args:
            user_id: User ID (defaults to "default" for single-user setup)
            
        Returns:
            Dictionary containing all settings
        """
        settings = self.get_or_create_user_settings(user_id)
        return {
            'whisperLanguage': settings.whisper_language,
            'whisperModel': settings.whisper_model,
            'ollamaModel': settings.ollama_model,
            'ollamaTaskPrompt': settings.ollama_task_prompt,
            'voiceChunkLength': settings.voice_chunk_length,
            'voiceChunksNumber': settings.voice_chunks_number,
            'activeSessionId': settings.active_session_id
        }
    
    def update_settings_from_dict(self, user_id: str, settings_dict: Dict[str, Any]) -> Optional[UserSettings]:
        """
        Update settings from frontend dictionary format
        
        Args:
            user_id: User ID
            settings_dict: Dictionary in frontend format
            
        Returns:
            Updated UserSettings object or None if not found
        """
        # Convert frontend format to backend format
        backend_settings = {}
        
        if 'whisperLanguage' in settings_dict:
            backend_settings['whisper_language'] = settings_dict['whisperLanguage']
        
        if 'whisperModel' in settings_dict:
            backend_settings['whisper_model'] = settings_dict['whisperModel']
        
        if 'ollamaModel' in settings_dict:
            backend_settings['ollama_model'] = settings_dict['ollamaModel']
        
        if 'ollamaTaskPrompt' in settings_dict:
            backend_settings['ollama_task_prompt'] = settings_dict['ollamaTaskPrompt']
        
        if 'voiceChunkLength' in settings_dict:
            backend_settings['voice_chunk_length'] = settings_dict['voiceChunkLength']
        
        if 'voiceChunksNumber' in settings_dict:
            backend_settings['voice_chunks_number'] = settings_dict['voiceChunksNumber']
        
        if 'activeSessionId' in settings_dict:
            backend_settings['active_session_id'] = settings_dict['activeSessionId']
        
        return self.update_user_settings(user_id, backend_settings)
