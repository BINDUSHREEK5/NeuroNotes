from fastapi import APIRouter, Depends, Request, HTTPException, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import User, Capture, CaptureType
from routers.auth import auth_user
import os, random

router = APIRouter()

NUDGE_MESSAGES = [
    "One thing from your list is waiting 🌿",
    "Good moment for a quick brain dump?",
    "You captured something. Want to look at it?",
    "One thing. That's all. Ready?",
    "Something's been waiting patiently for you.",
    "Your inbox has a few things. No pressure.",
    "When you have a moment — your notes are here.",
    "Good time to clear one thing off your list?",
    "A thought you captured is ready for you 🌱",
    "No rush — but your inbox is here when you are.",
]


@router.get("/next")
def next_nudge(
    db: Session = Depends(get_db),
    user: User = Depends(auth_user),
):
    # Don't nudge during quiet hours
    from datetime import datetime
    hour = datetime.utcnow().hour
    if user.quiet_start > user.quiet_end:
        # e.g. quiet 22–8: quiet if hour >= 22 OR hour < 8
        in_quiet = hour >= user.quiet_start or hour < user.quiet_end
    else:
        in_quiet = user.quiet_start <= hour < user.quiet_end

    if in_quiet:
        return {"nudge": None, "reason": "quiet_hours"}

    pending = db.query(Capture).filter(
        Capture.user_id     == user.id,
        Capture.is_done     == False,
        Capture.is_archived == False,
    ).count()

    if pending == 0:
        return {"nudge": None, "reason": "inbox_empty"}

    # Pick the most relevant task to highlight
    task = db.query(Capture).filter(
        Capture.user_id     == user.id,
        Capture.capture_type == CaptureType.TASK,
        Capture.is_done     == False,
        Capture.is_archived == False,
    ).order_by(Capture.created_at.asc()).first()

    return {
        "nudge": {
            "message":    random.choice(NUDGE_MESSAGES),
            "pending":    pending,
            "highlight":  task.ai_summary if task else None,
            "nudge_hour": user.nudge_hour,
        }
    }
