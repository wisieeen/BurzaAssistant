from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import Optional
import logging

from services.websocket_service import websocket_service

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(tags=["websocket"])

@router.websocket("/ws/audio")
async def websocket_audio_endpoint(
    websocket: WebSocket,
    session_id: Optional[str] = Query(None, description="Optional session ID")
):
    """
    WebSocket endpoint for real-time audio streaming and transcription
    
    This endpoint handles:
    - Audio chunk streaming
    - Real-time transcription
    - Audio level monitoring
    - Session management
    """
    try:
        await websocket_service.handle_websocket_connection(websocket, session_id)
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")

@router.get("/websocket/sessions")
async def get_active_sessions():
    """
    Get information about active WebSocket sessions
    """
    try:
        sessions = websocket_service.get_active_sessions()
        return {
            "success": True,
            "sessions": sessions,
            "total_sessions": len(sessions)
        }
    except Exception as e:
        logger.error(f"Failed to get active sessions: {e}")
        return {
            "success": False,
            "error": str(e),
            "sessions": {},
            "total_sessions": 0
        }

@router.post("/websocket/cleanup")
async def cleanup_sessions():
    """
    Clean up inactive WebSocket sessions
    """
    try:
        websocket_service.cleanup_inactive_sessions()
        return {
            "success": True,
            "message": "Session cleanup initiated"
        }
    except Exception as e:
        logger.error(f"Failed to cleanup sessions: {e}")
        return {
            "success": False,
            "error": str(e)
        }
