# RoadMitra — SIH 2026 Integrated End-to-End Prototype

> **v3.0 — WebFront + Model fully integrated**
> The FastAPI backend now invokes the complete **RoadFix LangGraph pipeline** instead of the
> previous inline YOLO loop.

## Architecture

```
Bus CCTV + GPS
  → (upload via React dashboard)
  → FastAPI  [main.py]
       ↓
  RoadFix LangGraph graph
       ├─ ingest      : OpenCV frame sampling + GPS sync
       ├─ detect      : YOLOv8 street eye + pothole eye  (dual-model)
       ├─ track_flag  : ByteTrack IDs + 3 deterministic rules
       │                 (POTHOLE · KIDS_CROSSING · TRAFFIC_JAM)
       ├─ verify_event: VLM inspector — parallel fan-out per event
       ├─ gate        : confidence threshold (publish / recheck / drop)
       └─ publish     : geo-tagged evidence, map, report
       ↓
  Incident JSON  →  React control center
                    ├─ Live Scanner (per-stage progress)
                    ├─ Live Map     (OpenStreetMap + Leaflet)
                    ├─ Detections   (table with verifier info)
                    ├─ Evidence     (real snapshot photos)
                    └─ Analytics
```

## What is real in this version

- React/Vite operational dashboard (8 pages)
- FastAPI backend calling the full RoadFix LangGraph graph
- OpenCV video decoding/frame sampling (`ingest` node)
- Dual YOLOv8 inference: street eye (`yolov8n.pt`) + pothole eye (supply `POTHOLE_MODEL_PATH`)
- ByteTrack tracking (Ultralytics) with three deterministic rule engines
- VLM verification via any OpenAI-compatible endpoint (Qwen2.5-VL, etc.)
- Real evidence-frame JPEGs served from the backend
- Confidence-gate: publish / recheck / drop per event
- Stub mode for demo without GPU or VLM endpoint (`ROADFIX_STUB_MODELS=1`)
- Map, detection, evidence and analytics views

## What is intentionally an adapter point

- GPS: supply a GPS CSV via `gps_path` form field, or leave blank (lat/lon = None in output)
- Work-order persistence: currently frontend demo state — connect to DB in next phase
- VLM provider: any OpenAI-compatible endpoint via `VLM_BASE_URL` / `VLM_API_KEY`

## Run

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1        # Windows
# source .venv/bin/activate         # Linux/Mac

pip install -r requirements.txt

# Copy and fill the env file
cp .env.example .env
# edit .env  (see variables below)

uvicorn main:app --reload --port 8000
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Environment variables (backend `.env`)

| Variable | Default | Notes |
|---|---|---|
| `ROADFIX_STUB_MODELS` | — | Set to `1` for demo mode (no GPU/VLM needed) |
| `POTHOLE_MODEL_PATH` | — | Path to RDD2022-trained YOLOv8 `.pt` |
| `YOLO_STREET_WEIGHTS` | `yolov8n.pt` | Street-eye COCO model |
| `VLM_BASE_URL` | — | OpenAI-compatible VLM endpoint |
| `VLM_API_KEY` | — | API key for the VLM |
| `VLM_MODEL` | `qwen2.5-vl-7b-instruct` | Model name |
| `FRAMES_PER_SECOND` | `2.5` | Frame sampling rate |
| `ROADFIX_DATA_DIR` | `./data` | Root for frames/runs/snapshots |

## SIH demo recommendation

Set `ROADFIX_STUB_MODELS=1` for a repeatable, GPU-free demo.
Supply a short pre-recorded bus-camera road video.
For real inference: provide `POTHOLE_MODEL_PATH` (RDD2022 YOLOv8 weight)
and a running VLM endpoint via `VLM_BASE_URL`.
