from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import csv
import io
import math
import os
from typing import List, Tuple

app = FastAPI(title="CloudMedBio API", version="1.0.0")

cors_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5174,http://127.0.0.1:5174",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SAMPLE_RATE = 250.0


def parse_csv(raw: bytes) -> Tuple[List[float], float]:
    text = raw.decode("utf-8-sig", errors="replace")
    rows = list(csv.reader(io.StringIO(text)))
    values = []

    for row in rows:
        if not row:
            continue
        # Use the last column as the signal, matching the UI hint.
        token = row[-1].strip()
        try:
            values.append(float(token))
        except ValueError:
            # Header or non-numeric row
            continue

    if len(values) < 10:
        raise ValueError("CSV must contain at least 10 numeric signal samples.")

    return values, SAMPLE_RATE


def detect_peaks(signal: List[float], sample_rate: float) -> List[int]:
    """Simple educational peak detector.
    It is intentionally not a clinical ECG algorithm.
    """
    n = len(signal)
    if n < 5:
        return []

    mean = sum(signal) / n
    variance = sum((x - mean) ** 2 for x in signal) / n
    std = math.sqrt(variance) or 1.0

    # Robust-ish threshold for the synthetic/sample data.
    threshold = mean + 1.15 * std
    min_distance = max(1, int(0.28 * sample_rate))

    candidates = []
    for i in range(1, n - 1):
        if signal[i] > signal[i - 1] and signal[i] >= signal[i + 1] and signal[i] > threshold:
            candidates.append(i)

    # Keep the highest peak within a refractory/min-distance window.
    peaks = []
    for idx in candidates:
        if not peaks or idx - peaks[-1] >= min_distance:
            peaks.append(idx)
        elif signal[idx] > signal[peaks[-1]]:
            peaks[-1] = idx

    return peaks


def analyze(signal: List[float], sample_rate: float):
    duration = len(signal) / sample_rate
    peaks = detect_peaks(signal, sample_rate)

    # Estimate rate from average R-R interval where possible.
    if len(peaks) >= 2:
        intervals = [(peaks[i] - peaks[i-1]) / sample_rate for i in range(1, len(peaks))]
        avg_rr = sum(intervals) / len(intervals)
        estimated_rate = 60.0 / avg_rr if avg_rr > 0 else 0.0
    elif len(peaks) == 1 and duration > 0:
        estimated_rate = 60.0 / duration
    else:
        estimated_rate = 0.0

    # Downsample only for frontend transport.
    max_points = 1200
    step = max(1, math.ceil(len(signal) / max_points))
    trace = [
        {"time": round(i / sample_rate, 4), "value": round(signal[i], 6)}
        for i in range(0, len(signal), step)
    ]

    return {
        "estimated_rate_bpm": round(estimated_rate, 1),
        "peaks_found": len(peaks),
        "duration_sec": round(duration, 3),
        "sample_rate": sample_rate,
        "samples_parsed": len(signal),
        "peaks": [round(p / sample_rate, 4) for p in peaks],
        "trace": trace,
        "status": "analyzed",
        "disclaimer": "Educational signal metrics only. This is not a diagnostic or medical device."
    }


@app.get("/api/health")
def health():
    return {"ok": True, "service": "CloudMedBio API"}


@app.get("/api/sample")
def sample():
    # Generate a clean 4-second educational ECG-like signal at 250 Hz.
    duration = 4.0
    n = int(duration * SAMPLE_RATE)
    values = []

    # Ten beats around 150 bpm: period = 0.4 sec.
    beat_period = 0.4

    for i in range(n):
        t = i / SAMPLE_RATE
        phase = (t % beat_period) / beat_period

        # Baseline + small P/T-like waves + sharp R peak.
        baseline = 0.02 * math.sin(2 * math.pi * 0.7 * t)
        p = 0.10 * math.exp(-((phase - 0.18) / 0.045) ** 2)
        q = -0.12 * math.exp(-((phase - 0.38) / 0.018) ** 2)
        r = 0.92 * math.exp(-((phase - 0.40) / 0.010) ** 2)
        s = -0.18 * math.exp(-((phase - 0.43) / 0.018) ** 2)
        tw = 0.24 * math.exp(-((phase - 0.68) / 0.075) ** 2)
        noise = 0.018 * math.sin(2 * math.pi * 31 * t) + 0.008 * math.sin(2 * math.pi * 47 * t)

        values.append(baseline + p + q + r + s + tw + noise)

    return analyze(values, SAMPLE_RATE)


@app.post("/api/analyze")
async def analyze_file(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Please upload a CSV file.")

    raw = await file.read()
    try:
        signal, sample_rate = parse_csv(raw)
        result = analyze(signal, sample_rate)
        result["filename"] = file.filename
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
