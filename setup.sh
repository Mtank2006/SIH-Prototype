#!/usr/bin/env bash
# ==============================================================================
# RoadMitra (SIH 2026) — Complete Automated Setup Script
# ==============================================================================
# Supports: Ubuntu / Debian / Fedora / Arch / macOS
# Usage:
#   chmod +x setup.sh
#   ./setup.sh
# ==============================================================================

set -e

# ANSI color formatting
GREEN="\033[0;32m"
BLUE="\033[0;34m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
BOLD="\033[1m"
RESET="\033[0m"

echo -e "\n${BOLD}${BLUE}=================================================================${RESET}"
echo -e "${BOLD}${GREEN}   RoadMitra (SIH 2026 - Problem SIH26124) Full-Stack Setup     ${RESET}"
echo -e "${BOLD}${BLUE}=================================================================${RESET}\n"

# 1. Determine Repository Root
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"
echo -e "${BLUE}[1/7] Repository root:${RESET} $REPO_ROOT"

# 2. Check System Prerequisites
echo -e "\n${BLUE}[2/7] Checking system prerequisites...${RESET}"

if ! command -v python3 &>/dev/null; then
    echo -e "${RED}[✗] Error: python3 is not installed or not in PATH.${RESET}"
    echo "    Please install Python 3.10+ (recommended: Python 3.11 or 3.12)."
    exit 1
fi

PY_VER=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
echo -e "  [✓] Found Python ${GREEN}${PY_VER}${RESET}"

if ! command -v node &>/dev/null; then
    echo -e "${RED}[✗] Error: Node.js is not installed or not in PATH.${RESET}"
    echo "    Please install Node.js (v18+) from https://nodejs.org/"
    exit 1
fi
echo -e "  [✓] Found Node.js ${GREEN}$(node -v)${RESET}"

if ! command -v npm &>/dev/null; then
    echo -e "${RED}[✗] Error: npm is not installed or not in PATH.${RESET}"
    exit 1
fi
echo -e "  [✓] Found npm ${GREEN}v$(npm -v)${RESET}"

# 3. Setup Python Virtual Environment
echo -e "\n${BLUE}[3/7] Setting up Python virtual environment (.venv)...${RESET}"
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
    echo -e "  [✓] Created new virtual environment at ${GREEN}.venv${RESET}"
else
    echo -e "  [✓] Using existing virtual environment at ${GREEN}.venv${RESET}"
fi

source .venv/bin/activate
pip install --upgrade pip --quiet

# 4. Install Python Dependencies
echo -e "\n${BLUE}[4/7] Installing Python backend & AI dependencies...${RESET}"
pip install -r requirements.txt
pip install -e Model/SIH2026-PROTOTYPE --no-deps
echo -e "  [✓] Python packages and editable 'roadfix' model package installed."

# 5. Environment Configuration (.env)
echo -e "\n${BLUE}[5/7] Configuring environment variables...${RESET}"
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "  [✓] Created root ${GREEN}.env${RESET} from .env.example template."
else
    echo -e "  [✓] Root ${GREEN}.env${RESET} file already exists."
fi

BACKEND_DIR="WebFront/RoadMitra_SIH2026_Prototype_RealMap/RoadMitra_SIH2026_EndToEnd/backend"
if [ ! -f "$BACKEND_DIR/.env" ]; then
    cp .env.example "$BACKEND_DIR/.env"
    echo -e "  [✓] Created backend ${GREEN}.env${RESET}."
fi

# Ensure data directories exist
mkdir -p WebFront/RoadMitra_SIH2026_Prototype_RealMap/RoadMitra_SIH2026_EndToEnd/data/videos
mkdir -p WebFront/RoadMitra_SIH2026_Prototype_RealMap/RoadMitra_SIH2026_EndToEnd/data/runs
mkdir -p WebFront/RoadMitra_SIH2026_Prototype_RealMap/RoadMitra_SIH2026_EndToEnd/data/evidence

# 6. Download Model Weights
echo -e "\n${BLUE}[6/7] Checking & downloading YOLO model weights...${RESET}"
python scripts/download_models.py

# 7. Install Frontend Dependencies
echo -e "\n${BLUE}[7/7] Installing Frontend dependencies (npm)...${RESET}"
FRONTEND_DIR="WebFront/RoadMitra_SIH2026_Prototype_RealMap/RoadMitra_SIH2026_EndToEnd/frontend"
if [ -d "$FRONTEND_DIR" ]; then
    (cd "$FRONTEND_DIR" && npm install)
    echo -e "  [✓] Frontend packages installed."
else
    echo -e "${YELLOW}[!] Frontend directory not found at $FRONTEND_DIR${RESET}"
fi

# Final Verification
echo -e "\n${BLUE}Verifying backend test suite...${RESET}"
python -m pytest Model/SIH2026-PROTOTYPE/tests/ -k "test_config or test_detectors" -q --tb=short
echo -e "  [✓] Core sanity tests passed successfully!"

echo -e "\n${BOLD}${GREEN}=================================================================${RESET}"
echo -e "${BOLD}${GREEN}   Setup complete! RoadMitra is ready to launch.                ${RESET}"
echo -e "${BOLD}${GREEN}=================================================================${RESET}\n"
echo -e "To start both backend and frontend servers, run:"
echo -e "  ${BOLD}${YELLOW}./start_servers.sh${RESET}\n"
echo -e "Or start them individually:"
echo -e "  ${BOLD}Backend:${RESET}  source .venv/bin/activate && uvicorn --app-dir WebFront/RoadMitra_SIH2026_Prototype_RealMap/RoadMitra_SIH2026_EndToEnd/backend main:app --reload --port 8000"
echo -e "  ${BOLD}Frontend:${RESET} cd WebFront/RoadMitra_SIH2026_Prototype_RealMap/RoadMitra_SIH2026_EndToEnd/frontend && npm run dev\n"
