# RoadMitra (RoadFix) — AI-Driven Road Infrastructure Platform

**Smart India Hackathon 2026** · **Problem Statement: SIH26124**  
*Automated Road Hazard Detection, GIS Mapping, and Municipal Workflow Engine from Public Transit Dashcam Feeds.*

[![Python 3.12](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green.svg)](https://fastapi.tiangolo.com/)
[![React 19](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![YOLOv8](https://img.shields.io/badge/YOLOv8-Ultralytics-orange.svg)](https://docs.ultralytics.com/)
[![LangGraph](https://img.shields.io/badge/LangGraph-0.4-purple.svg)](https://langchain-ai.github.io/langgraph/)
[![Tests](https://img.shields.io/badge/Tests-118%20Passed-brightgreen.svg)]()

---

## 1. System Overview

RoadMitra transforms public transit vehicles (city buses, municipal utility vans) into autonomous road inspection agents. By processing forward-facing dashcam video feeds, the system detects road hazards (potholes, structural damage, school zone congestion, traffic jams), georeferences incidents, validates them through a resilient multi-stage verification pipeline, and dispatches them to municipal wards for repair.

```
                      [ Public Transit Dashcam Video ]
                                      │
                                      ▼
                      ┌───────────────────────────────┐
                      │    RoadFix LangGraph Engine   │
                      │ ───────────────────────────── │
                      │  1. Ingest & Frame Slicing    │
                      │  2. Dual YOLO Eyes (Road+COCO)│
                      │  3. ByteTrack & Rule Trigger  │
                      │  4. VLM Multimodal Audit      │
                      │  5. Confidence Gatekeeper     │
                      └───────────────┬───────────────┘
                                      │
                         [ SSE Stream / REST API ]
                                      │
                                      ▼
                      ┌───────────────────────────────┐
                      │     RoadMitra Web Platform    │
                      │ ───────────────────────────── │
                      │  • Live Bus Video Scanner     │
                      │  • Virtual Window Inspector   │
                      │  • Interactive Ward Heatmap   │
                      │  • Repair Dispatch & SLA Ops  │
                      └───────────────────────────────┘
```

---

## 2. Key Capabilities

* **High-Precision Dedicated Pothole Detection:** Utilizes fine-tuned YOLOv8 pothole weights combined with lower-road Region of Interest (ROI) filtering to eliminate false positives from tree canopies, sky glare, and windshield reflections.
* **Continuous ByteTrack & IoU Tracking:** Tracks moving road entities, detects pedestrian dwell in school zones, measures traffic jam density, and deduplicates consecutive frames.
* **Live Scanner with Virtual Inspection Window:** Live scan dashboard with real-time Server-Sent Events (SSE) progress bar and an interactive modal to inspect full-resolution annotated evidence snapshots.
* **Interactive Municipal GIS Map:** Ward-level breakdown with color-coded severity markers, incident status filters, and repair work-order tracking.
* **Fail-Safe & Resilient:** Handles dropped GPS frames, unreadable video codecs, or unconfigured cloud endpoints gracefully without terminating the run.

---

## 3. Repository Structure

```
SIH/
├── Model/
│   └── SIH2026-PROTOTYPE/      # RoadFix AI Engine & LangGraph workflow
│       ├── src/roadfix/        # Detection, tracking, state graph, tools
│       ├── tests/              # 118 automated unit and end-to-end tests
│       └── pyproject.toml      # RoadFix package metadata
├── WebFront/
│   └── RoadMitra_SIH2026_Prototype_RealMap/
│       └── RoadMitra_SIH2026_EndToEnd/
│           ├── backend/        # FastAPI REST & SSE backend
│           ├── frontend/       # React + Vite + Tailwind + Leaflet UI
│           └── data/           # Evidence snapshots, video runs, databases
├── scripts/
│   └── download_models.py      # Automated YOLO weight downloader
├── setup.sh                    # 1-command installer (Linux / macOS)
├── setup.bat                   # 1-command installer (Windows)
├── start_servers.sh            # Concurrent server launcher (Linux / macOS)
├── start_servers.bat           # Concurrent server launcher (Windows)
├── requirements.txt            # Unified Python dependencies
├── .env.example                # Portable configuration template
├── .gitignore                  # GitHub safety & size exclusion filters
├── INSTALLATION.md             # Detailed installation instructions
└── README.md                   # This project guide
```

---

## 4. Quickstart (Under 2 Minutes)

### Prerequisites
* Python 3.10+ (recommended: 3.11 or 3.12)
* Node.js v18+ and npm
* Git

### Step 1: Clone and Run Automated Setup
**Linux / macOS:**
```bash
chmod +x setup.sh start_servers.sh
./setup.sh
```

**Windows:**
```cmd
setup.bat
```

### Step 2: Start the Application
**Linux / macOS:**
```bash
./start_servers.sh
```

**Windows:**
```cmd
start_servers.bat
```

Open your browser to **`http://localhost:5173`**.

---

## 5. Automated Verification & Testing

Verify that all 118 test suites in the AI pipeline pass:
```bash
source .venv/bin/activate
python -m pytest Model/SIH2026-PROTOTYPE/tests/ -x --tb=short
```

---

## 6. Pushing to GitHub (Step-by-Step)

This repository includes a comprehensive `.gitignore` that prevents huge binary files (YOLO weights, `.venv`, `node_modules`, test video files) from bloating the Git history or exceeding GitHub's 100 MB per-file limit.

Follow these steps to initialize and push this project to your GitHub account:

```bash
# 1. Initialize Git in the project root (if not already initialized)
git init -b main

# 2. Add all source files (large assets are safely ignored by .gitignore)
git add .

# 3. Create your first commit
git commit -m "feat: complete RoadMitra SIH2026 integrated prototype"

# 4. Link your GitHub remote repository
git remote add origin https://github.com/<your-username>/<your-repo-name>.git

# 5. Push your code to GitHub
git push -u origin main
```

---

## 7. License & Credits

Built for the **Smart India Hackathon 2026 (SIH26124)** by Team RoadMitra.
Licensed under the Apache 2.0 License.
