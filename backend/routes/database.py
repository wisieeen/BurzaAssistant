from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db, DatabaseStats
from database.schemas import Session as SessionSchema, Transcript, LLMResult
from services.database_service import DatabaseService

# Create router
router = APIRouter(prefix="/database", tags=["database"])

@router.get("/stats", response_model=DatabaseStats)
async def get_database_stats(db: Session = Depends(get_db)):
    """
    Get database statistics
    
    Returns:
        Database statistics including counts of sessions, transcripts, and LLM results
    """
    try:
        db_service = DatabaseService(db)
        stats = db_service.get_database_stats()
        return DatabaseStats(**stats)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get database stats: {str(e)}")

@router.get("/sessions", response_model=List[SessionSchema])
async def get_all_sessions(db: Session = Depends(get_db)):
    """
    Get all sessions
    
    Returns:
        List of all sessions in the database
    """
    try:
        db_service = DatabaseService(db)
        sessions = db_service.get_active_sessions()
        return sessions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get sessions: {str(e)}")

@router.get("/sessions/{session_id}/transcripts", response_model=List[Transcript])
async def get_session_transcripts(session_id: str, db: Session = Depends(get_db)):
    """
    Get all transcripts for a specific session
    
    Args:
        session_id: Session ID to get transcripts for
        
    Returns:
        List of transcripts for the session
    """
    try:
        db_service = DatabaseService(db)
        transcripts = db_service.get_session_transcripts(session_id)
        return transcripts
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get session transcripts: {str(e)}")

@router.get("/transcripts/unprocessed", response_model=List[Transcript])
async def get_unprocessed_transcripts(
    session_id: str = None, 
    db: Session = Depends(get_db)
):
    """
    Get transcripts that haven't been processed by LLM
    
    Args:
        session_id: Optional session ID to filter by
        
    Returns:
        List of unprocessed transcripts
    """
    try:
        db_service = DatabaseService(db)
        transcripts = db_service.get_unprocessed_transcripts(session_id)
        return transcripts
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get unprocessed transcripts: {str(e)}")

@router.get("/transcripts/{transcript_id}/llm-results", response_model=List[LLMResult])
async def get_transcript_llm_results(transcript_id: int, db: Session = Depends(get_db)):
    """
    Get all LLM results for a specific transcript
    
    Args:
        transcript_id: Transcript ID to get LLM results for
        
    Returns:
        List of LLM results for the transcript
    """
    try:
        db_service = DatabaseService(db)
        llm_results = db_service.get_transcript_llm_results(transcript_id)
        return llm_results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get LLM results: {str(e)}")
