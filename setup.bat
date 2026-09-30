@echo off
REM ==============================================================================
REM RoadMitra (SIH 2026) — Automated Setup Script for Windows
REM ==============================================================================

echo =================================================================
echo    RoadMitra (SIH 2026 - Problem SIH26124) Windows Setup
echo =================================================================
echo.

REM 1. Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH.
    echo Please install Python 3.10+ from https://www.python.org/
    pause
    exit /b 1
)

REM 2. Check Node & npm
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js (v18+) from https://nodejs.org/
    pause
    exit /b 1
)

REM 3. Virtual Environment
echo [1/5] Setting up Python virtual environment (.venv)...
if not exist ".venv" (
    python -m venv .venv
    echo [OK] Created .venv
) else (
    echo [OK] Using existing .venv
)

call .venv\Scripts\activate.bat
python -m pip install --upgrade pip --quiet

REM 4. Dependencies
echo [2/5] Installing Python backend and AI dependencies...
pip install -r requirements.txt
pip install -e Model\SIH2026-PROTOTYPE --no-deps

REM 5. Environment configuration
echo [3/5] Setting up configuration files...
if not exist ".env" (
    copy .env.example .env
    echo [OK] Created root .env
)
if not exist "WebFront\RoadMitra_SIH2026_Prototype_RealMap\RoadMitra_SIH2026_EndToEnd\backend\.env" (
    copy .env.example WebFront\RoadMitra_SIH2026_Prototype_RealMap\RoadMitra_SIH2026_EndToEnd\backend\.env
    echo [OK] Created backend .env
)

REM 6. Model Weights
echo [4/5] Downloading YOLO model weights...
python scripts\download_models.py

REM 7. Frontend
echo [5/5] Installing Frontend packages...
cd WebFront\RoadMitra_SIH2026_Prototype_RealMap\RoadMitra_SIH2026_EndToEnd\frontend
call npm install
cd ..\..\..\..

echo.
echo =================================================================
echo   Setup Complete! To start RoadMitra, run: start_servers.bat
echo =================================================================
echo.
pause
