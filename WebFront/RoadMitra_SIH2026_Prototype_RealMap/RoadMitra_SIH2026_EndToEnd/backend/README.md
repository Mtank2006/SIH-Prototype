# RoadMitra AI Backend

## 1. Create a Python environment

Windows PowerShell:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

If PowerShell blocks activation for the current terminal:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
.\.venv\Scripts\Activate.ps1
```

## 2. Add the road-damage YOLO model

Place the trained model here:

```text
models/road_damage.pt
```

The model should be trained for the road-damage classes used by the RoadMitra solution (for example pothole/crack/patch). A generic COCO YOLO model is not a road-damage model and should not be presented as one.

## 3. Start the API

From the `backend` folder:

```powershell
uvicorn main:app --reload --port 8000
```

Health check:

```text
http://127.0.0.1:8000/api/health
```

## 4. Start the frontend

In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

## Demo flow

1. Open **Live Scanner**.
2. Upload a short bus-camera road video.
3. Click **Run AI road scan**.
4. Backend runs OpenCV → YOLOv8 → ByteTrack.
5. Detected objects become geo-tagged incident records.
6. Evidence frames are saved under `data/evidence`.
7. Dashboard, Detections and Map screens consume the returned incident records.

## Important model note

The repository intentionally does not pretend that a generic pretrained YOLO model is a pothole detector. For a real SIH demonstration, use a road-damage-trained YOLOv8 `.pt` model. The backend reports `model_missing` instead of silently fabricating AI detections when that file is absent.
