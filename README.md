# Voice Assistant - Full-Stack Application

![screenshot](/docs/Capture.PNG)

## Overview
A comprehensive voice assistant application featuring real-time transcription, AI-powered analysis, interactive mind maps, and session management. Built with modern technologies including React, TypeScript, FastAPI, SQLite, OpenAI Whisper, and Ollama.

## Project Structure
```
├── frontend/          # React + TypeScript application with advanced UI
├── backend/           # FastAPI Python backend with AI integration
├── docs/             # Project documentation and guides
├── start-dev.bat     # Development environment startup script
├── start-frontend.bat # Frontend-only startup script
└── .cursorrules      # Project-specific coding guidelines
```

## Features

### 🎤 **Real-time Voice Processing**
- Live audio capture and streaming
- Real-time transcription using OpenAI Whisper
- Audio level visualization and monitoring
- WebSocket-based communication

### 🤖 **AI-Powered Analysis**
- LLM integration with Ollama
- Session analysis and insights generation
- Interactive mind map creation
- Background processing capabilities

### 📊 **Advanced UI/UX**
- Panel-based interface with drag-and-drop
- Interactive mind maps with force-directed layout
- Real-time transcription display
- Session management and persistence
- Responsive design with modern components

### 🔧 **Session Management**
- Complete session lifecycle management
- Content persistence across sessions
- Historical data retrieval
- Session-specific visualizations

## Technology Stack

### **Frontend**
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** with shadcn/ui components
- **WebSocket** for real-time communication
- **Web Audio API** for audio capture
- **@dnd-kit** for drag-and-drop functionality

### **Backend**
- **FastAPI** with Python
- **SQLite** with SQLAlchemy ORM
- **OpenAI Whisper** for speech recognition
- **Ollama** for local LLM processing
- **WebSocket** for real-time communication
- **LangChain** for LLM integration

### **Development Tools**
- **TypeScript** for type safety
- **ESLint** for code quality
- **PostCSS** and **Autoprefixer** for CSS processing
- **Uvicorn** for ASGI server

## Prerequisites

### **System Requirements**
- **Node.js 18+** for frontend development
- **Python 3.8+** for backend services
- **FFmpeg** for audio processing
- **Ollama** for LLM features

### **FFmpeg Installation**
The backend requires FFmpeg binaries for audio processing.

**Windows:**
1. Download FFmpeg from [https://ffmpeg.org/download.html](https://ffmpeg.org/download.html)
2. Extract to a folder (e.g., `C:\ffmpeg`)
3. Add the `bin` folder to your system PATH
4. Restart your terminal

**macOS:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt update
sudo apt install ffmpeg
```

### **Ollama Installation**
Required for LLM features and AI analysis.

1. Install Ollama from [https://ollama.ai/](https://ollama.ai/)
2. Start the Ollama service: `ollama serve`
3. Pull a model: `ollama pull artifish/llama3.2-uncensored:latest`

## Quick Start

### **Option 1: Full Development Environment**
```bash
# Start both frontend and backend
./start-dev.bat
```

### **Option 2: Frontend Only**
```bash
# Start frontend only
./start-frontend.bat
```

### **Option 3: Manual Setup**
```bash
# Frontend
cd frontend
npm install
npm run dev

# Backend (in another terminal)
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Access Points
- **Frontend**: http://localhost:5173 (Vite dev server)
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## Architecture

### **Frontend Architecture**
- **Panel System**: 2x2 grid with drag-and-drop and expand/collapse
- **State Management**: Centralized state in WorkingArea with React Context
- **Services**: Audio capture, WebSocket, webhook, and configuration services
- **Components**: Modular React components with TypeScript interfaces

### **Backend Architecture**
- **API Routes**: RESTful endpoints for all features
- **WebSocket**: Real-time communication for audio streaming
- **Services**: Whisper, LLM, database, settings, and WebSocket services
- **Database**: SQLite with SQLAlchemy ORM

### **Data Flow**
1. **Audio Capture** → Frontend audio service
2. **WebSocket Streaming** → Backend WebSocket service
3. **Whisper Processing** → Real-time transcription
4. **LLM Analysis** → Session insights and mind maps
5. **Database Storage** → Session persistence
6. **UI Updates** → Real-time frontend updates

## Key Features in Detail

### **Real-time Transcription**
- Live microphone capture with audio level monitoring
- WebSocket streaming to backend for processing
- Real-time transcription display with session history
- Support for multiple audio formats

### **AI Analysis**
- LLM-powered session analysis using Ollama
- Customizable prompts for different analysis types
- Background processing for large sessions
- Processing time tracking and optimization

### **Interactive Mind Maps**
- Force-directed graph layout algorithm
- Zoom, pan, and drag interactions
- Session-specific mind map generation
- Real-time updates from LLM processing

### **Session Management**
- Session creation, switching, and persistence
- Content organization by session
- Historical data retrieval and display
- Session-specific visualizations

### **Settings & Configuration**
- Whisper language and model configuration
- Ollama model selection and management
- Audio processing parameters
- Session preferences and defaults

## Development Guidelines

### **Code Quality**
- Follow the `.cursorrules` guidelines
- Use TypeScript for type safety
- Implement proper error handling
- Write comprehensive documentation

### **Learning Focus**
- Understand data flow between layers
- Learn modern React patterns and hooks
- Master FastAPI and SQLAlchemy
- Explore real-time communication patterns

### **Best Practices**
- Keep components modular and reusable
- Implement proper state management
- Use TypeScript interfaces for type safety
- Follow RESTful API design principles

## Troubleshooting

### **Common Issues**
1. **Port conflicts**: Change ports in startup scripts
2. **FFmpeg not found**: Ensure FFmpeg is in system PATH
3. **Ollama not running**: Start Ollama service before using LLM features
4. **Audio permissions**: Grant microphone access in browser
5. **Database issues**: Check file permissions and disk space

### **Development Tips**
- Use browser dev tools for frontend debugging
- Check FastAPI logs for backend issues
- Monitor WebSocket connections for real-time issues
- Use the interactive API docs at `/docs`

## Status
Do stuff, already useful as brainstorimng assistant. Application needs some polishes though to eliminate weird behaviour and add QoL improvements.
