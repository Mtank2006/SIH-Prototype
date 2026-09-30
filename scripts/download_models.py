#!/usr/bin/env python3
"""
RoadMitra Model Weights Downloader
Downloads pre-trained YOLOv8 weights needed for the RoadMitra pipeline:
1. peterhdd_pothole.pt (~22.5 MB) - YOLOv8 dedicated pothole detection model
2. yolov8n.pt (~6.5 MB)         - COCO street eye (vehicles, pedestrians)

Usage:
    python scripts/download_models.py
"""

from __future__ import annotations

import os
import sys
import time
import urllib.request
from pathlib import Path

# Target directory: Model/SIH2026-PROTOTYPE
_REPO_ROOT = Path(__file__).resolve().parent.parent
_MODEL_DIR = _REPO_ROOT / "Model" / "SIH2026-PROTOTYPE"

MODELS: list[dict[str, str | int]] = [
    {
        "name": "peterhdd_pothole.pt",
        "url": "https://huggingface.co/peterhdd/yolov8-pothole/resolve/main/best.pt",
        "min_size": 20_000_000,  # ~22.5 MB
        "desc": "YOLOv8 Dedicated Pothole Detector",
    },
    {
        "name": "yolov8n.pt",
        "url": "https://github.com/ultralytics/assets/releases/download/v8.2.0/yolov8n.pt",
        "min_size": 5_000_000,   # ~6.5 MB
        "desc": "YOLOv8n COCO Street Eye",
    },
]


def _format_size(num_bytes: int) -> str:
    """Format bytes into human-readable string."""
    for unit in ["B", "KB", "MB", "GB"]:
        if abs(num_bytes) < 1024.0:
            return f"{num_bytes:3.1f} {unit}"
        num_bytes /= 1024.0
    return f"{num_bytes:.1f} TB"


def download_file(url: str, dest_path: Path, min_size: int, desc: str) -> bool:
    """Download a file with progress display and validation."""
    if dest_path.is_file():
        actual_size = dest_path.stat().st_size
        if actual_size >= min_size:
            print(f"  [✓] {dest_path.name} already exists ({_format_size(actual_size)}) - skipping download.")
            return True
        print(f"  [!] {dest_path.name} is incomplete ({_format_size(actual_size)} < {_format_size(min_size)}). Re-downloading...")

    dest_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = dest_path.with_suffix(".tmp")

    print(f"  [↓] Downloading {desc} ({dest_path.name})...")
    print(f"      Source: {url}")

    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (compatible; RoadMitraSetup/1.0)"},
    )

    try:
        with urllib.request.urlopen(req) as resp, open(temp_path, "wb") as out_file:
            total_size = int(resp.headers.get("Content-Length", 0))
            downloaded = 0
            start_time = time.time()
            chunk_size = 1024 * 64  # 64 KB

            while True:
                chunk = resp.read(chunk_size)
                if not chunk:
                    break
                out_file.write(chunk)
                downloaded += len(chunk)

                if total_size > 0:
                    percent = downloaded / total_size * 100
                    elapsed = max(0.001, time.time() - start_time)
                    speed = downloaded / elapsed
                    sys.stdout.write(
                        f"\r      Progress: {percent:5.1f}% | "
                        f"{_format_size(downloaded)} / {_format_size(total_size)} "
                        f"({_format_size(int(speed))}/s)    "
                    )
                else:
                    sys.stdout.write(f"\r      Downloaded: {_format_size(downloaded)}    ")
                sys.stdout.flush()

        print()  # Newline after progress bar
        if temp_path.stat().st_size < min_size:
            print(f"  [✗] Downloaded file was smaller than expected ({_format_size(temp_path.stat().st_size)}).")
            if temp_path.exists():
                temp_path.unlink()
            return False

        temp_path.replace(dest_path)
        print(f"  [✓] Successfully saved to {dest_path.name} ({_format_size(dest_path.stat().st_size)})\n")
        return True

    except Exception as exc:
        print(f"\n  [✗] Error downloading {dest_path.name}: {exc}")
        if temp_path.exists():
            temp_path.unlink()
        return False


def main() -> int:
    print("\n" + "=" * 65)
    print("  RoadMitra (SIH 2026) — Automated Model Weights Downloader")
    print("=" * 65)
    print(f"Target directory: {_MODEL_DIR.resolve()}\n")

    success = True
    for item in MODELS:
        dest = _MODEL_DIR / str(item["name"])
        ok = download_file(
            url=str(item["url"]),
            dest_path=dest,
            min_size=int(item["min_size"]),
            desc=str(item["desc"]),
        )
        if not ok:
            success = False

    if success:
        print("=" * 65)
        print("  All model weights are verified and ready for RoadMitra!")
        print("=" * 65 + "\n")
        return 0
    else:
        print("=" * 65)
        print("  Warning: Some weights could not be downloaded automatically.")
        print("  You can manually place the .pt files into Model/SIH2026-PROTOTYPE/")
        print("=" * 65 + "\n")
        return 1


if __name__ == "__main__":
    sys.exit(main())
