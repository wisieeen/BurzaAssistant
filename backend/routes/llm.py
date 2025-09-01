from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Dict, Any

from database import get_db
from services.database_service import DatabaseService
from services.llm_service import LLMService
from services.settings_service import SettingsService

# Create router
router = APIRouter(prefix="/llm", tags=["llm"])

@router.get("/model-info")
async def get_llm_model_info(db: Session = Depends(get_db)):
    """
    Get information about the LLM model and Ollama connection
    
    Returns:
        Model information including availability and status
    """
    try:
        db_service = DatabaseService(db)
        settings_service = SettingsService(db)
        llm_service = LLMService(db_service, settings_service)
        model_info = llm_service.get_model_info()
        return model_info
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get model info: {str(e)}")

@router.get("/models")
async def get_available_models(db: Session = Depends(get_db)):
    """
    Get list of available Ollama models
    
    Returns:
        List of available models with their details
    """
    try:
        db_service = DatabaseService(db)
        settings_service = SettingsService(db)
        llm_service = LLMService(db_service, settings_service)
        model_info = llm_service.get_model_info()
        
        # Extract models from the model info
        all_models = model_info.get('all_models', [])
        
        # Format models for frontend consumption
        models = []
        for model_name in all_models:
            # Parse model name to extract base name and tag
            parts = model_name.split(':')
            base_name = parts[0] if parts else model_name
            tag = parts[1] if len(parts) > 1 else 'latest'
            
            # Try to get model size if available
            try:
                import ollama
                model_details = ollama.show(model_name)
                size = model_details.get('size', 'Unknown')
            except:
                size = 'Unknown'
            
            models.append({
                'name': model_name,
                'display_name': f"{base_name} ({tag})",
                'base_name': base_name,
                'tag': tag,
                'size': size
            })
        
        return {
            "success": True,
            "models": models,
            "message": f"Found {len(models)} available models"
        }
        
    except Exception as e:
        return {
            "success": False,
            "models": [],
            "error": str(e),
            "message": "Failed to retrieve available models"
        }

@router.post("/process-transcript/{transcript_id}")
async def process_single_transcript(
    transcript_id: int, 
    db: Session = Depends(get_db)
):
    """
    Process a single transcript by ID
    
    Args:
        transcript_id: ID of the transcript to process
        
    Returns:
        Processing results
    """
    try:
        db_service = DatabaseService(db)
        settings_service = SettingsService(db)
        llm_service = LLMService(db_service, settings_service)
        
        # Get the transcript
        transcript = db_service.get_transcript(transcript_id)
        if not transcript:
            raise HTTPException(status_code=404, detail=f"Transcript {transcript_id} not found")
        
        # Check if already processed
        if transcript.processed_at:
            return {
                "success": True,
                "message": f"Transcript {transcript_id} already processed",
                "transcript_id": transcript_id
            }
        
        # Process the transcript
        result = llm_service.process_transcript(transcript_id, transcript.text)
        
        if result:
            # Save the result to database
            llm_result = db_service.create_llm_result(result)
            
            # Mark transcript as processed
            db_service.mark_transcript_processed(transcript_id)
            
            return {
                "success": True,
                "message": f"Transcript {transcript_id} processed successfully",
                "transcript_id": transcript_id,
                "llm_result_id": llm_result.id,
                "processing_time": result.processing_time
            }
        else:
            raise HTTPException(status_code=500, detail=f"Failed to process transcript {transcript_id}")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process transcript: {str(e)}")

@router.post("/process-all")
async def process_all_unprocessed_transcripts(
    session_id: str = None,
    db: Session = Depends(get_db)
):
    """
    Process all unprocessed transcripts
    
    Args:
        session_id: Optional session ID to filter transcripts
        
    Returns:
        Processing results summary
    """
    try:
        db_service = DatabaseService(db)
        settings_service = SettingsService(db)
        llm_service = LLMService(db_service, settings_service)
        
        # Process all unprocessed transcripts
        result = llm_service.process_unprocessed_transcripts(session_id)
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process transcripts: {str(e)}")

@router.post("/process-all-background")
async def process_all_unprocessed_transcripts_background(
    background_tasks: BackgroundTasks,
    session_id: str = None,
    db: Session = Depends(get_db)
):
    """
    Process all unprocessed transcripts in the background
    
    Args:
        session_id: Optional session ID to filter transcripts
        
    Returns:
        Confirmation that processing has started
    """
    try:
        db_service = DatabaseService(db)
        settings_service = SettingsService(db)
        llm_service = LLMService(db_service, settings_service)
        
        # Add the processing task to background tasks
        background_tasks.add_task(
            llm_service.process_unprocessed_transcripts, 
            session_id
        )
        
        return {
            "success": True,
            "message": "Background processing started",
            "session_id": session_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start background processing: {str(e)}")

@router.post("/process-session/{session_id}")
async def process_session_transcripts(
    session_id: str,
    db: Session = Depends(get_db)
):
    """
    Process all transcripts from a session as a single combined text
    
    Args:
        session_id: Session ID to process
        
    Returns:
        Processing results for the entire session
    """
    try:
        db_service = DatabaseService(db)
        settings_service = SettingsService(db)
        llm_service = LLMService(db_service, settings_service)
        
        # Check if session exists and has transcripts
        session_transcripts = db_service.get_session_transcripts(session_id)
        if not session_transcripts:
            raise HTTPException(
                status_code=404, 
                detail=f"Session {session_id} not found or has no transcripts"
            )
        
        # Process the session
        result = await llm_service.process_session_transcripts(session_id)
        
        if result:
            # Save the result to database
            llm_result = db_service.create_llm_result(result)
            
            return {
                "success": True,
                "message": f"Session {session_id} processed successfully",
                "session_id": session_id,
                "transcript_count": len(session_transcripts),
                "llm_result_id": llm_result.id,
                "processing_time": result.processing_time,
                "combined_text_length": len("\n\n".join([t.text for t in session_transcripts]))
            }
        else:
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to process session {session_id}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to process session: {str(e)}"
        )

@router.get("/processing-status/{session_id}")
async def get_processing_status(session_id: str):
    """
    Get processing status for a session
    
    Args:
        session_id: Session ID to check
        
    Returns:
        Processing status information
    """
    try:
        from services.llm_service import processing_state
        
        status = await processing_state.get_processing_status(session_id)
        
        return {
            "success": True,
            "session_id": session_id,
            "summary_processing": status['summary_processing'],
            "mind_map_processing": status['mind_map_processing'],
            "any_processing": status['any_processing'],
            "summary_start_time": status.get('summary_start_time'),
            "mind_map_start_time": status.get('mind_map_start_time')
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get processing status: {str(e)}"
        )

@router.get("/health")
async def llm_health_check(db: Session = Depends(get_db)):
    """
    Health check for LLM service
    
    Returns:
        Health status including Ollama connection and model availability
    """
    try:
        db_service = DatabaseService(db)
        settings_service = SettingsService(db)
        llm_service = LLMService(db_service, settings_service)
        
        model_info = llm_service.get_model_info()
        
        # Get database stats
        db_stats = db_service.get_database_stats()
        
        return {
            "status": "healthy" if model_info.get("status") == "connected" else "unhealthy",
            "ollama_connected": model_info.get("status") == "connected",
            "model_available": model_info.get("available", False),
            "model_name": model_info.get("model_name"),
            "database_stats": db_stats,
            "unprocessed_transcripts": db_stats.get("unprocessed_transcripts", 0)
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "ollama_connected": False,
            "model_available": False
        }
