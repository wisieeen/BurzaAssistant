from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import routes
from routes import transcription, websocket, database, llm, settings, sessions, mind_maps

# Import database
from database import create_tables

# Import background tasks
from tasks.background_tasks import start_background_tasks, stop_background_tasks

# Create FastAPI application instance
app = FastAPI(
    title="Voice Assistant Backend",
    description="Backend API for voice assistant application with Whisper transcription",
    version="1.0.0"
)

# Configure CORS to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Frontend dev server (port 3000)
        "http://127.0.0.1:3000",  # Frontend dev server (port 3000)
        "http://localhost:5173",  # Default Vite dev server
        "http://127.0.0.1:5173",  # Default Vite dev server
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(transcription.router)
app.include_router(websocket.router)
app.include_router(database.router)
app.include_router(llm.router)
app.include_router(settings.router)
app.include_router(sessions.router)
app.include_router(mind_maps.router)

# Initialize database tables on startup
@app.on_event("startup")
async def startup_event():
    """Initialize database tables and start background tasks on application startup"""
    create_tables()
    #await start_background_tasks() //disabled because not necessary

@app.on_event("shutdown")
async def shutdown_event():
    """Stop background tasks on application shutdown"""
    await stop_background_tasks()

@app.get("/")
async def root():
    """Root endpoint to verify API is running"""
    return {
        "message": "Voice Assistant Backend API is running!",
        "features": ["whisper-transcription"],
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "voice-assistant-backend"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
