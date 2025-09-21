from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from services.whisper_service import WhisperService
from services.database_service import DatabaseService
from services.llm_service import LLMService
from services.settings_service import SettingsService
from database.schemas import TranscriptCreate
from database.database import get_db
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
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
async def transcribe_audio(
    file: UploadFile = File(...),
    session_id: Optional[str] = Form(None),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Transcribe audio from uploaded file and save to database
    """
    try:
        # Read the uploaded file
        audio_data = await file.read()
        logger.info(f"Received audio file: {len(audio_data)} bytes")
        
        # Create Whisper service
        whisper_service = WhisperService()
        
        # Transcribe the audio
        result = whisper_service.transcribe_audio_bytes(audio_data)
        
        # If transcription was successful and we have a session ID, save to database
        if result['success'] and result['text'].strip() and session_id:
            try:
                # Create database services
                db_service = DatabaseService(db)
                settings_service = SettingsService(db)
                
                # Create transcript data
                transcript_data = TranscriptCreate(
                    session_id=session_id,
                    text=result['text'],
                    language=result.get('language'),
                    model=result.get('model', 'base')
                )
                
                # Save transcript to database
                transcript = db_service.create_transcript(transcript_data)
                logger.info(f"Transcript saved to database: ID {transcript.id}")
                
                # Trigger LLM processing
                try:
                    llm_service = LLMService(db_service, settings_service)
                    
                    # Process the transcript with LLM
                    llm_result = llm_service.process_transcript(transcript.id, transcript.text)
                    
                    if llm_result:
                        # Save LLM result to database
                        db_service.create_llm_result(llm_result)
                        
                        # Mark transcript as processed
                        db_service.mark_transcript_processed(transcript.id)
                        
                        logger.info(f"LLM processing completed for transcript {transcript.id}")
                        
                        # Add LLM result info to response
                        result['llm_processed'] = True
                        result['llm_result_id'] = llm_result.transcript_id
                    else:
                        logger.warning(f"LLM processing failed for transcript {transcript.id}")
                        result['llm_processed'] = False
                        
                except Exception as llm_error:
                    logger.error(f"LLM processing error: {llm_error}")
                    result['llm_processed'] = False
                    result['llm_error'] = str(llm_error)
                
                # Add database info to response
                result['transcript_id'] = transcript.id
                result['saved_to_database'] = True
                
            except Exception as db_error:
                logger.error(f"Database operation failed: {db_error}")
                result['saved_to_database'] = False
                result['database_error'] = str(db_error)
        elif result['success'] and result['text'].strip():
            # Transcription successful but no session ID provided
            logger.info("Transcription successful but no session ID provided - not saving to database")
            result['saved_to_database'] = False
            result['message'] = 'Transcription completed but not saved to database (no session ID)'
        else:
            # Transcription failed
            result['saved_to_database'] = False
        
        return result
        
    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
