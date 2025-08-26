from fastapi import APIRouter, HTTPException, UploadFile, File
from services.whisper_service import WhisperService
from typing import Dict, Any
import logging

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/transcription", tags=["transcription"])

@router.post("/test")
async def test_transcription(file: UploadFile = File(...)) -> Dict[str, Any]:
    """
    Test endpoint to verify Whisper transcription is working
    """
    try:
        # Read the uploaded file
        audio_data = await file.read()
        logger.info(f"Received test audio file: {len(audio_data)} bytes")
        
        # Create Whisper service
        whisper_service = WhisperService()
        
        # Transcribe the audio
        result = whisper_service.transcribe_audio_bytes(audio_data)
        
        logger.info(f"Test transcription result: {result}")
        
        return {
            "success": True,
            "result": result
        }
        
    except Exception as e:
        logger.error(f"Test transcription failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/")
async def transcribe_audio(file: UploadFile = File(...)) -> Dict[str, Any]:
    """
    Transcribe audio from uploaded file
    """
    try:
        # Read the uploaded file
        audio_data = await file.read()
        logger.info(f"Received audio file: {len(audio_data)} bytes")
        
        # Create Whisper service
        whisper_service = WhisperService()
        
        # Transcribe the audio
        result = whisper_service.transcribe_audio_bytes(audio_data)
        
        return result
        
    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
