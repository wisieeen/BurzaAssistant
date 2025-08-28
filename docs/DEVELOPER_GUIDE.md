# Developer Guide - Voice Assistant Panel-Based Application

## Quick Start

### 1. Project Setup
```bash
# Frontend
cd frontend
npm install
npm run dev

# Backend
cd backend
pip install -r requirements.txt
python main.py
```

### 2. Key Files to Modify
- `frontend/src/App.tsx` - Main application layout with audio controls
- `frontend/src/components/layout/` - Layout components (Sidebar, WorkingArea, Panels)
- `frontend/src/types/voice.ts` - TypeScript interfaces
- `frontend/src/contexts/PanelLayoutContext.tsx` - Panel layout state management
- `frontend/src/lib/` - Core services (audio, websocket, webhook)

## Component Architecture

### Layout Hierarchy
```
App
├── Sidebar
│   ├── Audio Controls (Start/Stop)
│   ├── Connection Status
│   ├── Audio Level Indicator
│   └── Settings Button
└── WorkingArea
    ├── Top Bar (Title, Connection Status, Settings)
    └── PanelContainer
        └── PanelGrid (2x2 Grid)
            └── Panel[]
                ├── PanelHeader
                ├── PanelContent
                └── PanelResizer (Drag & Drop)
```

### State Flow
```
User Action → Component → Context → State Update → Re-render
Audio Input → AudioCaptureService → WebSocket → Backend → Transcription → Panel Update
```

## Key TypeScript Interfaces

### Panel Interface (Actual Implementation)
```typescript
interface PanelData {
  id: string
  type: 'input' | 'output' | 'control' | 'settings' | 'llm_summary' | 'mind_map'
  title: string
  gridPosition: { row: number; col: number }
}

interface PanelLayout {
  id: string
  type: 'input' | 'output' | 'control' | 'settings'
  gridPosition: { row: number; col: number }
  gridSpan: { rows: number; cols: number }
  isVisible: boolean
  isMinimized: boolean
}
```

### Voice/Transcription Types
```typescript
interface TranscriptionSegment {
  id: string
  text: string
  timestamp: Date
  confidence: number
  isFinal: boolean
}

interface RecordingState {
  isRecording: boolean
  isPaused: boolean
  startTime: Date | null
  duration: number
  audioLevel: number
}

interface VoiceSettings {
  language: string
  audioQuality: 'low' | 'medium' | 'high'
  autoSave: boolean
  noiseReduction: boolean
  hotkey: string
}
```

### Layout State (Actual Implementation)
```typescript
interface PanelLayoutContextType {
  panels: PanelData[]
  expandedPanelId: string | null
  movePanel: (fromIndex: number, toIndex: number) => void
  getPanelAtPosition: (row: number, col: number) => PanelData | undefined
  expandPanel: (panelId: string) => void
  collapsePanel: () => void
}
```

## Available Panels

### Current Panel Types
1. **Mind Map Panel** (`mind_map`) - Visual mind mapping with automatic generation
2. **Transcription Panel** (`output`) - Real-time transcription display
3. **LLM Summary Panel** (`llm_summary`) - AI-powered session analysis
4. **Settings Panel** (`settings`) - Application configuration
5. **Session Management Panel** - Session history and management
6. **Audio Processing Panel** - Audio capture and processing controls
7. **Voice Input Panel** - Voice input interface
8. **Controls Panel** - General application controls

### Initial Panel Layout (2x2 Grid)
```typescript
const initialPanels: PanelData[] = [
  {
    id: 'mind-map-panel',
    type: 'mind_map',
    title: 'Mind Map',
    gridPosition: { row: 0, col: 0 }
  },
  {
    id: 'transcription-panel',
    type: 'output',
    title: 'Transcription',
    gridPosition: { row: 0, col: 1 }
  },
  {
    id: 'llm-summary-panel',
    type: 'llm_summary',
    title: 'Session Analysis',
    gridPosition: { row: 1, col: 0 }
  },
  {
    id: 'settings-panel',
    type: 'settings',
    title: 'Settings',
    gridPosition: { row: 1, col: 1 }
  }
]
```

## Core Services

### Audio Capture Service (`lib/audioCaptureService.ts`)
- Real-time audio recording and streaming
- Audio level monitoring
- Configurable chunk size and accumulation
- WebSocket integration for backend communication

### WebSocket Service (`lib/websocketService.ts`)
- Real-time communication with FastAPI backend
- Transcription streaming
- Session management
- Error handling and reconnection

### Webhook Service (`lib/webhookService.ts`)
- Backend webhook integration
- Event-driven updates
- Data synchronization

## Common Patterns

### 1. Panel Creation
```typescript
const newPanel: PanelData = {
  id: generateId(),
  type: 'input',
  title: 'New Panel',
  gridPosition: { row: 0, col: 0 }
};
```

### 2. Panel Repositioning (Drag & Drop)
```typescript
const movePanel = (fromIndex: number, toIndex: number) => {
  setPanels(prevPanels => {
    const newPanels = [...prevPanels]
    const [movedPanel] = newPanels.splice(fromIndex, 1)
    newPanels.splice(toIndex, 0, movedPanel)
    
    // Update grid positions based on new order
    return newPanels.map((panel, index) => ({
      ...panel,
      gridPosition: {
        row: Math.floor(index / 2),
        col: index % 2
      }
    }))
  })
}
```

### 3. Panel Expansion/Collapse
```typescript
const expandPanel = (panelId: string) => {
  setExpandedPanelId(panelId)
}

const collapsePanel = () => {
  setExpandedPanelId(null)
}
```

### 4. Audio Integration
```typescript
// Initialize audio capture
const success = await AudioCaptureService.initialize({
  sampleRate: 16000,
  channels: 1,
  chunkDuration: 500,
  chunksToAccumulate: 10,
  audioLevelThreshold: 10
})

// Start recording
const success = await AudioCaptureService.startRecording()

// Monitor audio levels
AudioCaptureService.onAudioLevelChange((data: AudioLevelData) => {
  setAudioLevel(data.level)
})
```

## CSS Grid Implementation

### Basic Grid Setup (2x2 Layout)
```css
.panel-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 16px;
  height: 100%;
  width: 100%;
}
```

### Panel Grid Positioning
```css
.panel {
  grid-row: var(--grid-row);
  grid-column: var(--grid-col);
  min-height: 200px;
  min-width: 300px;
}
```

### Responsive Grid
```css
/* Mobile: Single column */
@media (max-width: 768px) {
  .panel-container {
    grid-template-columns: 1fr;
    grid-template-rows: repeat(4, 1fr);
  }
}

/* Tablet: Two columns */
@media (min-width: 769px) and (max-width: 1024px) {
  .panel-container {
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: repeat(2, 1fr);
  }
}
```

## Performance Tips

### 1. Memoization
```typescript
const Panel = React.memo(({ panel, onResize, onSwap }) => {
  // Component logic
});
```

### 2. Audio Service Optimization
```typescript
// Initialize audio service once at app level
useEffect(() => {
  AudioCaptureService.initialize(config)
  return () => AudioCaptureService.cleanup()
}, [])
```

### 3. Drag and Drop Optimization
```typescript
const handleDragEnd = useCallback((result: DragEndEvent) => {
  if (result.destination) {
    movePanel(result.source.index, result.destination.index)
  }
}, [movePanel])
```

## Testing Strategy

### 1. Unit Tests
- Panel layout calculations
- Audio service functionality
- WebSocket communication
- Context state management

### 2. Integration Tests
- Panel interactions
- Audio recording workflow
- Real-time transcription
- Session management

### 3. E2E Tests
- Complete voice-to-transcription workflow
- Panel drag and drop
- Settings persistence
- Cross-browser compatibility

## Common Issues & Solutions

### 1. Audio Initialization
**Issue**: Audio capture fails to initialize
**Solution**: Check browser permissions and microphone access

### 2. WebSocket Connection
**Issue**: Real-time updates not working
**Solution**: Verify backend is running and CORS is configured

### 3. Panel Layout Persistence
**Issue**: Layout not saving between sessions
**Solution**: Implement localStorage with panel state

### 4. Mobile Responsiveness
**Issue**: Poor mobile experience
**Solution**: Implement responsive breakpoints and touch gestures

## Backend Integration

### WebSocket Events
```typescript
// Transcription updates
socket.on('transcription:update', (data) => {
  updateTranscription(data);
});

// Session analysis
socket.on('analysis:complete', (data) => {
  updateSessionAnalysis(data);
});

// Mind map updates
socket.on('mindmap:update', (data) => {
  updateMindMap(data);
});
```

### API Endpoints
```typescript
// Settings
GET /api/settings/
POST /api/settings/

// Sessions
GET /api/sessions/
POST /api/sessions/
GET /api/sessions/{id}

// Transcription
POST /api/transcription/
GET /api/transcription/{id}

// Mind Maps
POST /api/mind-maps/
GET /api/mind-maps/{id}
```

## Development Workflow

### 1. Feature Development
1. Define TypeScript interfaces in `types/voice.ts`
2. Implement component in `components/layout/panels/`
3. Add to panel registry in `contexts/PanelLayoutContext.tsx`
4. Test functionality with audio input
5. Optimize performance and responsiveness

### 2. Code Review Checklist
- [ ] TypeScript types defined
- [ ] Component is memoized if needed
- [ ] Error handling implemented
- [ ] Audio integration tested
- [ ] Mobile responsiveness verified
- [ ] WebSocket communication working
- [ ] Tests written

### 3. Deployment Checklist
- [ ] All tests passing
- [ ] Audio capture working
- [ ] WebSocket connection stable
- [ ] Cross-browser testing
- [ ] Mobile testing
- [ ] Documentation updated

## Grid System Advantages

### 1. **Predictable Layout**
- Fixed 2x2 grid prevents overlapping
- Consistent spacing and alignment
- Easy to maintain and debug

### 2. **Responsive Design**
- Automatically adapts to screen size
- Mobile-first approach
- Touch-friendly drag and drop

### 3. **Performance**
- CSS Grid is browser-optimized
- Minimal JavaScript calculations
- Smooth animations and transitions

### 4. **Accessibility**
- Better screen reader support
- Keyboard navigation
- Semantic HTML structure

## Audio Processing Pipeline

### 1. **Audio Capture**
- Browser MediaRecorder API
- Configurable sample rate and channels
- Real-time audio level monitoring

### 2. **Data Streaming**
- WebSocket connection to FastAPI backend
- Chunked audio data transmission
- Automatic reconnection handling

### 3. **Transcription**
- Real-time Whisper processing
- Confidence scoring
- Final vs interim results

### 4. **Analysis**
- LLM-powered session analysis
- Mind map generation
- Historical data persistence

## Settings Management

### Settings Types
1. **Persistent Settings**: Stored in database, survive application restarts
2. **Temporary Settings**: Applied immediately but not saved to database

### Settings Application Flow
1. **Frontend**: User modifies settings in SettingsPanel
2. **Apply Now (Temporary)**: 
   - Updates audio capture settings immediately
   - Sends LLM settings to backend for temporary application
   - Settings are applied to current session only
3. **Save Settings**: 
   - Saves all settings to database
   - Settings persist across application restarts

### LLM Settings Fix
**Issue**: The "Apply Now (Temporary)" button was not updating LLM analysis prompts because LLMService instances were created fresh each time and weren't aware of temporary settings. The WebSocketService and API routes were creating separate SettingsService instances, so temporary settings weren't shared.

**Solution**: 
1. Added class-level temporary settings cache in SettingsService (shared across all instances)
2. Modified `get_or_create_user_settings()` to apply temporary settings
3. Added `/api/settings/apply-temporary` endpoint
4. Updated frontend to send LLM settings for temporary application
5. Ensured all SettingsService instances share the same temporary settings cache

**Result**: LLM analysis now uses the updated prompt immediately when "Apply Now (Temporary)" is clicked, regardless of which SettingsService instance is used.

