# RoadMitra (SIH 2026 - SIH26124) — Installation Guide

This guide provides full instructions for setting up and running the RoadMitra full-stack platform on **Linux**, **macOS**, and **Windows**.

---

## 1. Prerequisites

Ensure the following tools are installed on your system before proceeding:

| Dependency | Minimum Version | Check Command | Recommended Version |
| :--- | :--- | :--- | :--- |
| **Python** | 3.10+ | `python3 --version` | Python 3.11 or 3.12 |
| **Node.js** | v18+ | `node -v` | v20 LTS or v22 |
| **npm** | v9+ | `npm -v` | v10+ |
| **Git** | 2.25+ | `git --version` | Latest |

> **Hardware Requirements:** Minimum 8 GB RAM (16 GB recommended). GPU with CUDA acceleration is optional; CPU inference via PyTorch is supported out-of-the-box.

---

## 2. Quickstart (Automated 1-Command Setup)

### Linux / macOS

```bash
# 1. Clone repository
git clone https://github.com/<your-username>/<your-repo-name>.git
cd <your-repo-name>

# 2. Make scripts executable
chmod +x setup.sh start_servers.sh

# 3. Run automated setup
./setup.sh
```

### Windows

```cmd
:: 1. Clone repository
git clone https://github.com/<your-username>/<your-repo-name>.git
cd <your-repo-name>

:: 2. Run automated setup
setup.bat
```

The setup script automatically:
1. Validates Python, Node, and npm installations.
2. Creates and activates an isolated Python virtual environment (`.venv`).
3. Installs all required Python backend and AI packages (`ultralytics`, `supervision`, `fastapi`, `langgraph`, etc.).
4. Installs the `roadfix` model package in editable mode.
5. Copies `.env.example` to `.env` with portable relative paths.
6. Downloads pre-trained YOLOv8 weights (`peterhdd_pothole.pt` and `yolov8n.pt`) via `scripts/download_models.py`.
7. Installs frontend packages with `npm install`.
8. Runs test verification to confirm your environment is healthy.

---

## 3. Manual Step-by-Step Installation

If you prefer to configure the environment step-by-step manually, follow these instructions:

### Step 1: Create and Activate Python Virtual Environment

```bash
# From the repository root:
python3 -m venv .venv
source .venv/bin/activate       # On Windows: .venv\Scripts\activate
pip install --upgrade pip
```

### Step 2: Install Python Dependencies

```bash
pip install -r requirements.txt
pip install -e Model/SIH2026-PROTOTYPE --no-deps
```

### Step 3: Download Model Weights

Run the automated weights downloader:
```bash
python scripts/download_models.py
```
*This downloads `peterhdd_pothole.pt` (~22.5 MB) and `yolov8n.pt` (~6.5 MB) directly into `Model/SIH2026-PROTOTYPE/`.*

### Step 4: Setup Environment Variables

```bash
cp .env.example .env
cp .env.example WebFront/RoadMitra_SIH2026_Prototype_RealMap/RoadMitra_SIH2026_EndToEnd/backend/.env
```

### Step 5: Install Frontend Dependencies

```bash
cd WebFront/RoadMitra_SIH2026_Prototype_RealMap/RoadMitra_SIH2026_EndToEnd/frontend
npm install
cd ../../../../
```

---

## 4. Running the Application

### Option A: Launch Both Servers Concurrently (Recommended)

**Linux / macOS:**
```bash
./start_servers.sh
```

**Windows:**
```cmd
start_servers.bat
```

Both servers will start, and pressing `Ctrl+C` will shut them down cleanly.

### Option B: Run Servers in Separate Terminals

**Terminal 1 — FastAPI Backend:**
```bash
source .venv/bin/activate
uvicorn --app-dir WebFront/RoadMitra_SIH2026_Prototype_RealMap/RoadMitra_SIH2026_EndToEnd/backend main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 — React Frontend:**
```bash
cd WebFront/RoadMitra_SIH2026_Prototype_RealMap/RoadMitra_SIH2026_EndToEnd/frontend
npm run dev
```

---

## 5. Verifying the System

Open your browser to:
* **RoadMitra Dashboard & Scanner:** [http://localhost:5173](http://localhost:5173)
* **Backend Health Check:** [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)
* **FastAPI Interactive API Docs:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

To run the complete automated test suite:
```bash
source .venv/bin/activate
python -m pytest Model/SIH2026-PROTOTYPE/tests/ -x --tb=short
# Expected output: 118 passed
```

---

## 6. Configuration Options (`.env`)

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `ROADFIX_STUB_MODELS` | `0` | Set `0` for real YOLO detection; `1` for mock/stub mode. |
| `POTHOLE_MODEL_PATH` | `Model/SIH2026-PROTOTYPE/peterhdd_pothole.pt` | Path to trained pothole detector weights. |
| `YOLO_STREET_WEIGHTS` | `Model/SIH2026-PROTOTYPE/yolov8n.pt` | Path to street eye (vehicles, pedestrians). |
| `POTHOLE_CONF` | `0.18` | Pothole detection confidence threshold. |
| `FRAMES_PER_SECOND` | `20.0` | Frame extraction rate for video analysis. |
| `POTHOLE_IOU_MATCH` | `0.25` | IoU deduplication threshold for moving camera frames. |
| `ROAD_ROI_MIN_Y` | `0.35` | Discards candidate detections in top 35% of frame (sky/glare). |
| `VLM_BASE_URL` | *(optional)* | OpenAI-compatible endpoint for secondary VLM verification. |

---

## 7. Troubleshooting

* **Port 8000 or 5173 is already in use:**
  ```bash
  # Check and kill process on port 8000
  lsof -i :8000 | awk 'NR>1 {print $2}' | xargs kill -9 2>/dev/null
  # Check and kill process on port 5173
  lsof -i :5173 | awk 'NR>1 {print $2}' | xargs kill -9 2>/dev/null
  ```
* **"Temporary failure in name resolution" during download:**
  Ensure internet connectivity is enabled. If behind a proxy, set `HTTP_PROXY` and `HTTPS_PROXY` in your terminal.
* **Low GPU Memory / Out of Memory:**
  RoadMitra automatically falls back to CPU execution if no CUDA GPU is detected. You can also lower `FRAMES_PER_SECOND=10.0` in `.env` to process fewer frames.
