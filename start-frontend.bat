@echo off
echo Starting Frontend (React + TypeScript)...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if dependencies are installed
if not exist "frontend\node_modules" (
    echo Installing frontend dependencies...
    cd frontend
    npm install
    cd ..
)

REM Start frontend
echo Starting development server...
echo Frontend will be available at: http://localhost:3000
echo.
cd frontend
npm run dev

pause

