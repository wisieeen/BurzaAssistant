@echo off
echo Starting TypeScript + FastAPI + SQLite Learning Project...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: Python is not installed or not in PATH
    echo Backend will not start. Please install Python to run the backend.
    echo.
)

REM Start frontend
echo Starting Frontend (React + TypeScript)...
echo Frontend will be available at: http://localhost:3000
echo.
cd frontend
start "Frontend Dev Server" cmd /k "npm run dev"

REM Wait a moment for frontend to start
timeout /t 3 /nobreak >nul

REM Start backend (if Python is available)
echo Starting Backend (FastAPI)...
echo Backend will be available at: http://localhost:8000
echo.
cd ..\backend
start "Backend Dev Server" cmd /k "python -m uvicorn main:app --reload --port 8000"

echo.
echo Development servers are starting...
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:8000
echo.
echo Press any key to close this window...
pause >nul

