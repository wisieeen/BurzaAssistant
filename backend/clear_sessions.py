#!/usr/bin/env python3
"""
Clear all sessions from database

This script will delete all sessions and their related data (transcripts and LLM results).
Use this when you want to start fresh with sessions but keep other data.
"""

import os
from sqlalchemy.orm import sessionmaker
from database.database import engine
from database.models import Session, Transcript, LLMResult

def clear_all_sessions():
    """Clear all sessions and their related data from the database"""
    
    print("🗑️  Clearing all sessions from database...")
    
    # Create database session
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Get counts before deletion
        session_count = db.query(Session).count()
        transcript_count = db.query(Transcript).count()
        llm_result_count = db.query(LLMResult).count()
        
        print(f"📊 Current database state:")
        print(f"   - Sessions: {session_count}")
        print(f"   - Transcripts: {transcript_count}")
        print(f"   - LLM Results: {llm_result_count}")
        
        if session_count == 0:
            print("✅ No sessions found in database. Nothing to delete.")
            return
        
        # Delete LLM results first (due to foreign key constraints)
        llm_results_deleted = db.query(LLMResult).delete()
        print(f"🗑️  Deleted {llm_results_deleted} LLM results")
        
        # Delete transcripts
        transcripts_deleted = db.query(Transcript).delete()
        print(f"🗑️  Deleted {transcripts_deleted} transcripts")
        
        # Delete sessions
        sessions_deleted = db.query(Session).delete()
        print(f"🗑️  Deleted {sessions_deleted} sessions")
        
        # Commit the changes
        db.commit()
        
        print("✅ All sessions and related data cleared successfully!")
        
        # Show final state
        final_session_count = db.query(Session).count()
        final_transcript_count = db.query(Transcript).count()
        final_llm_result_count = db.query(LLMResult).count()
        
        print(f"📊 Final database state:")
        print(f"   - Sessions: {final_session_count}")
        print(f"   - Transcripts: {final_transcript_count}")
        print(f"   - LLM Results: {final_llm_result_count}")
        
    except Exception as e:
        print(f"❌ Error clearing sessions: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    # Confirm before proceeding
    print("⚠️  WARNING: This will delete ALL sessions and their related data!")
    print("   - All transcripts will be deleted")
    print("   - All LLM results will be deleted")
    print("   - All sessions will be deleted")
    print("   - User settings will be preserved")
    
    response = input("Are you sure you want to continue? (yes/no): ")
    
    if response.lower() in ['yes', 'y']:
        clear_all_sessions()
    else:
        print("❌ Session clearing cancelled.")
