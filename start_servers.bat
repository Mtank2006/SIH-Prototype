@echo off
REM ==============================================================================
REM RoadMitra (SIH 2026) — Windows Launcher
REM ==============================================================================

echo =================================================================
echo    Starting RoadMitra Full-Stack Application
echo =================================================================
echo.
echo   Backend API:   http://127.0.0.1:8000
echo   API Docs:      http://127.0.0.1:8000/docs
echo   Frontend UI:   http://localhost:5173
echo.
echo =================================================================

REM Activate virtual environment
if exist ".venv\Scripts\activate.bat" (
    call .venv\Scripts\activate.bat
)

REM Start Backend in new window
start "RoadMitra Backend (FastAPI)" cmd /k "python -m uvicorn --app-dir WebFront\RoadMitra_SIH2026_Prototype_RealMap\RoadMitra_SIH2026_EndToEnd\backend main:app --host 0.0.0.0 --port 8000 --reload"

REM Start Frontend in new window
start "RoadMitra Frontend (Vite)" cmd /k "cd WebFront\RoadMitra_SIH2026_Prototype_RealMap\RoadMitra_SIH2026_EndToEnd\frontend && npm run dev"

echo Servers started in separate command windows.
pause
