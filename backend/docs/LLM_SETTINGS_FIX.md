# LLM Settings Temporary Application Fix

## Issue Description

The frontend was failing to apply LLM settings temporarily with the error:
```
SettingsPanel.tsx:296 Failed to apply LLM settings to backend, but audio settings were updated
```

## Root Cause

The issue was in the `SettingsService.get_or_create_user_settings()` method. When temporary settings were applied, they were being set directly on the database object instead of creating a proper copy. This caused issues with SQLAlchemy's object state management and prevented the temporary settings from being properly applied to LLM service instances.

## Solution Implemented

### 1. Fixed Settings Service Copy Logic

**File**: `backend/services/settings_service.py`

- Modified `get_or_create_user_settings()` to create a proper copy of the settings object using `copy.copy()`
- Applied temporary settings to the copy instead of the original database object
- Added better logging to track temporary settings application

### 2. Enhanced LLM Service Settings Update

**File**: `backend/services/llm_service.py`

- Added more detailed logging in `_update_settings_from_service()` to track when settings change
- Added `force_refresh_settings()` method for debugging and manual refresh
- Improved logging to show temporary settings values

### 3. Improved Temporary Settings API

**File**: `backend/routes/settings.py`

- Added proper logging import
- Enhanced `/api/settings/apply-temporary` endpoint to return detailed settings summary
- Added `/api/settings/temporary-settings` GET endpoint for debugging
- Added `/api/settings/temporary-settings` DELETE endpoint to clear temporary settings

### 4. Better Error Handling and Logging

- Added comprehensive logging throughout the temporary settings flow
- Improved error messages and debugging information
- Added settings summary in API responses

## How It Works Now

1. **Frontend sends LLM settings** to `/api/settings/apply-temporary`
2. **Backend stores settings** in `SettingsService._temporary_settings` (class-level cache)
3. **LLM service instances** read settings from `SettingsService.get_or_create_user_settings()`
4. **Temporary settings are applied** to a copy of the database settings object
5. **LLM service picks up** the temporary settings immediately

## Testing

The fix was verified with a comprehensive test that:
- Applied temporary LLM settings
- Verified the LLM service picked up the new settings
- Confirmed settings could be cleared properly
- Checked that the model name changed as expected

## API Endpoints

### Apply Temporary Settings
```
POST /api/settings/apply-temporary
Content-Type: application/json

{
  "ollamaModel": "model-name",
  "ollamaTaskPrompt": "prompt text",
  "ollamaMindMapPrompt": "mind map prompt"
}
```

### Get Temporary Settings
```
GET /api/settings/temporary-settings
```

### Clear Temporary Settings
```
DELETE /api/settings/temporary-settings
```

## Files Modified

1. `backend/services/settings_service.py` - Fixed copy logic and added debugging
2. `backend/services/llm_service.py` - Enhanced settings update and logging
3. `backend/routes/settings.py` - Added new endpoints and improved logging

## Result

LLM settings can now be applied temporarily and are immediately picked up by the LLM service for processing transcripts and generating mind maps.
