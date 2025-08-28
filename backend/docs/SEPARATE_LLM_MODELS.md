# Separate LLM Models for Summary and Mind Map

## Overview

The application now supports separate LLM models for different tasks, allowing users to choose the most appropriate model for each specific use case.

## New Features

### 1. Separate Model Selection

Users can now choose different models for:
- **Summary Analysis**: Used for transcript analysis and generating summaries
- **Mind Map Generation**: Used for creating mind maps from session transcripts
- **General Model**: Legacy model for backward compatibility

### 2. Database Schema Changes

Added new columns to the `user_settings` table:
- `ollama_summary_model`: Model for summary analysis
- `ollama_mind_map_model`: Model for mind map generation

### 3. Backend Changes

#### Database Model Updates
- **File**: `backend/database/models.py`
- Added `ollama_summary_model` and `ollama_mind_map_model` columns
- Both default to the same value as the legacy `ollama_model`

#### Settings Service Updates
- **File**: `backend/services/settings_service.py`
- Updated `get_settings_dict()` to include new model fields
- Updated `update_settings_from_dict()` to handle new fields
- Updated `create_user_settings()` to set default values

#### LLM Service Updates
- **File**: `backend/services/llm_service.py`
- Added `summary_model` and `mind_map_model` properties
- Updated `_update_settings_from_service()` to load separate models
- Modified processing methods to use appropriate models:
  - `process_transcript()` uses `summary_model`
  - `process_session_transcripts()` uses `summary_model`
  - `process_session_mind_map()` uses `mind_map_model`
  - `_attempt_json_correction()` uses `mind_map_model`
- Updated `get_model_info()` to return information for all three models

#### API Updates
- **File**: `backend/routes/settings.py`
- Updated `/api/settings/apply-temporary` to handle new model fields
- Added support for `ollamaSummaryModel` and `ollamaMindMapModel` in temporary settings

### 4. Frontend Changes

#### Settings Panel Updates
- **File**: `frontend/src/components/layout/panels/SettingsPanel.tsx`
- Updated `SessionSettings` interface to include new model fields
- Added separate model selectors with color coding:
  - **Blue**: Summary Analysis Model
  - **Green**: Mind Map Model
  - **Gray**: General Model (Legacy)
- Updated `loadSettingsFromBackend()` to handle new fields
- Updated `handleApplySettings()` to send new model fields
- Added fallback logic to use legacy model if new fields are not available

## How It Works

### Model Selection Flow

1. **Frontend**: User selects different models for summary and mind map tasks
2. **Settings**: Models are stored in the database or applied temporarily
3. **Backend**: LLM service loads the appropriate model for each task
4. **Processing**: Each task uses its designated model

### Task-Specific Model Usage

- **Transcript Analysis**: Uses `summary_model`
- **Session Summaries**: Uses `summary_model`
- **Mind Map Generation**: Uses `mind_map_model`
- **JSON Correction**: Uses `mind_map_model` (for mind map JSON fixes)

### Backward Compatibility

- Existing installations will have the new model fields default to the legacy model value
- The legacy `ollama_model` field is still supported for backward compatibility
- All existing functionality continues to work without changes

## API Changes

### Model Info Endpoint
```
GET /llm/model-info
```

**Response**:
```json
{
  "general_model": "model-name",
  "summary_model": "model-name", 
  "mind_map_model": "model-name",
  "general_available": true,
  "summary_available": true,
  "mind_map_available": true,
  "all_models": ["model1", "model2", ...],
  "status": "connected"
}
```

### Temporary Settings
```
POST /api/settings/apply-temporary
```

**Request Body**:
```json
{
  "ollamaSummaryModel": "model-name",
  "ollamaMindMapModel": "model-name",
  "ollamaTaskPrompt": "prompt text",
  "ollamaMindMapPrompt": "mind map prompt"
}
```

## Benefits

1. **Task Optimization**: Choose the best model for each specific task
2. **Performance**: Use faster models for simple tasks, more powerful models for complex ones
3. **Flexibility**: Different models may excel at different types of analysis
4. **Resource Management**: Balance speed vs. quality based on task requirements

## Usage Examples

### Scenario 1: Speed vs. Quality
- **Summary Model**: `phi4-mini:latest` (fast, good for quick summaries)
- **Mind Map Model**: `llama3.2-uncensored:latest` (more powerful, better for complex mind maps)

### Scenario 2: Specialized Models
- **Summary Model**: `mistral:latest` (good at analysis and summarization)
- **Mind Map Model**: `codellama:latest` (good at structured output like JSON)

### Scenario 3: Resource Optimization
- **Summary Model**: `tiny-llama:latest` (very fast, lower quality)
- **Mind Map Model**: `llama3.2-uncensored:latest` (slower, higher quality)

## Migration Notes

- Existing databases are automatically migrated with the new columns
- Default values are set to the current `ollama_model` value
- No data loss occurs during migration
- All existing functionality remains intact
