#!/usr/bin/env python3
"""
Database migration script to add mind map support

This script adds:
1. MindMap table for storing mind map data
2. ollama_mind_map_prompt column to UserSettings table
"""

import sqlite3
import os
from pathlib import Path

def migrate_database():
    """Run the database migration"""
    
    # Get the database file path
    db_path = Path(__file__).parent / "voice_assistant.db"
    
    if not db_path.exists():
        print(f"Database file not found: {db_path}")
        return False
    
    print(f"Migrating database: {db_path}")
    
    try:
        # Connect to the database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if mind_maps table already exists
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='mind_maps'
        """)
        
        if not cursor.fetchone():
            print("Creating mind_maps table...")
            
            # Create mind_maps table
            cursor.execute("""
                CREATE TABLE mind_maps (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id VARCHAR NOT NULL,
                    nodes TEXT NOT NULL,
                    edges TEXT NOT NULL,
                    prompt TEXT NOT NULL,
                    model VARCHAR(50) NOT NULL,
                    processing_time FLOAT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (session_id) REFERENCES sessions (id)
                )
            """)
            
            # Create index on session_id for better performance
            cursor.execute("""
                CREATE INDEX idx_mind_maps_session_id ON mind_maps (session_id)
            """)
            
            print("✓ mind_maps table created successfully")
        else:
            print("✓ mind_maps table already exists")
        
        # Check if ollama_mind_map_prompt column exists in user_settings table
        cursor.execute("PRAGMA table_info(user_settings)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'ollama_mind_map_prompt' not in columns:
            print("Adding ollama_mind_map_prompt column to user_settings table...")
            
            # Add the column
            cursor.execute("""
                ALTER TABLE user_settings 
                ADD COLUMN ollama_mind_map_prompt TEXT
            """)
            
            # Update existing records with default mind map prompt
            default_mind_map_prompt = """Please analyze the following transcript and create a mind map of concepts and relationships.

TRANSCRIPT:
{transcript}

Create a mind map in JSON format with the following structure:
{
  "nodes": [
    {
      "id": "unique_id_1",
      "label": "Main Topic",
      "type": "topic"
    },
    {
      "id": "unique_id_2", 
      "label": "Related Concept",
      "type": "concept"
    }
  ],
  "edges": [
    {
      "id": "edge_1",
      "source": "unique_id_1",
      "target": "unique_id_2",
      "label": "relates to",
      "type": "relationship"
    }
  ]
}

Guidelines:
- Extract key concepts, topics, entities, and ideas from the transcript
- Create meaningful relationships between concepts
- Use descriptive labels for nodes and edges
- Focus on the most important concepts mentioned
- Keep the structure logical and hierarchical
- Return ONLY valid JSON, no additional text

Return the mind map as a valid JSON object:"""
            
            cursor.execute("""
                UPDATE user_settings 
                SET ollama_mind_map_prompt = ? 
                WHERE ollama_mind_map_prompt IS NULL
            """, (default_mind_map_prompt,))
            
            print("✓ ollama_mind_map_prompt column added successfully")
        else:
            print("✓ ollama_mind_map_prompt column already exists")
        
        # Commit changes
        conn.commit()
        print("✓ Database migration completed successfully")
        
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
        return False
        
    finally:
        conn.close()

if __name__ == "__main__":
    success = migrate_database()
    if success:
        print("\n🎉 Migration completed successfully!")
        print("You can now use mind map features in your application.")
    else:
        print("\n💥 Migration failed!")
        print("Please check the error messages above and try again.")
