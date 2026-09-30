#!/usr/bin/env bash
# ==============================================================================
# RoadMitra (SIH 2026) — Dual Server Launcher (Backend + Frontend)
# ==============================================================================
# Usage:
#   chmod +x start_servers.sh
#   ./start_servers.sh
# Press Ctrl+C to terminate both servers cleanly.
# ==============================================================================

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"

# Activate Python virtual environment
if [ -f "$REPO_ROOT/.venv/bin/activate" ]; then
    source "$REPO_ROOT/.venv/bin/activate"
elif [ -f "$REPO_ROOT/Model/SIH2026-PROTOTYPE/.venv/bin/activate" ]; then
    source "$REPO_ROOT/Model/SIH2026-PROTOTYPE/.venv/bin/activate"
elif [ -f "$REPO_ROOT/WebFront/RoadMitra_SIH2026_Prototype_RealMap/RoadMitra_SIH2026_EndToEnd/backend/.venv/bin/activate" ]; then
    source "$REPO_ROOT/WebFront/RoadMitra_SIH2026_Prototype_RealMap/RoadMitra_SIH2026_EndToEnd/backend/.venv/bin/activate"
fi

BACKEND_DIR="$REPO_ROOT/WebFront/RoadMitra_SIH2026_Prototype_RealMap/RoadMitra_SIH2026_EndToEnd/backend"
FRONTEND_DIR="$REPO_ROOT/WebFront/RoadMitra_SIH2026_Prototype_RealMap/RoadMitra_SIH2026_EndToEnd/frontend"

# Clean shutdown handler
cleanup() {
    echo -e "\n\033[1;33m[!] Stopping RoadMitra servers...\033[0m"
    if [ -n "$BACKEND_PID" ]; then
        kill "$BACKEND_PID" 2>/dev/null || true
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill "$FRONTEND_PID" 2>/dev/null || true
    fi
    wait 2>/dev/null || true
    echo -e "\033[1;32m[✓] All servers stopped cleanly.\033[0m"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

echo -e "\033[1;34m=================================================================\033[0m"
echo -e "\033[1;32m   Starting RoadMitra Full-Stack Application                    \033[0m"
echo -e "\033[1;34m=================================================================\033[0m"
echo -e "  Backend API:       \033[1;36mhttp://127.0.0.1:8000\033[0m"
echo -e "  Interactive Docs:  \033[1;36http://127.0.0.1:8000/docs\033[0m"
echo -e "  Frontend UI:       \033[1;36mhttp://localhost:5173\033[0m"
echo -e "\033[1;34m=================================================================\033[0m\n"

# 1. Start FastAPI backend
python -m uvicorn --app-dir "$BACKEND_DIR" main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Wait briefly for backend port to bind
sleep 1.5

# 2. Start Vite frontend
npm --prefix "$FRONTEND_DIR" run dev &
FRONTEND_PID=$!

echo -e "\n\033[1;32m[✓] Both servers running. Press Ctrl+C anytime to stop.\033[0m\n"

# Wait for both processes
wait
