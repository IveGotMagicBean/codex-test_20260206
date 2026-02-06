from __future__ import annotations

from datetime import datetime
import json
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, File, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.video_analysis import analyze_video

BASE_DIR = Path(__file__).resolve().parent.parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"
UPLOAD_DIR = BASE_DIR / "uploads"
REPORT_DIR = BASE_DIR / "reports"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
REPORT_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Sports Motion MVP (Python)", version="0.2.0")

static_dir = FRONTEND_DIR / "static"
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=static_dir), name="static")


@app.get("/")
def index() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "index.html")


@app.post("/analyze")
def analyze(file: UploadFile = File(...)) -> JSONResponse:
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    report_id = f"{timestamp}-{uuid4().hex[:8]}"
    upload_path = UPLOAD_DIR / f"{report_id}-{file.filename}"
    report_path = REPORT_DIR / f"{report_id}.json"

    with upload_path.open("wb") as buffer:
        buffer.write(file.file.read())

    result = analyze_video(upload_path, report_path)
    return JSONResponse(result.to_dict())


@app.get("/reports/{report_id}")
def get_report(report_id: str) -> JSONResponse:
    report_path = REPORT_DIR / f"{report_id}.json"
    if not report_path.exists():
        return JSONResponse({"error": "report not found"}, status_code=404)
    return JSONResponse(content=json.loads(report_path.read_text(encoding="utf-8")))
