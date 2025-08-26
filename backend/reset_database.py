#!/usr/bin/env python3
"""
Database reset script

This script will drop all existing tables and recreate them with the correct schema.
Use this when the database schema has changed and you need to start fresh.
"""

import os
from sqlalchemy import text
from database.database import engine, create_tables
from database.models import Base

def reset_database():
    """Reset the database by dropping all tables and recreating them"""
    
    print("🔄 Resetting database...")
    
    # Drop all tables
    with engine.connect() as conn:
        # Get all table names
        result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))
        tables = [row[0] for row in result.fetchall()]
        
        print(f"📋 Found {len(tables)} existing tables: {', '.join(tables)}")
        
        # Drop all tables
        for table in tables:
            if table != 'sqlite_sequence':  # Don't drop SQLite's internal table
                conn.execute(text(f"DROP TABLE IF EXISTS {table}"))
                print(f"🗑️  Dropped table: {table}")
        
        conn.commit()
    
    # Recreate all tables with correct schema
    print("🔨 Creating tables with correct schema...")
    create_tables()
    
    print("✅ Database reset completed successfully!")
    print("📝 All tables have been recreated with the latest schema.")

if __name__ == "__main__":
    # Confirm before proceeding
    print("⚠️  WARNING: This will delete ALL data in the database!")
    response = input("Are you sure you want to continue? (yes/no): ")
    
    if response.lower() in ['yes', 'y']:
        reset_database()
    else:
        print("❌ Database reset cancelled.")
