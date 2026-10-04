"""Video processing module for ReasonLens AI Tutor.

Handles:
- Video format and size validation (MP4, WebM, MOV; max 50MB)
- Representative keyframe extraction with timestamps using OpenCV
- Resizing and JPEG compression for efficient Gemini multimodal processing
- Clean temporary file lifecycle management
"""

import os
import tempfile
from typing import List, Dict, Any
import cv2

# Constraints
MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB
SUPPORTED_EXTENSIONS = {".mp4", ".webm", ".mov"}
SUPPORTED_MIME_TYPES = {
    "video/mp4": "video/mp4",
    "video/webm": "video/webm",
    "video/quicktime": "video/quicktime",
}


class VideoProcessingError(Exception):
    """Custom exception for video validation and processing issues."""
    pass


def validate_video_file(file_bytes: bytes, filename: str, content_type: str | None = None) -> None:
    """Validates video size and file format."""
    if not file_bytes or len(file_bytes) == 0:
        raise VideoProcessingError("The uploaded video file is empty.")

    if len(file_bytes) > MAX_VIDEO_SIZE_BYTES:
        raise VideoProcessingError(
            f"Video size ({len(file_bytes) / (1024 * 1024):.1f}MB) exceeds the 50MB limit. "
            "Please upload a shorter clip or compress the file."
        )

    # Validate extension or mime type
    ext = os.path.splitext(filename or "")[1].lower()
    ct = (content_type or "").lower()

    valid_mime = ct in SUPPORTED_MIME_TYPES
    valid_ext = ext in SUPPORTED_EXTENSIONS

    if not (valid_mime or valid_ext):
        raise VideoProcessingError(
            f"Unsupported video format '{ext or ct}'. "
            "Please upload a video in MP4, WebM, or MOV format."
        )


def extract_representative_frames(
    video_bytes: bytes,
    filename: str = "video.mp4",
    num_frames: int = 8,
    max_dimension: int = 720
) -> Dict[str, Any]:
    """Extracts evenly spaced representative keyframes and timestamps from video bytes.

    Args:
        video_bytes: Raw bytes of the uploaded video.
        filename: Original filename to preserve appropriate suffix.
        num_frames: Number of keyframes to sample across duration (default: 8).
        max_dimension: Max width or height for extracted frames to optimize payload.

    Returns:
        Dict containing:
            - duration_seconds (float)
            - duration_formatted (str, e.g. "01:45")
            - fps (float)
            - total_frames (int)
            - frames: list of dicts with keys:
                - frame_bytes (bytes): JPEG bytes
                - seconds (int): offset in seconds
                - timestamp (str): "MM:SS" formatted string
    """
    ext = os.path.splitext(filename)[1].lower()
    if ext not in SUPPORTED_EXTENSIONS:
        ext = ".mp4"

    temp_file = tempfile.NamedTemporaryFile(suffix=ext, delete=False)
    temp_path = temp_file.name

    try:
        temp_file.write(video_bytes)
        temp_file.flush()
        temp_file.close()

        cap = cv2.VideoCapture(temp_path)
        if not cap.isOpened():
            raise VideoProcessingError("Failed to open video. The file may be corrupted or use an unsupported codec.")

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = float(cap.get(cv2.CAP_PROP_FPS) or 0.0)

        if total_frames <= 0 or fps <= 0:
            # Fallback frame counting if metadata is missing or variable frame rate
            count = 0
            while True:
                ret, _ = cap.read()
                if not ret:
                    break
                count += 1
                if count > 30000:  # safety ceiling
                    break
            total_frames = count
            fps = 24.0 if fps <= 0 else fps
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)

        if total_frames <= 0:
            raise VideoProcessingError("No readable frames found in the uploaded video.")

        duration_seconds = float(total_frames) / fps if fps > 0 else 0.0
        dur_min = int(duration_seconds // 60)
        dur_sec = int(duration_seconds % 60)
        duration_formatted = f"{dur_min:02d}:{dur_sec:02d}"

        # Determine target frame indices evenly spaced across duration
        target_count = min(num_frames, max(1, total_frames))
        if target_count == 1:
            indices = [0]
        else:
            step = (total_frames - 1) / (target_count - 1)
            indices = [int(round(i * step)) for i in range(target_count)]

        extracted: List[Dict[str, Any]] = []

        for frame_idx in indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
            ret, frame = cap.read()
            if not ret or frame is None:
                continue

            # Calculate timestamp
            sec = int(round(frame_idx / fps)) if fps > 0 else 0
            ts_str = f"{sec // 60:02d}:{sec % 60:02d}"

            # Resize if necessary to save bandwidth while preserving clarity
            h, w = frame.shape[:2]
            if max(h, w) > max_dimension:
                scale = max_dimension / max(h, w)
                new_w, new_h = int(w * scale), int(h * scale)
                frame = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_AREA)

            # Encode to JPEG
            success, buffer = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
            if success:
                extracted.append({
                    "frame_bytes": buffer.tobytes(),
                    "seconds": sec,
                    "timestamp": ts_str,
                })

        cap.release()

        if not extracted:
            raise VideoProcessingError("Could not extract any clear keyframes from the video.")

        return {
            "duration_seconds": duration_seconds,
            "duration_formatted": duration_formatted,
            "fps": fps,
            "total_frames": total_frames,
            "frames": extracted,
        }

    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass
