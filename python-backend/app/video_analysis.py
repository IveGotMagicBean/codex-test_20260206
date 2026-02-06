from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
import json
from pathlib import Path
from typing import Any

import cv2
import numpy as np


@dataclass
class AnalysisResult:
    report_id: str
    created_at: str
    source_filename: str
    total_frames: int
    fps: float
    duration_seconds: float
    motion_events: int
    motion_score_mean: float
    motion_score_std: float

    def to_dict(self) -> dict[str, Any]:
        return {
            "report_id": self.report_id,
            "created_at": self.created_at,
            "source_filename": self.source_filename,
            "total_frames": self.total_frames,
            "fps": self.fps,
            "duration_seconds": self.duration_seconds,
            "motion_events": self.motion_events,
            "motion_score_mean": self.motion_score_mean,
            "motion_score_std": self.motion_score_std,
        }


def _score_motion(prev_gray: np.ndarray, gray: np.ndarray) -> float:
    diff = cv2.absdiff(prev_gray, gray)
    return float(np.mean(diff))


def _count_peaks(scores: list[float], threshold: float) -> int:
    count = 0
    armed = True
    for score in scores:
        if armed and score >= threshold:
            count += 1
            armed = False
        elif not armed and score < threshold * 0.7:
            armed = True
    return count


def analyze_video(video_path: Path, report_path: Path) -> AnalysisResult:
    capture = cv2.VideoCapture(str(video_path))
    if not capture.isOpened():
        raise ValueError(f"Unable to open video: {video_path}")

    fps = capture.get(cv2.CAP_PROP_FPS) or 30.0
    total_frames = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)

    prev_gray = None
    scores: list[float] = []

    while True:
        success, frame = capture.read()
        if not success:
            break
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        if prev_gray is not None:
            scores.append(_score_motion(prev_gray, gray))
        prev_gray = gray

    capture.release()

    if not scores:
        scores = [0.0]

    score_mean = float(np.mean(scores))
    score_std = float(np.std(scores))
    threshold = score_mean + score_std * 1.2

    motion_events = _count_peaks(scores, threshold)
    duration_seconds = total_frames / fps if fps else 0.0

    result = AnalysisResult(
        report_id=report_path.stem,
        created_at=datetime.utcnow().isoformat() + "Z",
        source_filename=video_path.name,
        total_frames=total_frames,
        fps=float(fps),
        duration_seconds=float(duration_seconds),
        motion_events=motion_events,
        motion_score_mean=score_mean,
        motion_score_std=score_std,
    )

    report_path.write_text(
        json.dumps(result.to_dict(), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return result
