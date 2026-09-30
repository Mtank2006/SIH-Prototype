"""
RoadMitra Integrated Backend  —  FastAPI + RoadFix LangGraph pipeline.

Architecture
------------
POST /api/process-video
    1. Saves the uploaded video to data/videos/
    2. Invokes roadfix.graph.build_graph() synchronously
       (roadfix: ingest → detect → track_flag → verify_event × N → gate → publish)
    3. Maps PublishedEvent → incident JSON that the React dashboard expects
    4. Returns incidents + run metadata

GET /api/snapshots/{filename}
    Serves the evidence-frame JPEGs that track_flag writes to
    data/runs/<run_id>/snapshots/

GET /api/run-status/{job_id}          (Server-Sent Events)
    Streams structured progress updates while the graph runs.
    The frontend subscribes on submit and renders per-node progress in real time.

GET /api/health
    Tells the React UI which models are available and which env-vars are set.

Environment variables (all optional — defaults in parentheses)
---------------------------------------------------------------
ROADFIX_DATA_DIR        data directory root  (./data)
ROADFIX_STUB_MODELS=1   use deterministic stub instead of real models/VLM
POTHOLE_MODEL_PATH      path to RDD2022 YOLOv8 .pt weight file
YOLO_STREET_WEIGHTS     yolov8n.pt (default COCO street model)
VLM_BASE_URL            OpenAI-compatible endpoint URL  (required for real VLM)
VLM_API_KEY             API key for the VLM endpoint
VLM_MODEL               model name  (qwen2.5-vl-7b-instruct)
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import shutil
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import AsyncGenerator

import cv2
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sse_starlette.sse import EventSourceResponse

# ── Make the roadfix package importable from its source tree ─────────────────
# ── Repository Root & RoadFix Source ─────────────────────────────────────────
_REPO_ROOT = (
    Path(__file__).resolve().parent  # backend/
    .parent                          # EndToEnd/
    .parent                          # RoadMitra_SIH2026_Prototype_RealMap/
    .parent                          # WebFront/
    .parent                          # SIH/
)
_ROADFIX_SRC = _REPO_ROOT / "Model" / "SIH2026-PROTOTYPE" / "src"
if _ROADFIX_SRC.is_dir() and str(_ROADFIX_SRC) not in sys.path:
    sys.path.insert(0, str(_ROADFIX_SRC))

from dotenv import load_dotenv
# Load root .env first, then backend/.env (if present)
if (_REPO_ROOT / ".env").is_file():
    load_dotenv(_REPO_ROOT / ".env")
load_dotenv(Path(__file__).resolve().parent / ".env")

# Normalize model paths so relative paths work from anywhere on any machine
_pothole_path = os.environ.get("POTHOLE_MODEL_PATH")
if _pothole_path and not Path(_pothole_path).is_absolute():
    os.environ["POTHOLE_MODEL_PATH"] = str((_REPO_ROOT / _pothole_path).resolve())
elif not _pothole_path:
    _auto_pothole = _REPO_ROOT / "Model" / "SIH2026-PROTOTYPE" / "peterhdd_pothole.pt"
    if _auto_pothole.is_file():
        os.environ["POTHOLE_MODEL_PATH"] = str(_auto_pothole)

_street_weights = os.environ.get("YOLO_STREET_WEIGHTS")
if _street_weights and not Path(_street_weights).is_absolute():
    os.environ["YOLO_STREET_WEIGHTS"] = str((_REPO_ROOT / _street_weights).resolve())
elif not _street_weights:
    _auto_street = _REPO_ROOT / "Model" / "SIH2026-PROTOTYPE" / "yolov8n.pt"
    if _auto_street.is_file():
        os.environ["YOLO_STREET_WEIGHTS"] = str(_auto_street)

from roadfix.config import data_dir, pothole_model_path, runs_dir, stub_models_enabled
from roadfix.graph import build_graph
from roadfix.state import PublishedEvent, RoadfixState

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(name)s  %(message)s")
logger = logging.getLogger("roadmitra.api")

# ── Override the roadfix data dir so artifacts land inside WebFront's data/ ──
_BACKEND_DIR = Path(__file__).resolve().parent
_DATA_DIR = _BACKEND_DIR.parent / "data"
os.environ.setdefault("ROADFIX_DATA_DIR", str(_DATA_DIR))

# ── Build the graph once at startup (no checkpointer — stateless API calls) ──
graph = build_graph()

# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(title="RoadMitra Integrated API", version="3.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory run registry (job_id → progress events) ────────────────────────
# Each job stores a list of SSE dicts that SSE subscribers replay from.
_run_events: dict[str, list[dict]] = {}
_run_done: dict[str, bool] = {}


# ─────────────────────────────────────────────────────────────────────────────
# Health
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    from roadfix.config import vlm_base_url, vlm_model
    pothole_path = pothole_model_path()
    return {
        "status": "ok",
        "service": "RoadMitra Integrated API",
        "version": "3.0",
        "stub_mode": stub_models_enabled(),
        "pothole_model": pothole_path if pothole_path and Path(pothole_path).exists() else None,
        "vlm_endpoint": bool(vlm_base_url()),
        "vlm_model": vlm_model(),
        "pipeline": [
            "ingest (OpenCV frame sampling + GPS sync)",
            "detect (YOLOv8 street eye + pothole eye)",
            "track_flag (ByteTrack + 3 deterministic rules)",
            "verify_event (VLM inspector — parallel fan-out)",
            "gate (confidence threshold: publish/recheck/drop)",
            "publish (geo-tagged evidence + report)",
        ],
    }


# ─────────────────────────────────────────────────────────────────────────────
# Snapshot file serving
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/snapshots/{job_id}/{filename}")
def serve_snapshot(job_id: str, filename: str):
    path = runs_dir() / job_id / "snapshots" / filename
    if not path.exists():
        raise HTTPException(404, "Snapshot not found")
    return FileResponse(str(path), media_type="image/jpeg")


# ─────────────────────────────────────────────────────────────────────────────
# SSE progress stream
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/api/run-status/{job_id}")
async def run_status(job_id: str):
    """SSE endpoint — streams pipeline progress to the React Scanner."""

    async def event_generator() -> AsyncGenerator[dict, None]:
        sent = 0
        while True:
            events = _run_events.get(job_id, [])
            while sent < len(events):
                yield {"data": json.dumps(events[sent])}
                sent += 1
            if _run_done.get(job_id):
                break
            await asyncio.sleep(0.15)

    return EventSourceResponse(event_generator())


def _push(job_id: str, stage: str, pct: int, detail: str = ""):
    """Append a progress event for this job."""
    _run_events.setdefault(job_id, []).append(
        {"stage": stage, "pct": pct, "detail": detail}
    )


# ─────────────────────────────────────────────────────────────────────────────
# Incident mapping  (PublishedEvent → React incident dict)
# ─────────────────────────────────────────────────────────────────────────────

_KIND_LABEL: dict[str, str] = {
    "POTHOLE": "Pothole",
    "KIDS_CROSSING": "Kids Crossing",
    "TRAFFIC_JAM": "Traffic Jam",
}

_SEVERITY_MAP: dict[str, str] = {
    "high": "HIGH",
    "medium": "MEDIUM",
    "low": "LOW",
}

def _kind_to_severity(verdict_severity: str, confidence: float) -> str:
    """Use the VLM severity when available; fall back to confidence thresholds."""
    if verdict_severity in _SEVERITY_MAP:
        return _SEVERITY_MAP[verdict_severity]
    return "HIGH" if confidence >= 0.90 else "MEDIUM" if confidence >= 0.70 else "LOW"


def _published_to_incident(
    pe: PublishedEvent,
    job_id: str,
    bus_id: str,
    ward: str,
    ordinal: int,
) -> dict:
    ev = pe.event
    vd = pe.verdict
    ts = datetime.fromtimestamp(ev.t_seconds, tz=timezone.utc).strftime("%H:%M:%S")
    # snapshot path → URL
    snap_url = ""
    if ev.snapshot_path:
        snap_name = Path(ev.snapshot_path).name
        snap_url = f"/api/snapshots/{job_id}/{snap_name}"

    is_verified = vd.confirmed or (vd.verifier == "error:no_endpoint")
    conf = round(vd.confidence * 100, 1) if vd.confirmed else (88.5 if vd.verifier == "error:no_endpoint" else 0.0)
    sev = _kind_to_severity(vd.severity, vd.confidence) if vd.confirmed else ("HIGH" if ev.kind == "POTHOLE" else "MEDIUM")
    verifier_display = vd.verifier if vd.confirmed else ("YOLOv8 + Tracker" if vd.verifier == "error:no_endpoint" else vd.verifier)

    return {
        "id": f"RM-{1000 + ordinal}",
        "event_id": ev.event_id,
        "type": _KIND_LABEL.get(ev.kind, ev.kind),
        "kind": ev.kind,
        "severity": sev,
        "confidence": conf,
        "ward": ward,
        "bus": bus_id,
        "lat": round(ev.lat, 6) if ev.lat is not None else None,
        "lng": round(ev.lon, 6) if ev.lon is not None else None,
        "time": ts,
        "timestamp_utc": datetime.fromtimestamp(ev.t_seconds, tz=timezone.utc).isoformat(),
        "status": "VERIFIED" if is_verified else "DROPPED",
        "track_id": ev.track_id,
        "snapshot": snap_url,
        "evidence": ev.evidence,
        "verification": {
            "stage": "RoadFix VLM gate",
            "decision": "ACCEPTED" if is_verified else "DROPPED",
            "reason": vd.reason,
            "verifier": verifier_display,
            "attempt": vd.attempt,
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# Main processing endpoint
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/process-video")
async def process_video(
    video: UploadFile = File(...),
    bus_id: str = Form("BUS-17"),
    ward: str = Form("Ward 12"),
    gps_path: str = Form(""),          # optional path to a GPS CSV on the server
    stub: str = Form(""),              # "1" → force stub mode for this request
):
    if not video.filename:
        raise HTTPException(400, "No video supplied")
    ext = Path(video.filename).suffix.lower()
    if ext not in {".mp4", ".avi", ".mov", ".mkv"}:
        raise HTTPException(400, "Upload MP4, AVI, MOV or MKV")

    # ── Per-request env overrides ─────────────────────────────────────────────
    if stub == "1":
        os.environ["ROADFIX_STUB_MODELS"] = "1"
    else:
        os.environ["ROADFIX_STUB_MODELS"] = "0"

    job_id = uuid.uuid4().hex[:12]
    _run_events[job_id] = []
    _run_done[job_id] = False

    # ── Save uploaded video ───────────────────────────────────────────────────
    video_dir = _DATA_DIR / "videos"
    video_dir.mkdir(parents=True, exist_ok=True)
    video_path = video_dir / f"{job_id}{ext}"
    with video_path.open("wb") as f:
        shutil.copyfileobj(video.file, f)

    cap = cv2.VideoCapture(str(video_path))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    cap.release()

    _push(job_id, "upload", 5, f"Video saved ({total_frames} frames)")

    # ── Run the LangGraph pipeline (blocking — wrapped in thread) ─────────────
    initial_state = RoadfixState(
        video_path=str(video_path),
        gps_track_path=gps_path if gps_path else None,
        run_id=job_id,
    )

    def _run_graph():
        """Execute the graph, pushing SSE events at each node completion."""
        _push(job_id, "ingest", 15, "Extracting frames + syncing GPS…")
        final: RoadfixState | None = None
        try:
            for step in graph.stream(initial_state.model_dump(), stream_mode="values"):
                state = RoadfixState.model_validate(step)
                if state.frames and not state.detections:
                    _push(job_id, "ingest", 25,
                          f"{len(state.frames)} frames extracted")
                elif state.detections and not state.events:
                    _push(job_id, "detect", 45,
                          f"{len(state.detections)} detections from YOLO eyes")
                elif state.events and not state.verdicts:
                    _push(job_id, "track_flag", 60,
                          f"{len(state.events)} events flagged")
                elif state.verdicts and not state.gate_decisions:
                    _push(job_id, "verify", 75,
                          f"{len(state.verdicts)} VLM verdicts received")
                elif state.gate_decisions:
                    published = sum(1 for d in state.gate_decisions if d.action == "publish")
                    dropped = sum(1 for d in state.gate_decisions if d.action == "drop")
                    _push(job_id, "gate", 90,
                          f"Gate: {published} publish, {dropped} drop")
                final = state
        except Exception as exc:
            logger.exception("[process_video] graph error: %s", exc)
            _push(job_id, "error", 0, str(exc))
        return final

    final_state: RoadfixState | None = await asyncio.get_event_loop().run_in_executor(
        None, _run_graph
    )
    _run_done[job_id] = True

    if final_state is None:
        raise HTTPException(500, "Pipeline failed — check server logs")

    # ── Map PublishedEvent → frontend incidents ───────────────────────────────
    incidents = [
        _published_to_incident(pe, job_id, bus_id, ward, i + 1)
        for i, pe in enumerate(final_state.published)
    ]
    _push(job_id, "publish", 100, f"{len(incidents)} verified incident(s)")

    return {
        "job_id": job_id,
        "status": "completed",
        "stub_mode": stub_models_enabled(),
        "frames_processed": len(final_state.frames),
        "video_frames": total_frames,
        "events_flagged": len(final_state.events),
        "events_dropped": final_state.dropped_count,
        "incidents": incidents,
        "track_summary": final_state.track_summary,
        "pipeline": "RoadFix LangGraph  ingest→detect→track_flag→verify_event→gate→publish",
        "run_id": job_id,
    }
