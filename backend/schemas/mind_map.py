from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class MindMapNode(BaseModel):
    """Schema for mind map node"""
    id: str = Field(description="Unique identifier for the node")
    label: str = Field(description="Display text for the node")
    type: Optional[str] = Field(default=None, description="Type of concept (e.g., 'topic', 'action', 'entity')")
    position: Optional[Dict[str, float]] = Field(default=None, description="Optional position coordinates")

class MindMapEdge(BaseModel):
    """Schema for mind map edge"""
    id: str = Field(description="Unique identifier for the edge")
    source: str = Field(description="Source node ID")
    target: str = Field(description="Target node ID")
    label: Optional[str] = Field(default=None, description="Relationship label")
    type: Optional[str] = Field(default=None, description="Type of relationship")

class MindMapData(BaseModel):
    """Schema for complete mind map data"""
    nodes: List[MindMapNode] = Field(description="List of mind map nodes")
    edges: List[MindMapEdge] = Field(description="List of mind map edges")
    session_id: Optional[str] = Field(default=None, description="Associated session ID")
    timestamp: Optional[str] = Field(default=None, description="Creation timestamp")

class MindMapCreate(BaseModel):
    """Schema for creating a mind map"""
    session_id: str = Field(description="Session ID to associate with")
    nodes: str = Field(description="JSON string of mind map nodes")
    edges: str = Field(description="JSON string of mind map edges")
    prompt: str = Field(description="The prompt sent to LLM")
    model: str = Field(description="Ollama model used")
    processing_time: Optional[float] = Field(default=None, description="Processing time in seconds")

class MindMapResponse(BaseModel):
    """Schema for mind map response"""
    success: bool
    mind_map: Optional[MindMapData] = Field(default=None, description="Mind map data")
    error: Optional[str] = Field(default=None, description="Error message if failed")

class MindMapListResponse(BaseModel):
    """Schema for mind map list response"""
    success: bool
    mind_maps: List[MindMapData] = Field(description="List of mind maps")
    error: Optional[str] = Field(default=None, description="Error message if failed")
