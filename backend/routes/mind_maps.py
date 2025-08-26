from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
import json

from database import get_db
from services.database_service import DatabaseService
from services.llm_service import LLMService
from schemas.mind_map import MindMapResponse, MindMapListResponse, MindMapData, MindMapNode, MindMapEdge

# Create router
router = APIRouter(prefix="/api/sessions", tags=["mind_maps"])

@router.post("/{session_id}/mind-maps", response_model=MindMapResponse)
async def generate_mind_map(
    session_id: str,
    use_random_seed: bool = Query(False, description="Whether to add randomness to mind map generation"),
    db: Session = Depends(get_db)
):
    """
    Generate a mind map for a session
    
    Args:
        session_id: Session ID to generate mind map for
        
    Returns:
        Generated mind map data
    """
    try:
        db_service = DatabaseService(db)
        llm_service = LLMService(db_service)
        
        # Check if session exists
        session = db_service.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail=f"Session {session_id} not found")
        
        # Generate mind map
        mind_map_result = llm_service.process_session_mind_map(session_id, use_random_seed)
        
        if not mind_map_result:
            raise HTTPException(status_code=500, detail="Failed to generate mind map")
        
        # Save to database
        mind_map = db_service.create_mind_map(mind_map_result)
        
        # Parse the stored JSON data
        nodes_data = json.loads(mind_map.nodes)
        edges_data = json.loads(mind_map.edges)
        
        # Convert to response format
        nodes = [MindMapNode(**node) for node in nodes_data]
        edges = [MindMapEdge(**edge) for edge in edges_data]
        
        mind_map_data = MindMapData(
            nodes=nodes,
            edges=edges,
            session_id=session_id,
            timestamp=mind_map.created_at.isoformat()
        )
        
        return MindMapResponse(
            success=True,
            mind_map=mind_map_data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate mind map: {str(e)}")

@router.get("/{session_id}/mind-maps", response_model=MindMapListResponse)
async def get_session_mind_maps(
    session_id: str,
    db: Session = Depends(get_db)
):
    """
    Get all mind maps for a session
    
    Args:
        session_id: Session ID to get mind maps for
        
    Returns:
        List of mind maps for the session
    """
    try:
        db_service = DatabaseService(db)
        
        # Check if session exists
        session = db_service.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail=f"Session {session_id} not found")
        
        # Get mind maps
        mind_maps = db_service.get_session_mind_maps(session_id)
        
        # Convert to response format
        mind_map_data_list = []
        for mind_map in mind_maps:
            try:
                nodes_data = json.loads(mind_map.nodes)
                edges_data = json.loads(mind_map.edges)
                
                nodes = [MindMapNode(**node) for node in nodes_data]
                edges = [MindMapEdge(**edge) for edge in edges_data]
                
                mind_map_data = MindMapData(
                    nodes=nodes,
                    edges=edges,
                    session_id=session_id,
                    timestamp=mind_map.created_at.isoformat()
                )
                mind_map_data_list.append(mind_map_data)
            except json.JSONDecodeError as e:
                # Skip invalid mind maps
                continue
        
        return MindMapListResponse(
            success=True,
            mind_maps=mind_map_data_list
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get mind maps: {str(e)}")

@router.delete("/{session_id}/mind-maps/{mind_map_id}")
async def delete_mind_map(
    session_id: str,
    mind_map_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete a mind map
    
    Args:
        session_id: Session ID
        mind_map_id: Mind map ID to delete
        
    Returns:
        Success response
    """
    try:
        db_service = DatabaseService(db)
        
        # Check if session exists
        session = db_service.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail=f"Session {session_id} not found")
        
        # Delete mind map
        success = db_service.delete_mind_map(mind_map_id)
        
        if not success:
            raise HTTPException(status_code=404, detail=f"Mind map {mind_map_id} not found")
        
        return {"success": True, "message": "Mind map deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete mind map: {str(e)}")
