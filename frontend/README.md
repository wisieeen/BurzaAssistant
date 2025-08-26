# Voice Assistant Frontend

## Overview
A comprehensive React + TypeScript application for real-time voice transcription, AI analysis, and session management with an advanced panel-based interface. Features include interactive mind maps, LLM-powered session analysis, and full session management capabilities.

## Current Implementation

### ✅ **Fully Built Features**
- **Advanced Panel System**: 2x2 grid layout with drag-and-drop reordering and expand/collapse functionality
- **Real-time Voice Input**: Live audio capture with WebSocket streaming to backend
- **Transcription Display**: Real-time transcription with session-aware history
- **LLM Summary Panel**: AI-powered session analysis with Ollama integration
- **Interactive Mind Maps**: Force-directed graph visualization with zoom, pan, and drag capabilities
- **Session Management**: Complete session lifecycle with content persistence
- **Settings Panel**: Comprehensive configuration for Whisper, Ollama, and audio processing
- **WebSocket Integration**: Real-time communication with backend for live updates

### 🎯 **Core Features**
- **Real-time Audio Processing**: Live audio capture and streaming
- **Session Persistence**: All data persists across panel interactions
- **Interactive Visualizations**: Mind maps with physics-based layout
- **AI Integration**: LLM analysis and mind map generation
- **Responsive Design**: Works in both normal and expanded panel modes
- **Modern UI**: Tailwind CSS with shadcn/ui components
- **Type Safety**: Full TypeScript implementation

### 🏗️ **Architecture**
- **Components**: Modular React components with TypeScript
- **State Management**: Centralized state in WorkingArea with context providers
- **Services**: Audio capture, WebSocket, webhook, and configuration services
- **Layout**: CSS Grid-based panel system with drag-and-drop
- **Styling**: Tailwind CSS with custom design system and shadcn/ui
- **Icons**: Lucide React icons
- **Real-time**: WebSocket communication for live updates

## Panel Structure

### **Current 2x2 Grid Layout**
```
┌─────────────────┬─────────────────┐
│   Mind Map      │  Transcription  │
│ (Interactive)   │   (Live Text)   │
├─────────────────┼─────────────────┤
│ LLM Summary     │    Settings     │
│ (AI Analysis)   │ (Configuration) │
└─────────────────┴─────────────────┘
```

### **Panel Types**
- **Mind Map Panel**: Interactive concept visualization with force-directed layout
- **Transcription Panel**: Real-time transcription display with session history
- **LLM Summary Panel**: AI-powered session analysis and insights
- **Settings Panel**: Comprehensive system configuration

### **Panel Features**
- **Drag & Drop**: Reorder panels using @dnd-kit
- **Expand/Collapse**: Full-screen panel expansion
- **Session Integration**: All panels are session-aware
- **State Persistence**: Data persists across panel interactions

## Services & Integration

### **Audio Capture Service**
- Real-time audio capture from microphone
- Configurable chunk duration and accumulation
- Audio level monitoring and visualization
- WebSocket streaming to backend

### **WebSocket Service**
- Real-time communication with backend
- Session-aware connections
- Transcription result handling
- LLM analysis and mind map updates

### **Webhook Services**
- Incoming webhook processing
- Audio level updates from backend
- Error handling and validation

### **Configuration Service**
- Backend API integration
- Settings management
- Session data loading
- Error handling and fallbacks

## File Structure
```
src/
├── components/
│   ├── layout/
│   │   ├── Sidebar/              # App sidebar with controls
│   │   ├── WorkingArea/          # Main panel area with grid
│   │   └── panels/               # Individual panel components
│   │       ├── MindMapPanel.tsx      # Interactive mind maps
│   │       ├── TranscriptionPanel.tsx # Real-time transcription
│   │       ├── LLMSummaryPanel.tsx    # AI analysis display
│   │       ├── SettingsPanel.tsx      # Configuration interface
│   │       ├── VoiceInputPanel.tsx    # Audio input controls
│   │       └── Panel.tsx              # Base panel component
│   └── ui/                       # shadcn/ui components
├── contexts/
│   └── PanelLayoutContext.tsx    # Panel layout state management
├── lib/
│   ├── audioCaptureService.ts    # Audio capture and processing
│   ├── websocketService.ts       # WebSocket communication
│   ├── webhookService.ts         # Outgoing webhook handling
│   ├── webhookReceiver.ts        # Incoming webhook processing
│   └── utils.ts                  # Utility functions
├── types/
│   └── voice.ts                  # TypeScript interfaces
└── config/
    └── backend.ts                # Backend configuration
```

## Key Technologies

### **Frontend Framework**
- **React 18**: Modern React with hooks and context
- **TypeScript**: Full type safety throughout
- **Vite**: Fast development and build tooling

### **UI & Styling**
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: High-quality React components
- **Lucide React**: Beautiful icon library
- **@dnd-kit**: Drag and drop functionality

### **Real-time Communication**
- **WebSocket**: Real-time bidirectional communication
- **Audio APIs**: Web Audio API for audio capture
- **Webhook**: HTTP-based event handling

### **State Management**
- **React Context**: Panel layout and global state
- **useState/useEffect**: Local component state
- **Centralized State**: WorkingArea manages all panel state

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Backend Integration

### **Required Backend Services**
- **FastAPI Backend**: Running on localhost:8000
- **Ollama**: Local LLM service for AI analysis
- **WebSocket Server**: Real-time communication
- **SQLite Database**: Session and content storage

### **API Endpoints Used**
- **WebSocket**: `/ws/audio` for real-time streaming
- **Sessions**: `/api/sessions/*` for session management
- **Settings**: `/api/settings/*` for configuration
- **LLM**: `/llm/*` for AI processing
- **Mind Maps**: `/api/sessions/*/mind-maps` for visualization

## Features in Detail

### **Real-time Audio Processing**
- Live microphone capture
- Audio level visualization
- WebSocket streaming to backend
- Session-aware recording

### **Interactive Mind Maps**
- Force-directed graph layout
- Zoom, pan, and drag interactions
- Session-specific mind maps
- Real-time updates from LLM

### **AI-Powered Analysis**
- LLM session analysis
- Real-time insights generation
- Session-specific summaries
- Processing time tracking

### **Session Management**
- Session creation and switching
- Content persistence
- Historical data loading
- Session-specific visualizations

### **Advanced UI**
- Drag-and-drop panel reordering
- Panel expansion/collapse
- Responsive design
- Modern component library

## Learning Focus
This implementation demonstrates:
- **Advanced React Patterns**: Context, hooks, and component composition
- **Real-time Applications**: WebSocket and audio streaming
- **Interactive Visualizations**: Canvas-based graphics and physics
- **State Management**: Complex state coordination across components
- **TypeScript**: Full type safety in a complex application
- **Modern UI/UX**: Responsive design and user interactions
- **Service Architecture**: Modular service-based design
- **Backend Integration**: Comprehensive API integration

## Status
✅ **PRODUCTION READY** - The frontend is fully implemented with all features working, comprehensive error handling, and production-ready architecture.
