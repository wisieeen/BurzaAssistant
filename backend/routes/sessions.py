from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from database import get_db
from services.database_service import DatabaseService
from schemas.sessions import (
    SessionCreate, SessionUpdate, SessionResponse, SessionListResponse,
    SessionTranscriptResponse, SessionLLMResultsResponse, SessionSummary, SessionSummaryResponse
)

router = APIRouter(prefix="/api/sessions", tags=["sessions"])

@router.get("/", response_model=SessionListResponse)
async def get_sessions(
    active_only: bool = False,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """
    Get all sessions with optional filtering
    
    Args:
        active_only: Only return active sessions
        limit: Maximum number of sessions to return
        offset: Number of sessions to skip
        db: Database session
        
    Returns:
        List of sessions
    """
    try:
        db_service = DatabaseService(db)
        sessions = db_service.get_sessions(active_only=active_only, limit=limit, offset=offset)
        
        return SessionListResponse(
            success=True,
            sessions=sessions,
            total=len(sessions),
            message=f"Retrieved {len(sessions)} sessions"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get sessions: {str(e)}")

@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str, db: Session = Depends(get_db)):
    """
    Get a specific session by ID
    
    Args:
        session_id: Session ID
        db: Database session
        
    Returns:
        Session details
    """
    try:
        db_service = DatabaseService(db)
        session = db_service.get_session(session_id)
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return SessionResponse(
            success=True,
            session=session,
            message="Session retrieved successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get session: {str(e)}")

@router.post("/", response_model=SessionResponse)
async def create_session(
    session_data: SessionCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new session
    
    Args:
        session_data: Session creation data
        db: Database session
        
    Returns:
        Created session
    """
    try:
        db_service = DatabaseService(db)
        session = db_service.create_session(
            session_id=session_data.id,
            name=session_data.name,
            description=session_data.description
        )
        
        return SessionResponse(
            success=True,
            session=session,
            message="Session created successfully"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create session: {str(e)}")

@router.put("/{session_id}", response_model=SessionResponse)
async def update_session(
    session_id: str,
    session_data: SessionUpdate,
    db: Session = Depends(get_db)
):
    """
    Update a session
    
    Args:
        session_id: Session ID
        session_data: Session update data
        db: Database session
        
    Returns:
        Updated session
    """
    try:
        db_service = DatabaseService(db)
        session = db_service.update_session(
            session_id=session_id,
            name=session_data.name,
            description=session_data.description,
            is_active=session_data.is_active
        )
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return SessionResponse(
            success=True,
            session=session,
            message="Session updated successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update session: {str(e)}")

@router.delete("/{session_id}")
async def delete_session(session_id: str, db: Session = Depends(get_db)):
    """
    Delete a session (soft delete by deactivating)
    
    Args:
        session_id: Session ID
        db: Database session
        
    Returns:
        Success message
    """
    try:
        db_service = DatabaseService(db)
        success = db_service.deactivate_session(session_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return {
            "success": True,
            "message": "Session deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete session: {str(e)}")

@router.post("/{session_id}/activate")
async def activate_session(session_id: str, db: Session = Depends(get_db)):
    """
    Activate a session
    
    Args:
        session_id: Session ID
        db: Database session
        
    Returns:
        Success message
    """
    try:
        db_service = DatabaseService(db)
        success = db_service.activate_session(session_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return {
            "success": True,
            "message": "Session activated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to activate session: {str(e)}")

@router.get("/{session_id}/transcripts", response_model=SessionTranscriptResponse)
async def get_session_transcripts(
    session_id: str,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """
    Get transcripts for a specific session
    
    Args:
        session_id: Session ID
        limit: Maximum number of transcripts to return
        offset: Number of transcripts to skip
        db: Database session
        
    Returns:
        List of transcripts for the session
    """
    try:
        db_service = DatabaseService(db)
        transcripts = db_service.get_session_transcripts(
            session_id=session_id,
            limit=limit,
            offset=offset
        )
        
        return SessionTranscriptResponse(
            success=True,
            transcripts=transcripts,
            total=len(transcripts),
            message=f"Retrieved {len(transcripts)} transcripts for session {session_id}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get session transcripts: {str(e)}")

@router.get("/{session_id}/llm-results", response_model=SessionLLMResultsResponse)
async def get_session_llm_results(
    session_id: str,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """
    Get LLM results for a specific session
    
    Args:
        session_id: Session ID
        limit: Maximum number of LLM results to return
        offset: Number of LLM results to skip
        db: Database session
        
    Returns:
        List of LLM results for the session
    """
    try:
        db_service = DatabaseService(db)
        llm_results = db_service.get_session_llm_results(
            session_id=session_id,
            limit=limit,
            offset=offset
        )
        
        return SessionLLMResultsResponse(
            success=True,
            llm_results=llm_results,
            total=len(llm_results),
            message=f"Retrieved {len(llm_results)} LLM results for session {session_id}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get session LLM results: {str(e)}")

@router.delete("/{session_id}/content")
async def erase_session_content(session_id: str, db: Session = Depends(get_db)):
    """
    Erase all content (transcripts and LLM results) for a session
    
    Args:
        session_id: Session ID
        db: Database session
        
    Returns:
        Success message
    """
    try:
        db_service = DatabaseService(db)
        success = db_service.erase_session_content(session_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return {
            "success": True,
            "message": "Session content erased successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to erase session content: {str(e)}")

@router.patch("/{session_id}/name")
async def update_session_name(
    session_id: str, 
    name_data: dict, 
    db: Session = Depends(get_db)
):
    """
    Update the name of a session
    
    Args:
        session_id: Session ID
        name_data: Dictionary containing the new name
        db: Database session
        
    Returns:
        Updated session
    """
    try:
        new_name = name_data.get('name')
        if not new_name or not new_name.strip():
            raise HTTPException(status_code=400, detail="Session name cannot be empty")
        
        db_service = DatabaseService(db)
        session = db_service.update_session_name(session_id, new_name.strip())
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return SessionResponse(
            success=True,
            session=session,
            message="Session name updated successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update session name: {str(e)}")

@router.get("/{session_id}/summary", response_model=SessionSummaryResponse)
async def get_session_summary(session_id: str, db: Session = Depends(get_db)):
    """
    Get a summary of a session including transcript count and LLM results
    
    Args:
        session_id: Session ID
        db: Database session
        
    Returns:
        Session summary
    """
    try:
        db_service = DatabaseService(db)
        summary = db_service.get_session_summary(session_id)
        
        if not summary:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return SessionSummaryResponse(
            success=True,
            summary=summary,
            message="Session summary retrieved successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get session summary: {str(e)}")
