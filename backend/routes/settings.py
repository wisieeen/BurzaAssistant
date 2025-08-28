from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any
import logging

from database import get_db
from services.settings_service import SettingsService
from schemas.settings import SettingsResponse, SettingsUpdateResponse

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/settings", tags=["settings"])

@router.get("/", response_model=SettingsResponse)
async def get_settings(db: Session = Depends(get_db)):
    """
    Get current user settings
    
    Returns:
        Current user settings or default settings if none exist
    """
    try:
        settings_service = SettingsService(db)
        settings_dict = settings_service.get_settings_dict("default")
        
        # Get the actual settings object for response
        settings_obj = settings_service.get_or_create_user_settings("default")
        
        return SettingsResponse(
            success=True,
            settings=settings_obj,
            message="Settings retrieved successfully"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get settings: {str(e)}")

@router.post("/", response_model=SettingsUpdateResponse)
async def update_settings(
    settings_data: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """
    Update user settings
    
    Args:
        settings_data: Dictionary containing settings to update
        
    Returns:
        Updated settings
    """
    try:
        settings_service = SettingsService(db)
        
        # Validate Whisper settings if provided
        if 'whisperLanguage' in settings_data:
            if not settings_service.validate_whisper_language(settings_data['whisperLanguage']):
                raise HTTPException(
                    status_code=400, 
                    detail=f"Invalid Whisper language: {settings_data['whisperLanguage']}"
                )
        
        if 'whisperModel' in settings_data:
            if not settings_service.validate_whisper_model(settings_data['whisperModel']):
                raise HTTPException(
                    status_code=400, 
                    detail=f"Invalid Whisper model: {settings_data['whisperModel']}"
                )
        
        # Update settings
        updated_settings = settings_service.update_settings_from_dict("default", settings_data)
        
        if not updated_settings:
            raise HTTPException(status_code=404, detail="Settings not found")
        
        return SettingsUpdateResponse(
            success=True,
            settings=updated_settings,
            message="Settings updated successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update settings: {str(e)}")

@router.post("/apply-temporary")
async def apply_settings_temporarily(
    settings_data: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """
    Apply LLM settings temporarily without saving to database
    
    This endpoint allows the frontend to apply LLM settings immediately
    for the current session without persisting them to the database.
    
    Args:
        settings_data: Dictionary containing LLM settings to apply temporarily
        
    Returns:
        Success response
    """
    try:
        # Only allow LLM-related settings for temporary application
        allowed_keys = ['ollamaModel', 'ollamaSummaryModel', 'ollamaMindMapModel', 'ollamaTaskPrompt', 'ollamaMindMapPrompt']
        temp_settings = {k: v for k, v in settings_data.items() if k in allowed_keys}
        
        if not temp_settings:
            raise HTTPException(
                status_code=400, 
                detail="No valid LLM settings provided for temporary application"
            )
        
        # Update the settings service with temporary values
        settings_service = SettingsService(db)
        
        # Convert frontend format to backend format
        backend_settings = {}
        if 'ollamaModel' in temp_settings:
            backend_settings['ollama_model'] = temp_settings['ollamaModel']
        if 'ollamaSummaryModel' in temp_settings:
            backend_settings['ollama_summary_model'] = temp_settings['ollamaSummaryModel']
        if 'ollamaMindMapModel' in temp_settings:
            backend_settings['ollama_mind_map_model'] = temp_settings['ollamaMindMapModel']
        if 'ollamaTaskPrompt' in temp_settings:
            backend_settings['ollama_task_prompt'] = temp_settings['ollamaTaskPrompt']
        if 'ollamaMindMapPrompt' in temp_settings:
            backend_settings['ollama_mind_map_prompt'] = temp_settings['ollamaMindMapPrompt']
        
        # Apply settings temporarily (this will update the settings service cache)
        settings_service.apply_temporary_settings(backend_settings)
        
        logger.info(f"Temporary settings applied: {list(backend_settings.keys())}")
        
        # Get summary of applied settings
        settings_summary = settings_service.get_temporary_settings_summary()
        
        return {
            "success": True,
            "message": "LLM settings applied temporarily",
            "applied_settings": list(temp_settings.keys()),
            "settings_summary": settings_summary
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to apply settings temporarily: {str(e)}")

@router.get("/whisper/languages")
async def get_whisper_languages():
    """
    Get available Whisper languages
    
    Returns:
        List of available language codes
    """
    languages = [
        {"code": "auto", "name": "Auto-detect"},
        {"code": "en", "name": "English"},
        {"code": "pl", "name": "Polish"},
        {"code": "es", "name": "Spanish"},
        {"code": "fr", "name": "French"},
        {"code": "de", "name": "German"},
        {"code": "it", "name": "Italian"},
        {"code": "pt", "name": "Portuguese"},
        {"code": "ru", "name": "Russian"},
        {"code": "ja", "name": "Japanese"},
        {"code": "ko", "name": "Korean"},
        {"code": "zh", "name": "Chinese"}
    ]
    
    return {
        "success": True,
        "languages": languages,
        "message": "Available Whisper languages retrieved"
    }

@router.get("/temporary-settings")
async def get_temporary_settings(db: Session = Depends(get_db)):
    """
    Get current temporary settings (for debugging)
    
    Returns:
        Current temporary settings
    """
    try:
        settings_service = SettingsService(db)
        summary = settings_service.get_temporary_settings_summary()
        
        return {
            "success": True,
            "temporary_settings": summary
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get temporary settings: {str(e)}")

@router.delete("/temporary-settings")
async def clear_temporary_settings(db: Session = Depends(get_db)):
    """
    Clear all temporary settings
    
    Returns:
        Success response
    """
    try:
        settings_service = SettingsService(db)
        settings_service.clear_temporary_settings()
        
        return {
            "success": True,
            "message": "Temporary settings cleared"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear temporary settings: {str(e)}")

@router.get("/whisper/models")
async def get_whisper_models():
    """
    Get available Whisper models
    
    Returns:
        List of available model information
    """
    models = [
        {"id": "tiny", "name": "Tiny (39M)", "description": "Fastest, least accurate"},
        {"id": "base", "name": "Base (74M)", "description": "Good balance of speed and accuracy"},
        {"id": "small", "name": "Small (244M)", "description": "Better accuracy, slower"},
        {"id": "medium", "name": "Medium (769M)", "description": "High accuracy, slower"},
        {"id": "large", "name": "Large (1550M)", "description": "Best accuracy, slowest"}
    ]
    
    return {
        "success": True,
        "models": models,
        "message": "Available Whisper models retrieved"
    }
