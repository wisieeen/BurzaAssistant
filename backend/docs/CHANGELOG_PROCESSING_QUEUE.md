# Processing Queue Management - Changelog

## Overview

Implemented a processing queue management system to prevent overlapping LLM operations when larger models are processing, ensuring system stability and preventing queue buildup.

## Changes Made

### 1. Added ProcessingStateManager Class

**File**: `backend/services/llm_service.py`

- Added `ProcessingStateManager` class to track active processing operations
- Session-based tracking with operation type separation (summary vs mind_map)
- Async-safe implementation using asyncio locks
- Automatic cleanup of session state when no operations are active

**Key Methods**:
- `is_processing(session_id, operation_type)` - Check if processing is active
- `start_processing(session_id, operation_type)` - Start processing with lock
- `stop_processing(session_id, operation_type)` - Stop processing and cleanup
- `get_processing_status(session_id)` - Get detailed processing status

### 2. Updated LLM Service Methods

**File**: `backend/services/llm_service.py`

- Made `process_session_transcripts()` async and added processing state checks
- Made `process_session_mind_map()` async and added processing state checks
- Added proper error handling with guaranteed state cleanup
- Prevents new processing when operations are already running

**Changes**:
```python
# Before: Direct processing
result = llm_service.process_session_transcripts(session_id)

# After: Async with state management
result = await llm_service.process_session_transcripts(session_id)
```

### 3. Updated WebSocket Service

**File**: `backend/services/websocket_service.py`

- Added processing state checks before triggering new processing
- Added `send_processing_status()` method to notify clients
- Updated `process_session_after_new_transcript()` to skip when processing
- Updated `generate_and_send_mind_map()` to use async methods

**Key Changes**:
- Checks processing state before starting new operations
- Sends processing status updates to clients
- Prevents queue buildup during active processing

### 4. Updated API Routes

**Files**: 
- `backend/routes/llm.py`
- `backend/routes/mind_maps.py`

- Updated route handlers to use async LLM service methods
- Added new endpoint `/api/llm/processing-status/{session_id}` for status checks
- Maintained backward compatibility with existing API structure

### 5. Added Documentation

**Files**:
- `backend/docs/PROCESSING_QUEUE_MANAGEMENT.md` - Complete system documentation
- `backend/docs/CHANGELOG_PROCESSING_QUEUE.md` - This changelog

## New API Endpoints

### GET /api/llm/processing-status/{session_id}

Returns processing status for a session:

```json
{
  "success": true,
  "session_id": "session-123",
  "summary_processing": false,
  "mind_map_processing": true,
  "any_processing": true,
  "summary_start_time": null,
  "mind_map_start_time": 1640995200.0
}
```

## New WebSocket Messages

### processing_status

Sent when processing state changes:

```json
{
  "type": "processing_status",
  "data": {
    "session_id": "session-123",
    "summary_processing": false,
    "mind_map_processing": true,
    "any_processing": true,
    "summary_start_time": null,
    "mind_map_start_time": 1640995200.0
  },
  "timestamp": "2024-01-01T12:00:00Z",
  "sessionId": "session-123"
}
```

## Benefits

1. **Prevents Queue Buildup**: New processing requests are ignored when operations are active
2. **System Stability**: Prevents memory and resource exhaustion
3. **Better User Experience**: Clients receive status updates about processing state
4. **Independent Operations**: Summary and mind map generation can run in parallel
5. **Automatic Recovery**: Processing state is automatically cleaned up

## Backward Compatibility

- All existing API endpoints continue to work
- WebSocket connections maintain existing functionality
- No breaking changes to client applications
- New features are additive and optional

## Testing

- Created and ran comprehensive tests for ProcessingStateManager
- Verified concurrent processing prevention
- Confirmed proper state cleanup
- All tests passed successfully

## Migration Notes

- No database migrations required
- No configuration changes needed
- Existing sessions continue to work normally
- New processing queue management is automatically active

