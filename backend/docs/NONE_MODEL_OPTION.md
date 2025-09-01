# None Model Option Feature

## Overview

The 'none' model option allows users to effectively disable specific types of LLM processing (summary analysis or mind map generation) by setting the model to 'none'. This is useful when users want to:

- Skip summary generation to save processing time
- Skip mind map generation to focus only on transcriptions
- Test the system without LLM processing
- Reduce resource usage

## Implementation Details

### Backend Changes

#### Settings Service (`backend/services/settings_service.py`)
- Added `validate_ollama_model()` method that accepts 'none' as a valid model
- Added `is_model_disabled()` method to check if a model is set to 'none'
- Both methods are used for validation and processing logic

#### LLM Service (`backend/services/llm_service.py`)
- Updated `process_transcript()` to check if summary model is 'none' and skip processing
- Updated `process_session_transcripts()` to check if summary model is 'none' and skip processing
- Updated `process_session_mind_map()` to check if mind map model is 'none' and skip processing
- Updated `get_model_info()` to properly handle 'none' models in availability checks

### Frontend Changes

#### Settings Panel (`frontend/src/components/layout/panels/SettingsPanel.tsx`)
- Added 'None (Disabled)' option to `FALLBACK_OLLAMA_MODELS`
- Updated `loadAvailableOllamaModels()` to include 'none' option when loading models from backend
- The 'none' option appears at the top of all model selection dropdowns

## Usage

### Setting Models to 'None'

1. Open the Settings panel in the frontend
2. In the "Summary Analysis Model" dropdown, select "None (Disabled)"
3. In the "Mind Map Model" dropdown, select "None (Disabled)"
4. Save the settings

### Behavior When Models are Set to 'None'

- **Summary Model = 'none'**: 
  - Individual transcript processing is skipped
  - Session summary generation is skipped
  - No LLM analysis results are generated

- **Mind Map Model = 'none'**:
  - Mind map generation is skipped
  - No mind map data is created for sessions

- **Both Models = 'none'**:
  - Only transcription occurs
  - No LLM processing of any kind

### Logging

When models are disabled, the system logs informative messages:
```
Summary model is disabled ('none'), skipping transcript 123
Mind map model is disabled ('none'), skipping session abc123
```

## API Response Changes

### Model Info Endpoint (`GET /llm/model-info`)

The response now includes additional fields for disabled models:

```json
{
  "general_model": "model-name",
  "summary_model": "none",
  "mind_map_model": "model-name",
  "general_available": true,
  "summary_available": true,
  "mind_map_available": true,
  "general_disabled": false,
  "summary_disabled": true,
  "mind_map_disabled": false,
  "all_models": ["model1", "model2", ...],
  "status": "connected"
}
```

## Validation

### Model Validation
- 'none' is accepted as a valid model name
- The system validates that 'none' is a string value
- No additional validation is performed for 'none' values

### Settings Validation
- Settings service accepts 'none' for all Ollama model fields
- Database stores 'none' as a string value
- Frontend properly displays 'none' as "None (Disabled)"

## Benefits

1. **Performance**: Skip unnecessary LLM processing to improve performance
2. **Resource Usage**: Reduce CPU and memory usage when LLM processing isn't needed
3. **Testing**: Easily test transcription without LLM overhead
4. **Flexibility**: Users can choose which features to enable/disable
5. **Cost Savings**: Reduce Ollama API calls when processing isn't required

## Backward Compatibility

- Existing installations continue to work without changes
- Default models remain the same for new installations
- The 'none' option is purely additive and doesn't break existing functionality
