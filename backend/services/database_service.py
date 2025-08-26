from sqlalchemy.orm import Session as DBSession
from sqlalchemy import and_, desc
from typing import List, Optional
from datetime import datetime

from database.models import Session, Transcript, LLMResult, MindMap
from database.schemas import SessionCreate, TranscriptCreate, LLMResultCreate
from schemas.mind_map import MindMapCreate

class DatabaseService:
    """
    Service for handling database operations
    
    Provides methods for managing sessions, transcripts, and LLM results
    """
    
    def __init__(self, db: DBSession):
        self.db = db
    
    # Session operations
    def create_session(self, session_id: str, name: Optional[str] = None, description: Optional[str] = None) -> Session:
        """Create a new session"""
        session = Session(
            id=session_id,
            name=name,
            description=description,
            is_active=True
        )
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session
    
    def get_session(self, session_id: str) -> Optional[Session]:
        """Get session by ID"""
        return self.db.query(Session).filter(Session.id == session_id).first()
    
    def update_session_activity(self, session_id: str):
        """Update session last activity timestamp"""
        session = self.get_session(session_id)
        if session:
            session.last_activity = datetime.utcnow()
            self.db.commit()
    
    def deactivate_session(self, session_id: str) -> bool:
        """Mark session as inactive"""
        session = self.get_session(session_id)
        if session:
            session.is_active = False
            self.db.commit()
            return True
        return False
    
    def get_active_sessions(self) -> List[Session]:
        """Get all active sessions"""
        return self.db.query(Session).filter(Session.is_active == True).all()
    
    def get_sessions(self, active_only: bool = False, limit: int = 50, offset: int = 0) -> List[Session]:
        """Get sessions with optional filtering and pagination"""
        query = self.db.query(Session)
        
        if active_only:
            query = query.filter(Session.is_active == True)
        
        return query.order_by(desc(Session.last_activity)).offset(offset).limit(limit).all()
    
    def update_session(self, session_id: str, name: Optional[str] = None, 
                      description: Optional[str] = None, is_active: Optional[bool] = None) -> Optional[Session]:
        """Update session details"""
        session = self.get_session(session_id)
        if session:
            if name is not None:
                session.name = name
            if description is not None:
                session.description = description
            if is_active is not None:
                session.is_active = is_active
            
            session.last_activity = datetime.utcnow()
            self.db.commit()
            self.db.refresh(session)
            return session
        return None
    
    def activate_session(self, session_id: str) -> bool:
        """Activate a session"""
        session = self.get_session(session_id)
        if session:
            session.is_active = True
            session.last_activity = datetime.utcnow()
            self.db.commit()
            return True
        return False
    
    # Transcript operations
    def create_transcript(self, transcript_data: TranscriptCreate) -> Transcript:
        """Create a new transcript"""
        transcript = Transcript(**transcript_data.dict())
        self.db.add(transcript)
        self.db.commit()
        self.db.refresh(transcript)
        return transcript
    
    def get_transcript(self, transcript_id: int) -> Optional[Transcript]:
        """Get transcript by ID"""
        return self.db.query(Transcript).filter(Transcript.id == transcript_id).first()
    
    def get_session_transcripts(self, session_id: str, limit: int = 50, offset: int = 0) -> List[Transcript]:
        """Get transcripts for a session with pagination"""
        return self.db.query(Transcript).filter(
            Transcript.session_id == session_id
        ).order_by(desc(Transcript.created_at)).offset(offset).limit(limit).all()
    
    def get_unprocessed_transcripts(self, session_id: Optional[str] = None) -> List[Transcript]:
        """Get transcripts that haven't been processed by LLM"""
        query = self.db.query(Transcript).filter(Transcript.processed_at.is_(None))
        if session_id:
            query = query.filter(Transcript.session_id == session_id)
        return query.order_by(Transcript.created_at).all()
    
    def mark_transcript_processed(self, transcript_id: int):
        """Mark transcript as processed by LLM"""
        transcript = self.get_transcript(transcript_id)
        if transcript:
            transcript.processed_at = datetime.utcnow()
            self.db.commit()
    
    # LLM Result operations
    def create_llm_result(self, llm_result_data: LLMResultCreate) -> LLMResult:
        """Create a new LLM result"""
        llm_result = LLMResult(**llm_result_data.dict())
        self.db.add(llm_result)
        self.db.commit()
        self.db.refresh(llm_result)
        return llm_result
    
    def get_llm_result(self, result_id: int) -> Optional[LLMResult]:
        """Get LLM result by ID"""
        return self.db.query(LLMResult).filter(LLMResult.id == result_id).first()
    
    def get_transcript_llm_results(self, transcript_id: int) -> List[LLMResult]:
        """Get all LLM results for a transcript"""
        return self.db.query(LLMResult).filter(
            LLMResult.transcript_id == transcript_id
        ).order_by(desc(LLMResult.created_at)).all()
    
    def get_session_llm_results(self, session_id: str, limit: int = 50, offset: int = 0) -> List[LLMResult]:
        """Get LLM results for a session with pagination"""
        return self.db.query(LLMResult).join(Transcript).filter(
            Transcript.session_id == session_id
        ).order_by(desc(LLMResult.created_at)).offset(offset).limit(limit).all()
    
    # Mind Map operations
    def create_mind_map(self, mind_map_data: MindMapCreate) -> MindMap:
        """Create a new mind map"""
        mind_map = MindMap(**mind_map_data.dict())
        self.db.add(mind_map)
        self.db.commit()
        self.db.refresh(mind_map)
        return mind_map
    
    def get_mind_map(self, mind_map_id: int) -> Optional[MindMap]:
        """Get mind map by ID"""
        return self.db.query(MindMap).filter(MindMap.id == mind_map_id).first()
    
    def get_session_mind_maps(self, session_id: str) -> List[MindMap]:
        """Get all mind maps for a session"""
        return self.db.query(MindMap).filter(
            MindMap.session_id == session_id
        ).order_by(desc(MindMap.created_at)).all()
    
    def delete_mind_map(self, mind_map_id: int) -> bool:
        """Delete a mind map"""
        mind_map = self.get_mind_map(mind_map_id)
        if mind_map:
            self.db.delete(mind_map)
            self.db.commit()
            return True
        return False
    
    # Statistics
    def get_database_stats(self) -> dict:
        """Get database statistics"""
        total_sessions = self.db.query(Session).count()
        total_transcripts = self.db.query(Transcript).count()
        total_llm_results = self.db.query(LLMResult).count()
        active_sessions = self.db.query(Session).filter(Session.is_active == True).count()
        unprocessed_transcripts = self.db.query(Transcript).filter(
            Transcript.processed_at.is_(None)
        ).count()
        
        return {
            "total_sessions": total_sessions,
            "total_transcripts": total_transcripts,
            "total_llm_results": total_llm_results,
            "active_sessions": active_sessions,
            "unprocessed_transcripts": unprocessed_transcripts
        }
    
    def get_session_summary(self, session_id: str) -> Optional[dict]:
        """Get comprehensive summary of a session"""
        session = self.get_session(session_id)
        if not session:
            return None
        
        # Get transcript count
        transcript_count = self.db.query(Transcript).filter(
            Transcript.session_id == session_id
        ).count()
        
        # Get LLM result count
        llm_result_count = self.db.query(LLMResult).join(Transcript).filter(
            Transcript.session_id == session_id
        ).count()
        
        # Calculate total audio duration (estimate based on transcript count)
        # Assuming average 10 seconds per transcript
        total_audio_duration = transcript_count * 10.0
        
        # Calculate average processing time (estimate)
        # Assuming average 2 seconds per LLM result
        average_processing_time = llm_result_count * 2.0 / max(llm_result_count, 1)
        
        return {
            "session_id": session.id,
            "name": session.name,
            "description": session.description,
            "is_active": session.is_active,
            "created_at": session.created_at,
            "last_activity": session.last_activity,
            "transcript_count": transcript_count,
            "llm_result_count": llm_result_count,
            "total_audio_duration": total_audio_duration,
            "average_processing_time": average_processing_time
        }

    def erase_session_content(self, session_id: str) -> bool:
        """Erase all content (transcripts and LLM results) for a session"""
        session = self.get_session(session_id)
        if not session:
            return False
        
        try:
            # Delete all LLM results for transcripts in this session
            llm_results_to_delete = self.db.query(LLMResult).join(Transcript).filter(
                Transcript.session_id == session_id
            ).all()
            
            for llm_result in llm_results_to_delete:
                self.db.delete(llm_result)
            
            # Delete all transcripts for this session
            transcripts_to_delete = self.db.query(Transcript).filter(
                Transcript.session_id == session_id
            ).all()
            
            for transcript in transcripts_to_delete:
                self.db.delete(transcript)
            
            # Update session last activity
            session.last_activity = datetime.utcnow()
            
            self.db.commit()
            return True
        except Exception as e:
            self.db.rollback()
            print(f"Error erasing session content: {e}")
            return False

    def update_session_name(self, session_id: str, new_name: str) -> Optional[Session]:
        """Update the name of a session"""
        session = self.get_session(session_id)
        if not session:
            return None
        
        try:
            session.name = new_name
            session.last_activity = datetime.utcnow()
            self.db.commit()
            self.db.refresh(session)
            return session
        except Exception as e:
            self.db.rollback()
            print(f"Error updating session name: {e}")
            return None
