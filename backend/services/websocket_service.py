import asyncio
import json
import logging
import uuid
from typing import Dict, Set, Optional, Any
from datetime import datetime
import base64

from fastapi import WebSocket, WebSocketDisconnect
from services.whisper_service import WhisperService
from database import get_db
from database.schemas import TranscriptCreate
from services.database_service import DatabaseService

# Configure logging
logger = logging.getLogger(__name__)

class WebSocketService:
    """
    WebSocket service for handling real-time audio streaming and transcription
    """
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.session_data: Dict[str, Dict[str, Any]] = {}
        
        # Initialize database service
        self.db = next(get_db())
        self.db_service = DatabaseService(self.db)
        
        # Initialize settings service
        from services.settings_service import SettingsService
        self.settings_service = SettingsService(self.db)
        
        # Initialize whisper service with settings
        self.whisper_service = WhisperService(settings_service=self.settings_service)
        
    async def connect(self, websocket: WebSocket, session_id: Optional[str] = None) -> str:
        """
        Accept a new WebSocket connection
        
        Args:
            websocket: WebSocket connection
            session_id: Optional session ID (if not provided, one will be generated)
            
        Returns:
            Session ID for this connection
        """
        await websocket.accept()
        
        if not session_id:
            session_id = str(uuid.uuid4())
        
        self.active_connections[session_id] = websocket
        self.session_data[session_id] = {
            'connected_at': datetime.utcnow().isoformat(),
            'audio_chunks': [],
            'is_streaming': False,
            'last_activity': datetime.utcnow().isoformat()
        }
        
        # Create or activate session in database
        try:
            existing_session = self.db_service.get_session(session_id)
            if existing_session:
                # Session exists, activate it
                self.db_service.activate_session(session_id)
                logger.info(f"Session activated in database: {session_id}")
            else:
                # Session doesn't exist, create it
                self.db_service.create_session(session_id)
                logger.info(f"Session created in database: {session_id}")
        except Exception as e:
            logger.error(f"Failed to create/activate session in database: {e}")
        
        logger.info(f"WebSocket connected: {session_id}")
        
        # Send connection confirmation
        await self.send_message(websocket, {
            'type': 'status',
            'data': {
                'message': 'Connected successfully',
                'sessionId': session_id,
                'status': 'connected'
            },
            'timestamp': datetime.utcnow().isoformat(),
            'sessionId': session_id
        })
        
        return session_id
    
    async def disconnect(self, session_id: str):
        """
        Disconnect a WebSocket connection
        
        Args:
            session_id: Session ID to disconnect
        """
        if session_id in self.active_connections:
            websocket = self.active_connections[session_id]
            await websocket.close()
            del self.active_connections[session_id]
            
        if session_id in self.session_data:
            del self.session_data[session_id]
        
        # Deactivate session in database
        try:
            self.db_service.deactivate_session(session_id)
            logger.info(f"Session deactivated in database: {session_id}")
        except Exception as e:
            logger.error(f"Failed to deactivate session in database: {e}")
            
        logger.info(f"WebSocket disconnected: {session_id}")
    
    async def send_message(self, websocket: WebSocket, message: Dict[str, Any]):
        """
        Send a message to a WebSocket client
        
        Args:
            websocket: WebSocket connection
            message: Message to send
        """
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error(f"Failed to send message: {e}")
    
    async def send_to_session(self, session_id: str, message: Dict[str, Any]):
        """
        Send a message to a specific session
        
        Args:
            session_id: Session ID
            message: Message to send
        """
        if session_id in self.active_connections:
            await self.send_message(self.active_connections[session_id], message)
    
    async def handle_message(self, websocket: WebSocket, session_id: str, message: Dict[str, Any]):
        """
        Handle incoming WebSocket messages
        
        Args:
            websocket: WebSocket connection
            session_id: Session ID
            message: Received message
        """
        try:
            message_type = message.get('type')
            data = message.get('data', {})
            
            # Update last activity
            if session_id in self.session_data:
                self.session_data[session_id]['last_activity'] = datetime.utcnow().isoformat()
            
            # Update session activity in database
            try:
                self.db_service.update_session_activity(session_id)
            except Exception as e:
                logger.error(f"Failed to update session activity in database: {e}")
            
            if message_type == 'audio_chunk':
                await self.handle_audio_chunk(websocket, session_id, data)
                
            elif message_type == 'status':
                await self.handle_status_message(websocket, session_id, data)
                
            else:
                logger.warn(f"Unknown message type: {message_type}")
                await self.send_message(websocket, {
                    'type': 'error',
                    'data': {'error': f'Unknown message type: {message_type}'},
                    'timestamp': datetime.utcnow().isoformat(),
                    'sessionId': session_id
                })
                
        except Exception as e:
            logger.error(f"Error handling message: {e}")
            await self.send_message(websocket, {
                'type': 'error',
                'data': {'error': str(e)},
                'timestamp': datetime.utcnow().isoformat(),
                'sessionId': session_id
            })
    
    async def handle_audio_chunk(self, websocket: WebSocket, session_id: str, data: Dict[str, Any]):
        """
        Handle incoming audio chunk data
        
        Args:
            websocket: WebSocket connection
            session_id: Session ID
            data: Audio chunk data
        """
        try:
            # Extract audio data
            audio_data = data.get('data')
            logger.info(f"Received audio chunk for session {session_id}, data type: {type(audio_data)}, data length: {len(audio_data) if audio_data else 0}")
            
            if not audio_data:
                logger.warn("No audio data in chunk")
                return
            
            # Convert base64 to bytes if needed
            if isinstance(audio_data, str):
                try:
                    # Add padding if needed for base64
                    padding = 4 - (len(audio_data) % 4)
                    if padding != 4:
                        audio_data += '=' * padding
                    
                    audio_bytes = base64.b64decode(audio_data)
                    logger.info(f"Decoded base64 audio data, bytes length: {len(audio_bytes)}")
                except Exception as decode_error:
                    logger.error(f"Failed to decode base64 audio data: {decode_error}")
                    logger.error(f"Base64 data length: {len(audio_data)}, first 50 chars: {audio_data[:50]}")
                    return
            else:
                audio_bytes = audio_data
                logger.info(f"Using raw audio data, bytes length: {len(audio_bytes)}")
            
            # Validate audio bytes
            if not audio_bytes or len(audio_bytes) == 0:
                logger.warn("Empty audio bytes received")
                return
            
            # Basic validation: check for minimum size and valid headers
            if len(audio_bytes) < 100:  # Too small to be valid audio
                logger.warn(f"Audio chunk too small: {len(audio_bytes)} bytes")
                return
            
            # Check for common audio format headers
            valid_headers = [
                b'RIFF',  # WAV
                b'\x1a\x45\xdf\xa3',  # WebM/Matroska
                b'\x00\x00\x00\x20ftyp',  # MP4
                b'ID3',  # MP3
            ]
            
            has_valid_header = any(audio_bytes.startswith(header) for header in valid_headers)
            if not has_valid_header:
                logger.warn(f"Audio chunk doesn't have valid header, first bytes: {audio_bytes[:20]}")
                # Don't return here, as some formats might not have obvious headers
                # But log this for debugging
                logger.info(f"Full first 50 bytes: {audio_bytes[:50]}")
            
            # Store audio chunk
            if session_id in self.session_data:
                self.session_data[session_id]['audio_chunks'].append({
                    'data': audio_bytes,
                    'timestamp': data.get('timestamp', datetime.utcnow().isoformat())
                })
                logger.info(f"Stored audio chunk for session {session_id}, total chunks: {len(self.session_data[session_id]['audio_chunks'])}")
            
            # Process audio chunk for transcription (every 10-20 seconds)
            await self.process_audio_chunks(session_id)
            
            # Send audio level update (simulated for now)
            await self.send_audio_level_update(websocket, session_id, 50)  # Placeholder
            
        except Exception as e:
            logger.error(f"Error handling audio chunk: {e}")
            import traceback
            logger.error(f"Full traceback: {traceback.format_exc()}")
            await self.send_message(websocket, {
                'type': 'error',
                'data': {'error': f'Failed to process audio chunk: {str(e)}'},
                'timestamp': datetime.utcnow().isoformat(),
                'sessionId': session_id
            })
    
    async def handle_status_message(self, websocket: WebSocket, session_id: str, data: Dict[str, Any]):
        """
        Handle status messages (start/stop streaming)
        
        Args:
            websocket: WebSocket connection
            session_id: Session ID
            data: Status data
        """
        action = data.get('action')
        
        if action == 'start_stream':
            if session_id in self.session_data:
                self.session_data[session_id]['is_streaming'] = True
                self.session_data[session_id]['audio_chunks'] = []  # Clear previous chunks
            
            await self.send_message(websocket, {
                'type': 'status',
                'data': {
                    'message': 'Audio streaming started',
                    'sessionId': session_id,
                    'status': 'streaming'
                },
                'timestamp': datetime.utcnow().isoformat(),
                'sessionId': session_id
            })
            
        elif action == 'stop_stream':
            if session_id in self.session_data:
                self.session_data[session_id]['is_streaming'] = False
                
                # Process any remaining audio chunks
                await self.process_audio_chunks(session_id, force=True)
            
            await self.send_message(websocket, {
                'type': 'status',
                'data': {
                    'message': 'Audio streaming stopped',
                    'sessionId': session_id,
                    'status': 'stopped'
                },
                'timestamp': datetime.utcnow().isoformat(),
                'sessionId': session_id
            })
    
    async def process_audio_chunks(self, session_id: str, force: bool = False):
        """
        Process accumulated audio chunks for transcription
        
        Args:
            session_id: Session ID
            force: Force processing even if chunk size is small
        """
        if session_id not in self.session_data:
            return
        
        session = self.session_data[session_id]
        chunks = session['audio_chunks']
        
        # Get settings for processing thresholds
        settings = self.settings_service.get_settings_dict("default")
        min_chunks = settings.get('voiceChunksNumber', 10)  # Reduced to 10 for more frequent processing
        voice_chunk_length = settings.get('voiceChunkLength', 500)
        
        logger.info(f"Settings loaded: min_chunks={min_chunks}, voice_chunk_length={voice_chunk_length}")
        
        # Calculate minimum size based on chunk length and number
        # 16kHz mono = 32KB per second
        # So for voice_chunk_length ms, we get: (voice_chunk_length / 1000) * 32000 bytes
        bytes_per_chunk = (voice_chunk_length / 1000) * 32000
        min_size = bytes_per_chunk * min_chunks
        
        total_size = sum(len(chunk['data']) for chunk in chunks)
        
        logger.info(f"Processing check: chunks={len(chunks)}, min_chunks={min_chunks}, total_size={total_size}, min_size={min_size}, force={force}")
        
        # Process if we have enough chunks OR enough data, or if forced
        if not force and len(chunks) < min_chunks and total_size < min_size:
            logger.info(f"Not enough chunks for processing: {len(chunks)} chunks, {total_size} bytes")
            
            # Send progress update to frontend
            if session_id in self.active_connections:
                await self.send_message(self.active_connections[session_id], {
                    'type': 'processing_progress',
                    'data': {
                        'chunks_collected': len(chunks),
                        'chunks_needed': min_chunks,
                        'audio_duration': len(chunks) * voice_chunk_length / 1000,
                        'target_duration': min_chunks * voice_chunk_length / 1000,
                        'status': 'collecting'
                    },
                    'timestamp': datetime.utcnow().isoformat(),
                    'sessionId': session_id
                })
            
            # Force processing after 30 seconds of no processing to prevent data loss
            if len(chunks) > 0:
                last_chunk_time = datetime.fromisoformat(chunks[-1]['timestamp'])
                current_time = datetime.utcnow()
                # Make both datetimes timezone-naive for comparison
                if last_chunk_time.tzinfo is not None:
                    last_chunk_time = last_chunk_time.replace(tzinfo=None)
                if current_time.tzinfo is not None:
                    current_time = current_time.replace(tzinfo=None)
                
                if (current_time - last_chunk_time).total_seconds() > 30:
                    logger.info("Forcing processing due to timeout")
                    force = True
                else:
                    return
            else:
                return
        
        if not chunks:
            return
        
        try:
            # Combine all chunks with better error handling
            combined_audio = b''
            valid_chunks = []
            
            for chunk in chunks:
                try:
                    # Validate chunk data
                    if chunk['data'] and len(chunk['data']) > 0:
                        combined_audio += chunk['data']
                        valid_chunks.append(chunk)
                    else:
                        logger.warning(f"Skipping empty or invalid chunk in session {session_id}")
                except Exception as chunk_error:
                    logger.warning(f"Skipping corrupted chunk in session {session_id}: {chunk_error}")
            
            if not combined_audio:
                logger.warning(f"No valid audio data found in session {session_id}")
                session['audio_chunks'] = []
                return
            
            logger.info(f"Processing {len(valid_chunks)} valid chunks, total size: {len(combined_audio)} bytes")
            logger.info(f"Audio processing settings: min_chunks={min_chunks}, voice_chunk_length={voice_chunk_length}ms")
            logger.info(f"Processing time: {len(valid_chunks) * voice_chunk_length / 1000:.1f}s of audio")
            
            # Get Whisper settings first
            whisper_language = settings.get('whisperLanguage', 'auto')
            whisper_model = settings.get('whisperModel', 'base')
            
            # Send processing started message
            if session_id in self.active_connections:
                await self.send_message(self.active_connections[session_id], {
                    'type': 'processing_status',
                    'data': {
                        'status': 'transcribing',
                        'chunks_processed': len(valid_chunks),
                        'audio_duration': len(valid_chunks) * voice_chunk_length / 1000,
                        'model': whisper_model,
                        'language': whisper_language
                    },
                    'timestamp': datetime.utcnow().isoformat(),
                    'sessionId': session_id
                })
            
            # Debug: Check audio content
            if len(combined_audio) > 44:  # Skip WAV header
                audio_data = combined_audio[44:]  # Skip WAV header
                if len(audio_data) > 0:
                    # Calculate RMS level from 16-bit PCM data
                    import struct
                    samples = struct.unpack(f'<{len(audio_data)//2}h', audio_data)
                    rms_level = (sum(s*s for s in samples) / len(samples)) ** 0.5
                    logger.info(f"Audio RMS level: {rms_level}")
                else:
                    logger.warning("No audio data after WAV header")
            
            # Transcribe the combined audio with settings
            result = self.whisper_service.transcribe_audio_bytes(
                combined_audio, 
                language=whisper_language,
                model=whisper_model
            )
            
            # Save transcript to database if successful
            if result['success'] and result['text'].strip():
                try:
                    transcript_data = TranscriptCreate(
                        session_id=session_id,
                        text=result['text'],
                        language=result.get('language'),
                        model=result.get('model', 'base')
                    )
                    transcript = self.db_service.create_transcript(transcript_data)
                    logger.info(f"Transcript saved to database: ID {transcript.id}")
                    
                    # Process session transcripts after each new transcript
                    logger.info(f"Triggering session processing for session {session_id}")
                    await self.process_session_after_new_transcript(session_id)
                except Exception as db_error:
                    logger.error(f"Failed to save transcript to database: {db_error}")
            
            # Send transcription result
            if session_id in self.active_connections:
                await self.send_message(self.active_connections[session_id], {
                    'type': 'transcription_result',
                    'data': {
                        'success': result['success'],
                        'text': result['text'],
                        'language': result['language'],
                        'segments': result['segments'],
                        'model': result['model'],
                        'error': result.get('error')
                    },
                    'timestamp': datetime.utcnow().isoformat(),
                    'sessionId': session_id
                })
            
            # Clear processed chunks
            session['audio_chunks'] = []
            
            logger.info(f"Processed audio chunks for session {session_id}: {result['text'][:50]}...")
            
        except Exception as e:
            logger.error(f"Error processing audio chunks: {e}")
            import traceback
            logger.error(f"Full traceback: {traceback.format_exc()}")
            
            if session_id in self.active_connections:
                await self.send_message(self.active_connections[session_id], {
                    'type': 'error',
                    'data': {'error': f'Failed to transcribe audio: {str(e)}'},
                    'timestamp': datetime.utcnow().isoformat(),
                    'sessionId': session_id
                })
            
            # Clear chunks on error to prevent accumulation of bad data
            session['audio_chunks'] = []
    
    async def process_session_after_new_transcript(self, session_id: str):
        """
        Process session transcripts after each new transcript is added
        
        Args:
            session_id: Session ID to process
        """
        try:
            # Import LLMService here to avoid circular imports
            from services.llm_service import LLMService
            
            # Create LLM service instance with settings service
            llm_service = LLMService(self.db_service, self.settings_service)
            
            # Process the session (summary only)
            logger.info(f"Processing session transcripts for {session_id}")
            result = llm_service.process_session_transcripts(session_id)
            
            if result:
                # Save the result to database
                llm_result = self.db_service.create_llm_result(result)
                logger.info(f"Session processing completed for {session_id}: LLM result ID {llm_result.id}")
                
                # Send session analysis to client if connected
                if session_id in self.active_connections:
                    await self.send_message(self.active_connections[session_id], {
                        'type': 'session_analysis',
                        'data': {
                            'session_id': session_id,
                            'llm_result_id': llm_result.id,
                            'processing_time': result.processing_time,
                            'analysis': result.response
                        },
                        'timestamp': datetime.utcnow().isoformat(),
                        'sessionId': session_id
                    })
                    
                    # Generate mind map separately and send as independent message (non-blocking)
                    asyncio.create_task(self.generate_and_send_mind_map(session_id, llm_service))
            else:
                logger.warning(f"Session processing failed for {session_id}")
                
        except Exception as e:
            logger.error(f"Error processing session after new transcript: {e}")
            # Don't raise the exception to avoid breaking the main flow
    
    async def generate_and_send_mind_map(self, session_id: str, llm_service):
        """
        Generate mind map for session and send as independent message
        
        Args:
            session_id: Session ID to generate mind map for
            llm_service: LLM service instance
        """
        try:
            logger.info(f"Starting independent mind map generation for session {session_id}")
            
            # Generate mind map
            mind_map_result = llm_service.process_session_mind_map(session_id)
            
            if mind_map_result:
                # Save to database
                mind_map = self.db_service.create_mind_map(mind_map_result)
                logger.info(f"Mind map generated and saved for session {session_id} with ID {mind_map.id}")
                
                # Send mind map to client if connected
                if session_id in self.active_connections:
                    import json
                    mind_map_data = {
                        'nodes': json.loads(mind_map.nodes),
                        'edges': json.loads(mind_map.edges),
                        'session_id': session_id,
                        'timestamp': mind_map.created_at.isoformat()
                    }
                    
                    await self.send_message(self.active_connections[session_id], {
                        'type': 'mind_map_result',
                        'data': mind_map_data,
                        'timestamp': datetime.utcnow().isoformat(),
                        'sessionId': session_id
                    })
                    
                    logger.info(f"Mind map sent to client for session {session_id}")
                else:
                    logger.warning(f"No active connection for session {session_id} to send mind map")
            else:
                logger.warning(f"Mind map generation returned None for session {session_id}")
                
        except Exception as mind_map_error:
            logger.warning(f"Failed to generate mind map for session {session_id}: {mind_map_error}")
            import traceback
            logger.warning(f"Mind map error traceback: {traceback.format_exc()}")
    
    async def send_audio_level_update(self, websocket: WebSocket, session_id: str, level: int):
        """
        Send audio level update to client
        
        Args:
            websocket: WebSocket connection
            session_id: Session ID
            level: Audio level (0-100)
        """
        await self.send_message(websocket, {
            'type': 'audio_level',
            'data': {
                'audioLevel': level,
                'sessionId': session_id
            },
            'timestamp': datetime.utcnow().isoformat(),
            'sessionId': session_id
        })
    
    async def handle_websocket_connection(self, websocket: WebSocket, session_id: Optional[str] = None):
        """
        Main WebSocket connection handler
        
        Args:
            websocket: WebSocket connection
            session_id: Optional session ID
        """
        session_id = await self.connect(websocket, session_id)
        
        try:
            while True:
                # Receive message
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Handle the message
                await self.handle_message(websocket, session_id, message)
                
        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected: {session_id}")
        except Exception as e:
            logger.error(f"WebSocket error: {e}")
        finally:
            await self.disconnect(session_id)
    
    def get_active_sessions(self) -> Dict[str, Dict[str, Any]]:
        """
        Get information about active sessions
        
        Returns:
            Dictionary of active session information
        """
        return {
            session_id: {
                'connected_at': data['connected_at'],
                'is_streaming': data['is_streaming'],
                'last_activity': data['last_activity'],
                'chunk_count': len(data['audio_chunks'])
            }
            for session_id, data in self.session_data.items()
        }
    
    def cleanup_inactive_sessions(self, timeout_minutes: int = 30):
        """
        Clean up inactive sessions
        
        Args:
            timeout_minutes: Minutes of inactivity before cleanup
        """
        current_time = datetime.utcnow()
        sessions_to_remove = []
        
        for session_id, data in self.session_data.items():
            last_activity = datetime.fromisoformat(data['last_activity'])
            if (current_time - last_activity).total_seconds() > timeout_minutes * 60:
                sessions_to_remove.append(session_id)
        
        for session_id in sessions_to_remove:
            logger.info(f"Cleaning up inactive session: {session_id}")
            asyncio.create_task(self.disconnect(session_id))

# Global WebSocket service instance
websocket_service = WebSocketService()
