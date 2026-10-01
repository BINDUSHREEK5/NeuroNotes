from datetime import datetime, timedelta
import random

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import Capture, CaptureType, User
from routers.auth import auth_user


router = APIRouter()

INSIGHTS = [
    "You capture most when things feel chaotic - that's actually a strength.",
    "Getting thoughts out of your head is a skill. You're practicing it.",
    "Even one capture a day keeps the mental spiral away.",
    "Every task you captured is one less thing taking up space in your mind.",
]

KIND_WORDS = [
    "You showed up. That's what matters.",
    "Progress isn't always visible. But it's happening.",
    "One thing at a time. You're doing it.",
    "Your brain works differently. That's not a flaw.",
    "Rest is productive. Don't forget that.",
]


@router.get("/consistency")
def get_consistency(
    db: Session = Depends(get_db),
    user: User = Depends(auth_user),
):
    """Return the last 14 days of capture activity."""
    since = datetime.utcnow() - timedelta(days=14)
    captures = db.query(Capture).filter(
        Capture.user_id == user.id,
        Capture.created_at >= since,
    ).all()

    days = {capture.created_at.strftime("%Y-%m-%d") for capture in captures}
    return {"active_days": sorted(days), "count": len(days)}


@router.get("/weekly-report")
def weekly_report(
    db: Session = Depends(get_db),
    user: User = Depends(auth_user),
):
    """Generate a seven-day brain report."""
    since = datetime.utcnow() - timedelta(days=7)
    captures = db.query(Capture).filter(
        Capture.user_id == user.id,
        Capture.created_at >= since,
    ).all()

    if not captures:
        return {
            "total_captures": 0,
            "tasks_done": 0,
            "most_common_type": "task",
            "peak_capture_time": "unknown",
            "insight": "Nothing captured this week. And that's okay too.",
            "kind_word": KIND_WORDS[0],
        }

    type_counts: dict[str, int] = {}
    for capture in captures:
        capture_type = capture.capture_type.value
        type_counts[capture_type] = type_counts.get(capture_type, 0) + 1
    most_common = max(type_counts, key=type_counts.get)

    hour_counts: dict[int, int] = {}
    for capture in captures:
        hour = capture.created_at.hour
        hour_counts[hour] = hour_counts.get(hour, 0) + 1
    peak_hour = max(hour_counts, key=hour_counts.get)
    am_pm = "morning" if peak_hour < 12 else "afternoon" if peak_hour < 17 else "evening"

    done = sum(1 for capture in captures if capture.is_done)
    insight = random.choice(INSIGHTS)
    kind_word = random.choice(KIND_WORDS)

    feelings = [
        capture.ai_summary
        for capture in captures
        if capture.capture_type == CaptureType.FEELING and capture.ai_summary
    ]
    dominant_feeling = feelings[0] if feelings else None

    return {
        "week_start": since.strftime("%Y-%m-%d"),
        "total_captures": len(captures),
        "tasks_done": done,
        "most_common_type": most_common,
        "peak_capture_time": am_pm,
        "dominant_feeling": dominant_feeling,
        "insight": insight,
        "kind_word": kind_word,
    }
