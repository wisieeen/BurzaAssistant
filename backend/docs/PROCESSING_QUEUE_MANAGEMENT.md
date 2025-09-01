# Processing Queue Management

## Overview

The processing queue management system prevents overlapping LLM operations when larger models are processing, ensuring system stability and preventing queue buildup.

## Problem Solved

When larger LLM models are used, inference can take a long time. During this time, new audio recordings continue to arrive and trigger processing requests, which can:
- Overwhelm the system
- Create a backlog of processing requests
- Cause memory issues
- Lead to inconsistent results

## Solution

### Processing State Manager

The `ProcessingStateManager` class tracks active processing operations per session:

- **Session-based tracking**: Each session has independent processing state
- **Operation type separation**: Summary and mind map generation are tracked separately
- **Async-safe**: Uses asyncio locks for thread safety
- **Automatic cleanup**: Removes session state when no operations are active

### Key Features

1. **Processing Lock**: Prevents new processing requests when operations are already running
2. **Operation Separation**: Summary and mind map generation can run independently
3. **Status Tracking**: Monitors start times and processing duration
4. **Automatic Cleanup**: Removes session state when processing completes

## Implementation

### Processing State Manager

```python
class ProcessingStateManager:
    async def is_processing(self, session_id: str, operation_type: str = "any") -> bool
    async def start_processing(self, session_id: str, operation_type: str) -> bool
    async def stop_processing(self, session_id: str, operation_type: str)
    async def get_processing_status(self, session_id: str) -> Dict[str, Any]
```

### LLM Service Integration

The LLM service methods now check processing state before starting:

```python
async def process_session_transcripts(self, session_id: str):
    # Check if already processing
    if await processing_state.is_processing(session_id, "summary"):
        logger.info(f"Session {session_id} already processing summary, skipping")
        return None
    
    # Start processing
    if not await processing_state.start_processing(session_id, "summary"):
        return None
    
    try:
        # Perform LLM processing
        # ...
    finally:
        # Always stop processing when done
        await processing_state.stop_processing(session_id, "summary")
```

### WebSocket Integration

The WebSocket service checks processing state before triggering new processing:

```python
async def process_session_after_new_transcript(self, session_id: str):
    # Check if already processing
    if await processing_state.is_processing(session_id, "any"):
        logger.info(f"Session {session_id} already processing, skipping")
        # Send processing status to client
        await self.send_processing_status(session_id)
        return
```

## API Endpoints

### Get Processing Status

```
GET /api/llm/processing-status/{session_id}
```

Returns:
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

## WebSocket Messages

### Processing Status Update

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

## Configuration

No additional configuration is required. The system automatically:
- Tracks processing state per session
- Prevents overlapping operations
- Cleans up state when processing completes
- Provides status information via API and WebSocket

## Monitoring

The system logs processing state changes:
- When processing starts/stops
- Processing duration
- Skipped processing attempts
- State cleanup events

This provides visibility into the processing queue management system's operation.

