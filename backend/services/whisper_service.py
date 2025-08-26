import whisper
import tempfile
import os
from typing import Optional, Dict, Any
import logging
from pydub import AudioSegment
import io

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class WhisperService:
    """
    Service for handling audio transcription using OpenAI Whisper
    """
    
    def __init__(self, model_name: str = "base", settings_service=None):
        """
        Initialize Whisper service with specified model
        
        Args:
            model_name: Whisper model size ('tiny', 'base', 'small', 'medium', 'large')
            settings_service: Optional settings service for dynamic configuration
        """
        self.model_name = model_name
        self.model = None
        self.settings_service = settings_service
        self._load_model()
    
    def _load_model(self):
        """Load the Whisper model"""
        try:
            logger.info(f"Loading Whisper model: {self.model_name}")
            self.model = whisper.load_model(self.model_name)
            logger.info(f"Whisper model {self.model_name} loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load Whisper model: {e}")
            raise
    
    def transcribe_audio_file(self, audio_file_path: str, language: Optional[str] = None, model: Optional[str] = None) -> Dict[str, Any]:
        """
        Transcribe audio from a file
        
        Args:
            audio_file_path: Path to the audio file
            language: Language code (optional, Whisper will auto-detect if not provided)
            model: Whisper model to use (optional, will use settings or default if not provided)
            
        Returns:
            Dictionary containing transcription results
        """
        try:
            logger.info(f"Transcribing audio file: {audio_file_path}")
            
            # Check if file exists before transcription
            if not os.path.exists(audio_file_path):
                raise FileNotFoundError(f"Audio file not found: {audio_file_path}")
            
            file_size = os.path.getsize(audio_file_path)
            logger.info(f"Audio file size: {file_size} bytes")
            
            # Get settings if available
            if self.settings_service:
                settings = self.settings_service.get_settings_dict("default")
                if not language:
                    language = settings.get('whisperLanguage', 'auto')
                if not model:
                    model = settings.get('whisperModel', 'base')
            
            # Use provided model or default
            model_to_use = model or self.model_name
            
            # Load model if different from current
            if model_to_use != self.model_name:
                self.model_name = model_to_use
                self._load_model()
            
            # Transcription options
            options = {
                "language": language if language != "auto" else None,
                "task": "transcribe"
            }
            
            # Remove None values
            options = {k: v for k, v in options.items() if v is not None}
            
            # Perform transcription
            result = self.model.transcribe(audio_file_path, **options)
            
            logger.info(f"Transcription completed successfully using model: {self.model_name}, language: {language}")
            return {
                "success": True,
                "text": result["text"].strip(),
                "language": result.get("language", "unknown"),
                "segments": result.get("segments", []),
                "model": self.model_name
            }
            
        except Exception as e:
            logger.error(f"Transcription failed: {e}")
            import traceback
            logger.error(f"Full traceback: {traceback.format_exc()}")
            return {
                "success": False,
                "error": str(e),
                "text": "",
                "language": "unknown",
                "segments": [],
                "model": self.model_name
            }
    
    def transcribe_audio_bytes(self, audio_bytes: bytes, language: Optional[str] = None, model: Optional[str] = None) -> Dict[str, Any]:
        """
        Transcribe audio from bytes data using in-memory processing
        
        Args:
            audio_bytes: Audio data as bytes
            language: Language code (optional)
            model: Whisper model to use (optional, will use settings or default if not provided)
            
        Returns:
            Dictionary containing transcription results
        """
        try:
            logger.info(f"Processing audio bytes: {len(audio_bytes)} bytes")
            
            # Debug: Check if audio has content
            if len(audio_bytes) > 44 and audio_bytes.startswith(b'RIFF'):
                # This is a WAV file, check audio data
                audio_data = audio_bytes[44:]  # Skip WAV header
                if len(audio_data) > 0:
                    import struct
                    try:
                        samples = struct.unpack(f'<{len(audio_data)//2}h', audio_data)
                        rms_level = (sum(s*s for s in samples) / len(samples)) ** 0.5
                        logger.info(f"WAV audio RMS level: {rms_level}")
                        if rms_level < 10:  # Very low audio level
                            logger.warning("Audio level is very low, might be silence")
                    except Exception as e:
                        logger.warning(f"Could not analyze WAV audio: {e}")
                else:
                    logger.warning("WAV file has no audio data")
            
            # Try to determine format from the first few bytes
            file_extension = ".webm"  # default
            if audio_bytes.startswith(b'RIFF'):
                file_extension = ".wav"
            elif audio_bytes.startswith(b'\x00\x00\x00\x20ftyp'):
                file_extension = ".mp4"
            elif audio_bytes.startswith(b'\x1a\x45\xdf\xa3'):
                file_extension = ".webm"
            elif audio_bytes.startswith(b'ID3'):
                file_extension = ".mp3"
            elif audio_bytes.startswith(b'OggS'):
                file_extension = ".ogg"
            
            logger.info(f"Detected format: {file_extension}")
            
            # Additional validation for WebM format
            if file_extension == ".webm":
                # Check if this looks like a valid WebM file
                if len(audio_bytes) < 1000:  # WebM files should be larger
                    logger.warn(f"WebM file too small: {len(audio_bytes)} bytes")
                    # Try to treat as raw audio data
                    file_extension = ".raw"
                elif not audio_bytes.startswith(b'\x1a\x45\xdf\xa3'):
                    logger.warn("WebM file doesn't start with proper EBML header")
                    # Try to treat as raw audio data
                    file_extension = ".raw"
            
            # Create in-memory file-like object
            audio_io = io.BytesIO(audio_bytes)
            audio_io.name = f"audio{file_extension}"  # Give it a name for format detection
            
            # Try to convert to WAV using pydub (in-memory)
            try:
                logger.info("Attempting to convert audio using pydub (in-memory)...")
                
                # Load audio with pydub from memory
                audio = AudioSegment.from_file(audio_io)
                logger.info(f"Loaded audio: {len(audio)}ms, {audio.channels} channels, {audio.frame_rate}Hz")
                
                # Export as WAV to memory (WAV is more reliable than MP3 for Whisper)
                wav_io = io.BytesIO()
                audio.export(wav_io, format="wav")
                wav_io.seek(0)  # Reset position to beginning
                
                logger.info(f"Converted to WAV: {wav_io.getbuffer().nbytes} bytes")
                
                # Create temporary WAV file for Whisper (Whisper works better with files)
                with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
                    temp_file.write(wav_io.getvalue())
                    temp_file_path = temp_file.name
                
                logger.info(f"Created temporary WAV file: {temp_file_path}")
                
                # Use the WAV file for transcription
                result = self.transcribe_audio_file(temp_file_path, language, model)
                
                # Clean up temporary file
                if os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
                    logger.info(f"Cleaned up temporary WAV file: {temp_file_path}")
                
                return result
                
            except Exception as pydub_error:
                logger.error(f"Failed to convert with pydub: {pydub_error}")
                logger.info("Falling back to direct Whisper processing...")
                
                # Fallback: try to use original bytes directly with Whisper
                # Create a temporary file with the original format
                with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
                    temp_file.write(audio_bytes)
                    temp_file_path = temp_file.name
                
                logger.info(f"Created fallback temporary file: {temp_file_path}")
                
                try:
                    result = self.transcribe_audio_file(temp_file_path, language, model)
                    return result
                except Exception as whisper_error:
                    logger.error(f"Direct Whisper processing also failed: {whisper_error}")
                    
                    # Last resort: try to create a simple WAV file from raw audio
                    if file_extension != ".wav":
                        logger.info("Attempting to create WAV file from raw audio...")
                        try:
                            # Create a simple WAV file (16kHz, mono, 16-bit)
                            import struct
                            
                            # Calculate WAV file structure
                            sample_rate = 16000
                            channels = 1
                            bits_per_sample = 16
                            bytes_per_sample = bits_per_sample // 8
                            block_align = channels * bytes_per_sample
                            byte_rate = sample_rate * block_align
                            
                            # Create WAV header
                            wav_header = struct.pack('<4sI4s4sIHHIIHH4sI',
                                b'RIFF',
                                36 + len(audio_bytes),  # File size - 8
                                b'WAVE',
                                b'fmt ',
                                16,  # fmt chunk size
                                1,   # Audio format (PCM)
                                channels,
                                sample_rate,
                                byte_rate,
                                block_align,
                                bits_per_sample,
                                b'data',
                                len(audio_bytes)
                            )
                            
                            # Combine header and audio data
                            wav_data = wav_header + audio_bytes
                            
                            # Create temporary WAV file
                            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as wav_file:
                                wav_file.write(wav_data)
                                wav_file_path = wav_file.name
                            
                            logger.info(f"Created WAV file from raw audio: {wav_file_path}")
                            
                            try:
                                result = self.transcribe_audio_file(wav_file_path, language)
                                return result
                            finally:
                                # Clean up WAV file
                                if os.path.exists(wav_file_path):
                                    os.unlink(wav_file_path)
                                    logger.info(f"Cleaned up WAV file: {wav_file_path}")
                                    
                        except Exception as wav_error:
                            logger.error(f"WAV creation failed: {wav_error}")
                    
                    # If all else fails, return error
                    return {
                        "success": False,
                        "error": f"All audio processing methods failed. Last error: {whisper_error}",
                        "text": "",
                        "language": "unknown",
                        "segments": [],
                        "model": self.model_name
                    }
                finally:
                    # Clean up temporary file
                    if os.path.exists(temp_file_path):
                        os.unlink(temp_file_path)
                        logger.info(f"Cleaned up fallback temporary file: {temp_file_path}")
                    
        except Exception as e:
            logger.error(f"Failed to transcribe audio bytes: {e}")
            import traceback
            logger.error(f"Full traceback: {traceback.format_exc()}")
            return {
                "success": False,
                "error": str(e),
                "text": "",
                "language": "unknown",
                "segments": [],
                "model": self.model_name
            }
    

    
    def get_available_models(self) -> list:
        """Get list of available Whisper models"""
        return ["tiny", "base", "small", "medium", "large"]
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the current model"""
        return {
            "model_name": self.model_name,
            "available_models": self.get_available_models(),
            "loaded": self.model is not None
        }
