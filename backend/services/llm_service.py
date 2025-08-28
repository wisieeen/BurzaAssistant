import time
import logging
import json
import re
from typing import Dict, Any, Optional, Tuple
import ollama

from database.schemas import LLMResultCreate
from schemas.mind_map import MindMapCreate
from services.database_service import DatabaseService

# Configure logging
logger = logging.getLogger(__name__)

class LLMService:
    """
    LLM service for processing transcripts using Ollama
    
    Uses dynamic model and prompt settings from SettingsService
    """
    
    def __init__(self, db_service: DatabaseService, settings_service=None):
        self.db_service = db_service
        self.settings_service = settings_service
        
        # Default values (will be overridden by settings if available)
        self.model_name = "artifish/llama3.2-uncensored:latest"
        self.task_prompt = """Please analyze the following transcript and provide insights:

TRANSCRIPT:
{transcript}

Please provide:
1. A brief summary of the main topics discussed
2. Key points or important information mentioned
3. Any questions, concerns, or action items identified
4. Overall sentiment or tone of the conversation

Use clear formatting with line breaks and bullet points for better readability.
Please, be concise, return only summary and USE ONLY INFORMATION IN TRANSCRIPT!!!"""
        
        self.mind_map_prompt = """Please analyze the following transcript and create a mind map of concepts and relationships.

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
- Use SHORT, CONCISE labels (max 3-4 words) for nodes to fit in UI
- Focus on the most important concepts mentioned
- Keep the structure logical and hierarchical
- Limit to 5-8 nodes maximum for readability
- Use simple, clear relationship labels
- Return ONLY valid JSON, no additional text

Return the mind map as a valid JSON object:"""
        
        # JSON correction prompt template
        self.json_correction_prompt = """The following JSON has parsing errors. Please fix the JSON syntax and return ONLY the corrected JSON without any additional text or explanations.

ERROR DETAILS:
{error_details}

INVALID JSON:
{invalid_json}

Please return ONLY the corrected JSON:"""
        
        # Update settings if settings_service is provided
        if self.settings_service:
            self._update_settings_from_service()
        
        # Test connection to Ollama
        self._test_ollama_connection()
    
    def _update_settings_from_service(self):
        """Update model and prompt from settings service"""
        try:
            settings = self.settings_service.get_or_create_user_settings()
            if settings:
                self.model_name = settings.ollama_model
                self.task_prompt = settings.ollama_task_prompt
                if settings.ollama_mind_map_prompt:
                    self.mind_map_prompt = settings.ollama_mind_map_prompt
                
                # Log settings update
                logger.info(f"LLMService updated with settings - Model: {self.model_name}")
                
                # Check if temporary settings are being applied
                temp_settings = self.settings_service.get_temporary_settings()
                if temp_settings:
                    logger.info(f"Temporary settings applied: {list(temp_settings.keys())}")
                    
        except Exception as e:
            logger.warning(f"Failed to update LLMService settings: {e}")
    
    def update_settings(self, model_name: str = None, task_prompt: str = None, mind_map_prompt: str = None):
        """
        Update LLM settings dynamically
        
        Args:
            model_name: New model name to use
            task_prompt: New task prompt template
            mind_map_prompt: New mind map prompt template
        """
        if model_name:
            self.model_name = model_name
            logger.info(f"LLMService model updated to: {self.model_name}")
        
        if task_prompt:
            self.task_prompt = task_prompt
            logger.info("LLMService task prompt updated")
            
        if mind_map_prompt:
            self.mind_map_prompt = mind_map_prompt
            logger.info("LLMService mind map prompt updated")
    
    def refresh_settings_from_service(self):
        """
        Refresh settings from the settings service (useful when temporary settings are applied)
        """
        if self.settings_service:
            self._update_settings_from_service()
            logger.info("LLMService settings refreshed from service")
    
    def _test_ollama_connection(self):
        """Test connection to Ollama and verify model availability"""
        try:
            # List available models
            models = ollama.list()
            logger.info(f"Available Ollama models: {[model['name'] for model in models['models']]}")
            
            # Check if our model is available
            model_names = [model['name'] for model in models['models']]
            if self.model_name not in model_names:
                logger.warning(f"Model {self.model_name} not found. Available models: {model_names}")
                logger.info(f"You may need to pull the model using: ollama pull {self.model_name}")
            else:
                logger.info(f"Model {self.model_name} is available")
                
        except Exception as e:
            logger.error(f"Failed to connect to Ollama: {e}")
            logger.error("Make sure Ollama is running and accessible")
    
    def create_analysis_prompt(self, transcript_text: str) -> str:
        """
        Create a prompt for analyzing the transcript using the current task prompt template
        
        Args:
            transcript_text: The transcribed text to analyze
            
        Returns:
            Formatted prompt for the LLM
        """
        # Use the task prompt template and replace {transcript} placeholder
        prompt = self.task_prompt.replace("{transcript}", transcript_text)
        return prompt
    
    def process_transcript(self, transcript_id: int, transcript_text: str) -> Optional[LLMResultCreate]:
        """
        Process a transcript using the LLM
        
        Args:
            transcript_id: Database ID of the transcript
            transcript_text: The text to process
            
        Returns:
            LLMResultCreate object with the processing results, or None if failed
        """
        try:
            start_time = time.time()
            
            # Create the prompt
            prompt = self.create_analysis_prompt(transcript_text)
            
            logger.info(f"Processing transcript {transcript_id} with {self.model_name}")
            
            # Call Ollama
            response = ollama.chat(
                model=self.model_name,
                messages=[
                    {
                        'role': 'user',
                        'content': prompt
                    }
                ]
            )
            
            # Extract the response
            llm_response = response['message']['content']
            processing_time = time.time() - start_time
            
            logger.info(f"LLM processing completed in {processing_time:.2f} seconds")
            
            # Create the result object
            result = LLMResultCreate(
                transcript_id=transcript_id,
                prompt=prompt,
                response=llm_response,
                model=self.model_name,
                processing_time=processing_time
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to process transcript {transcript_id}: {e}")
            return None
    
    def process_unprocessed_transcripts(self, session_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Process all unprocessed transcripts
        
        Args:
            session_id: Optional session ID to filter transcripts
            
        Returns:
            Dictionary with processing results
        """
        try:
            # Get unprocessed transcripts
            unprocessed = self.db_service.get_unprocessed_transcripts(session_id)
            
            if not unprocessed:
                logger.info("No unprocessed transcripts found")
                return {
                    "success": True,
                    "processed_count": 0,
                    "errors": []
                }
            
            logger.info(f"Found {len(unprocessed)} unprocessed transcripts")
            
            processed_count = 0
            errors = []
            
            for transcript in unprocessed:
                try:
                    # Process the transcript
                    result = self.process_transcript(transcript.id, transcript.text)
                    
                    if result:
                        # Save the result to database
                        self.db_service.create_llm_result(result)
                        
                        # Mark transcript as processed
                        self.db_service.mark_transcript_processed(transcript.id)
                        
                        processed_count += 1
                        logger.info(f"Successfully processed transcript {transcript.id}")
                    else:
                        errors.append(f"Failed to process transcript {transcript.id}")
                        
                except Exception as e:
                    error_msg = f"Error processing transcript {transcript.id}: {str(e)}"
                    errors.append(error_msg)
                    logger.error(error_msg)
            
            return {
                "success": True,
                "processed_count": processed_count,
                "total_found": len(unprocessed),
                "errors": errors
            }
            
        except Exception as e:
            logger.error(f"Failed to process unprocessed transcripts: {e}")
            return {
                "success": False,
                "error": str(e),
                "processed_count": 0,
                "errors": [str(e)]
            }
    
    def get_model_info(self) -> Dict[str, Any]:
        """
        Get information about the LLM model
        
        Returns:
            Dictionary with model information
        """
        try:
            models = ollama.list()
            model_names = [model['name'] for model in models['models']]
            
            return {
                "model_name": self.model_name,
                "available": self.model_name in model_names,
                "all_models": model_names,
                "status": "connected" if models else "disconnected"
            }
        except Exception as e:
            return {
                "model_name": self.model_name,
                "available": False,
                "error": str(e),
                "status": "error"
            }
    
    def create_session_analysis_prompt(self, session_text: str, session_id: str) -> str:
        """
        Create a prompt for analyzing the entire session using the current task prompt template
        
        Args:
            session_text: Combined text from all session transcripts
            session_id: Session ID for context
            
        Returns:
            Formatted prompt for the LLM
        """
        # Use the task prompt template and replace {transcript} placeholder with session text
        # Add session context to the prompt
        session_context = f"SESSION ID: {session_id}\nCOMPLETE SESSION TRANSCRIPT:\n{session_text}"
        prompt = self.task_prompt.replace("{transcript}", session_context)
        
        return prompt
    
    def create_mind_map_prompt(self, session_text: str, session_id: str, use_random_seed: bool = False) -> str:
        """
        Create a prompt for generating mind map from session transcripts
        
        Args:
            session_text: Combined text from all session transcripts
            session_id: Session ID for context
            use_random_seed: Whether to add randomness to the generation
            
        Returns:
            Formatted prompt for the LLM
        """
        # Use the mind map prompt template and replace {transcript} placeholder with session text
        # Add session context to the prompt
        session_context = f"SESSION ID: {session_id}\nCOMPLETE SESSION TRANSCRIPT:\n{session_text}"
        prompt = self.mind_map_prompt.replace("{transcript}", session_context)
        
        # Add randomness instruction if requested
        if use_random_seed:
            prompt += "\n\nIMPORTANT: Please add some randomness and creativity to your mind map generation. Consider alternative interpretations, unexpected connections, or creative groupings of concepts. This should result in a different mind map structure than a standard analysis."
        
        return prompt
    
    def process_session_transcripts(self, session_id: str) -> Optional[LLMResultCreate]:
        """
        Process all transcripts from a session as a single combined text
        
        Args:
            session_id: Session ID to process
            
        Returns:
            LLMResultCreate object with the processing results, or None if failed
        """
        try:
            # Get all transcripts for the session
            session_transcripts = self.db_service.get_session_transcripts(session_id)
            
            if not session_transcripts:
                logger.warning(f"No transcripts found for session {session_id}")
                return None
            
            # Combine all transcript texts
            combined_text = "\n\n".join([
                f"[Transcript {t.id}]: {t.text}" 
                for t in session_transcripts
            ])
            
            logger.info(f"Processing session {session_id} with {len(session_transcripts)} transcripts")
            
            # Create session analysis prompt
            prompt = self.create_session_analysis_prompt(combined_text, session_id)
            
            start_time = time.time()
            
            # Call Ollama
            response = ollama.chat(
                model=self.model_name,
                messages=[
                    {
                        'role': 'user',
                        'content': prompt
                    }
                ]
            )
            
            # Extract the response
            llm_response = response['message']['content']
            processing_time = time.time() - start_time
            
            logger.info(f"Session LLM processing completed in {processing_time:.2f} seconds")
            
            # Create the result object (use the first transcript ID as reference)
            first_transcript_id = session_transcripts[0].id
            result = LLMResultCreate(
                transcript_id=first_transcript_id,  # Reference to first transcript
                prompt=prompt,
                response=llm_response,
                model=self.model_name,
                processing_time=processing_time
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to process session {session_id}: {e}")
            return None
    
    def _attempt_json_correction(self, invalid_json: str, error_details: str, max_attempts: int = 3) -> Tuple[Optional[Dict], int]:
        """
        Attempt to correct JSON parsing errors by forwarding to LLM
        
        Args:
            invalid_json: The invalid JSON string
            error_details: Details about the parsing error
            max_attempts: Maximum number of correction attempts
            
        Returns:
            Tuple of (corrected_json_dict, attempts_made)
        """
        for attempt in range(1, max_attempts + 1):
            try:
                logger.info(f"Attempting JSON correction (attempt {attempt}/{max_attempts})")
                
                # Create correction prompt
                correction_prompt = self.json_correction_prompt.format(
                    error_details=error_details,
                    invalid_json=invalid_json
                )
                
                # Call Ollama for correction
                response = ollama.chat(
                    model=self.model_name,
                    messages=[
                        {
                            'role': 'user',
                            'content': correction_prompt
                        }
                    ]
                )
                
                # Extract the corrected response
                corrected_json = response['message']['content'].strip()
                
                # Try to parse the corrected JSON
                corrected_data = json.loads(corrected_json)
                
                logger.info(f"JSON correction successful on attempt {attempt}")
                return corrected_data, attempt
                
            except json.JSONDecodeError as e:
                logger.warning(f"JSON correction attempt {attempt} failed: {e}")
                if attempt < max_attempts:
                    # Update error details and invalid JSON for next attempt
                    error_details = f"Previous correction failed: {str(e)}"
                    invalid_json = corrected_json if 'corrected_json' in locals() else invalid_json
                else:
                    logger.error(f"All {max_attempts} JSON correction attempts failed")
                    return None, max_attempts
                    
            except Exception as e:
                logger.error(f"Unexpected error during JSON correction attempt {attempt}: {e}")
                if attempt < max_attempts:
                    continue
                else:
                    return None, max_attempts
        
        return None, max_attempts

    def _preprocess_json_string(self, json_string: str) -> str:
        """
        Preprocess JSON string to clean up common issues before parsing
        
        Args:
            json_string: Raw JSON string from LLM
            
        Returns:
            Preprocessed JSON string
        """
        # Remove all characters before the first '{' or '['
        start_chars = ['{', '[']
        for char in start_chars:
            if char in json_string:
                start_index = json_string.find(char)
                if start_index > 0:
                    logger.debug(f"Removing {start_index} characters before '{char}' in JSON string")
                    json_string = json_string[start_index:]
                break
        
        # Strip whitespace
        json_string = json_string.strip()
        
        return json_string

    def _parse_json_with_correction(self, json_string: str, context: str = "JSON") -> Optional[Dict]:
        """
        Parse JSON with automatic correction for minor errors
        
        Args:
            json_string: The JSON string to parse
            context: Context for logging (e.g., "mind map", "settings")
            
        Returns:
            Parsed JSON dictionary or None if all correction attempts failed
        """
        # Preprocess the JSON string
        original_json = json_string
        json_string = self._preprocess_json_string(json_string)
        
        if json_string != original_json:
            logger.debug(f"Preprocessed {context} JSON string (removed prefix)")
        
        try:
            # First attempt: direct parsing
            return json.loads(json_string)
            
        except json.JSONDecodeError as e:
            logger.warning(f"Initial {context} JSON parsing failed: {e}")
            logger.debug(f"Raw {context} JSON: {json_string}")
            
            # Attempt correction
            corrected_data, attempts = self._attempt_json_correction(
                invalid_json=json_string,
                error_details=f"JSON parsing error: {str(e)}"
            )
            
            if corrected_data:
                logger.info(f"{context} JSON successfully corrected after {attempts} attempts")
                return corrected_data
            else:
                logger.error(f"Failed to correct {context} JSON after {attempts} attempts")
                return None

    def process_session_mind_map(self, session_id: str, use_random_seed: bool = False) -> Optional[MindMapCreate]:
        """
        Process all transcripts from a session to generate a mind map
        
        Args:
            session_id: Session ID to process
            use_random_seed: Whether to add randomness to the generation
            
        Returns:
            MindMapCreate object with the processing results, or None if failed
        """
        try:
            # Get all transcripts for the session
            session_transcripts = self.db_service.get_session_transcripts(session_id)
            
            if not session_transcripts:
                logger.warning(f"No transcripts found for session {session_id}")
                return None
            
            # Combine all transcript texts
            combined_text = "\n\n".join([
                f"[Transcript {t.id}]: {t.text}" 
                for t in session_transcripts
            ])
            
            logger.info(f"Generating mind map for session {session_id} with {len(session_transcripts)} transcripts")
            
            # Create mind map prompt
            prompt = self.create_mind_map_prompt(combined_text, session_id, use_random_seed)
            
            start_time = time.time()
            
            # Call Ollama
            response = ollama.chat(
                model=self.model_name,
                messages=[
                    {
                        'role': 'user',
                        'content': prompt
                    }
                ]
            )
            
            # Extract the response
            llm_response = response['message']['content']
            processing_time = time.time() - start_time
            
            logger.info(f"Mind map generation completed in {processing_time:.2f} seconds")
            
            # Parse the JSON response with correction
            mind_map_data = self._parse_json_with_correction(llm_response, "mind map")
            
            if mind_map_data is None:
                logger.error("Failed to parse mind map JSON even after correction attempts")
                return None
            
            # Validate the structure
            if 'nodes' not in mind_map_data or 'edges' not in mind_map_data:
                logger.error("Invalid mind map structure: missing nodes or edges")
                return None
            
            # Create the result object
            result = MindMapCreate(
                session_id=session_id,
                nodes=json.dumps(mind_map_data['nodes']),
                edges=json.dumps(mind_map_data['edges']),
                prompt=prompt,
                model=self.model_name,
                processing_time=processing_time
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to generate mind map for session {session_id}: {e}")
            return None
