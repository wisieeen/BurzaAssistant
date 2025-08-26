import asyncio
import logging
from typing import Optional
from datetime import datetime

from database import get_db
from services.database_service import DatabaseService
from services.llm_service import LLMService
from services.settings_service import SettingsService

# Configure logging
logger = logging.getLogger(__name__)

class BackgroundTaskManager:
    """
    Background task manager for processing transcripts every 30 seconds
    """
    
    def __init__(self):
        self.is_running = False
        self.task = None
        self.processing_interval = 30  # seconds
        
    async def start_processing_loop(self):
        """
        Start the background processing loop
        """
        if self.is_running:
            logger.warning("Background processing loop is already running")
            return
        
        self.is_running = True
        logger.info(f"Starting background processing loop (interval: {self.processing_interval}s)")
        
        try:
            while self.is_running:
                await self._process_unprocessed_transcripts()
                await asyncio.sleep(self.processing_interval)
                
        except Exception as e:
            logger.error(f"Background processing loop error: {e}")
            self.is_running = False
            raise
    
    async def stop_processing_loop(self):
        """
        Stop the background processing loop
        """
        if not self.is_running:
            logger.warning("Background processing loop is not running")
            return
        
        logger.info("Stopping background processing loop")
        self.is_running = False
        
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
    
    async def _process_unprocessed_transcripts(self):
        """
        Process all unprocessed transcripts
        """
        try:
            # Get database session
            db = next(get_db())
            db_service = DatabaseService(db)
            settings_service = SettingsService(db)
            llm_service = LLMService(db_service, settings_service)
            
            # Process unprocessed transcripts
            result = llm_service.process_unprocessed_transcripts()
            
            if result.get("processed_count", 0) > 0:
                logger.info(f"Background processing: {result['processed_count']} transcripts processed")
            elif result.get("total_found", 0) > 0:
                logger.info(f"Background processing: {result['total_found']} transcripts found but processing failed")
            
            # Log any errors
            if result.get("errors"):
                for error in result["errors"]:
                    logger.error(f"Background processing error: {error}")
                    
        except Exception as e:
            logger.error(f"Background processing failed: {e}")
    
    def start(self):
        """
        Start the background task in a separate thread
        """
        if self.task is None:
            self.task = asyncio.create_task(self.start_processing_loop())
            logger.info("Background task started")
    
    async def stop(self):
        """
        Stop the background task
        """
        await self.stop_processing_loop()
        self.task = None
        logger.info("Background task stopped")

# Global background task manager instance
background_task_manager = BackgroundTaskManager()

async def start_background_tasks():
    """
    Start background tasks on application startup
    """
    try:
        background_task_manager.start()
        logger.info("Background tasks started successfully")
    except Exception as e:
        logger.error(f"Failed to start background tasks: {e}")

async def stop_background_tasks():
    """
    Stop background tasks on application shutdown
    """
    try:
        await background_task_manager.stop()
        logger.info("Background tasks stopped successfully")
    except Exception as e:
        logger.error(f"Failed to stop background tasks: {e}")
