from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
import logging
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
from models import Capture, CaptureType, UrgencyLevel, EnergyLevel, User
from routers.auth import auth_user
from services.transcription import transcribe_audio
from services.classifier import BrainDumpClassificationError, classify_capture, classify_brain_dump
import aiofiles, os, uuid
import tempfile
from datetime import datetime, date

router = APIRouter()
logger = logging.getLogger(__name__)
FREE_VOICE_LIMIT   = 10   # voice captures per day
FREE_DUMP_LIMIT    = 3    # brain dumps per day


def _check_limit(user: User, db: Session, is_dump: bool = False):
    """Reset daily counter and enforce free tier limits."""
    today = date.today().isoformat()
    if user.last_capture_date != today:
        user.daily_captures = 0
        user.last_capture_date = today
        db.commit()

    if not user.is_pro:
        limit = FREE_DUMP_LIMIT if is_dump else FREE_VOICE_LIMIT
        if user.daily_captures >= limit:
            raise HTTPException(status_code=402, detail="Free limit reached. Upgrade to Pro.")


def _serialize(c: Capture) -> dict:
    return {
        "id":             c.id,
        "raw_transcript": c.raw_transcript,
        "ai_summary":     c.ai_summary,
        "capture_type":   c.capture_type,
        "urgency":        c.urgency,
        "energy_level":   c.energy_level,
        "is_done":        c.is_done,
        "is_archived":    c.is_archived,
        "is_parked":      c.is_parked,
        "created_at":     c.created_at.isoformat(),
        "done_at":        c.done_at.isoformat() if c.done_at else None,
    }


# ── Voice capture ──────────────────────────────────────────────
@router.post("/voice")
async def voice_capture(
    audio: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(auth_user),
):
    _check_limit(user, db)
    tmp = os.path.join(
        tempfile.gettempdir(),
        f"{uuid.uuid4()}.webm"
    )
    async with aiofiles.open(tmp, "wb") as f:
        await f.write(await audio.read())
    try:
        transcript     = await transcribe_audio(tmp)
        classification = await classify_capture(transcript)
        capture = Capture(
            user_id        = user.id,
            raw_transcript = transcript,
            ai_summary     = classification["ai_summary"],
            capture_type   = classification["capture_type"],
            urgency        = classification["urgency"],
            energy_level   = classification.get("energy_level", "medium"),
        )
        db.add(capture)
        user.daily_captures += 1
        db.commit()
        db.refresh(capture)
        return {"success": True, "capture": _serialize(capture)}
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)


# ── Text capture ───────────────────────────────────────────────
class TextBody(BaseModel):
    text: str

@router.post("/text")
async def text_capture(
    body: TextBody,
    db: Session = Depends(get_db),
    user: User = Depends(auth_user),
):
    _check_limit(user, db)
    classification = await classify_capture(body.text)
    capture = Capture(
        user_id        = user.id,
        raw_transcript = body.text,
        ai_summary     = classification["ai_summary"],
        capture_type   = classification["capture_type"],
        urgency        = classification["urgency"],
        energy_level   = classification.get("energy_level", "medium"),
    )
    db.add(capture)
    user.daily_captures += 1
    db.commit()
    db.refresh(capture)
    return {"success": True, "capture": _serialize(capture)}


# ── Brain dump (voice → multiple captures) ─────────────────────
@router.post("/brain-dump")
async def brain_dump_voice(
    audio: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(auth_user),
):
    _check_limit(user, db, is_dump=True)
    tmp = os.path.join(
        tempfile.gettempdir(),
        f"{uuid.uuid4()}.webm"
    )
    async with aiofiles.open(tmp, "wb") as f:
        await f.write(await audio.read())
    try:
        transcript    = await transcribe_audio(tmp)
        try:
            classifications = await classify_brain_dump(transcript)
        except BrainDumpClassificationError as exc:
            logger.exception("Brain dump classification failed")
            raise HTTPException(
                status_code=502,
                detail="AI could not organize this brain dump. Please try again.",
            ) from exc

        captures = []
        for cl in classifications[:8]:   # cap at 8 items
            c = Capture(
                user_id        = user.id,
                raw_transcript = transcript,
                ai_summary     = cl["ai_summary"],
                capture_type   = cl["capture_type"],
                urgency        = cl["urgency"],
                energy_level   = cl.get("energy_level", "medium"),
            )
            db.add(c)
            captures.append(c)

        user.daily_captures += 1
        db.commit()
        for c in captures:
            db.refresh(c)

        return {"success": True, "captures": [_serialize(c) for c in captures]}
    finally:
        if os.path.exists(tmp):
            os.remove(tmp)


# ── Brain dump (text version) ──────────────────────────────────
class DumpTextBody(BaseModel):
    text: str

@router.post("/brain-dump-text")
async def brain_dump_text(
    body: DumpTextBody,
    db: Session = Depends(get_db),
    user: User = Depends(auth_user),
):
    _check_limit(user, db, is_dump=True)
    try:
        classifications = await classify_brain_dump(body.text)
    except BrainDumpClassificationError as exc:
        logger.exception("Brain dump classification failed")
        raise HTTPException(
            status_code=502,
            detail="AI could not organize this brain dump. Please try again.",
        ) from exc
    captures = []
    for cl in classifications[:8]:
        c = Capture(
            user_id        = user.id,
            raw_transcript = body.text,
            ai_summary     = cl["ai_summary"],
            capture_type   = cl["capture_type"],
            urgency        = cl["urgency"],
            energy_level   = cl.get("energy_level", "medium"),
        )
        db.add(c)
        captures.append(c)
    user.daily_captures += 1
    db.commit()
    for c in captures:
        db.refresh(c)
    return {"success": True, "captures": [_serialize(c) for c in captures]}


# ── Inbox ──────────────────────────────────────────────────────
@router.get("/inbox")
def get_inbox(
    energy: Optional[str] = None,
    type: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(auth_user),
):
    q = db.query(Capture).filter(
        Capture.user_id    == user.id,
        Capture.is_archived == False,
    )
    if energy and energy != "all":
        q = q.filter(Capture.energy_level == energy)
    if type and type != "all":
        q = q.filter(Capture.capture_type == type)

    captures = q.order_by(Capture.created_at.desc()).all()
    return {"captures": [_serialize(c) for c in captures]}


# ── Focus: best task for current emotional state ───────────────
@router.get("/focus")
def get_focus(
    emotional_state: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(auth_user),
):
    # Match energy level to emotional state
    energy_map = {
        "overwhelmed": ["micro"],
        "low":         ["low", "micro"],
        "okay":        ["medium", "low", "high", "micro"],
        "energized":   ["high", "medium"],
    }
    energy_priorities = energy_map.get(emotional_state or "okay", ["medium", "low", "high"])

    for energy in energy_priorities:
        for urgency in [UrgencyLevel.HIGH, UrgencyLevel.MEDIUM, UrgencyLevel.LOW]:
            c = db.query(Capture).filter(
                Capture.user_id     == user.id,
                Capture.capture_type == CaptureType.TASK,
                Capture.is_done     == False,
                Capture.is_archived == False,
                Capture.is_parked   == False,
                Capture.energy_level == energy,
                Capture.urgency     == urgency,
            ).order_by(Capture.created_at.asc()).first()
            if c:
                return {"capture": _serialize(c)}

    # Fallback: any undone task
    c = db.query(Capture).filter(
        Capture.user_id     == user.id,
        Capture.capture_type == CaptureType.TASK,
        Capture.is_done     == False,
        Capture.is_archived == False,
    ).first()
    return {"capture": _serialize(c) if c else None}


# ── Random (Task Roulette) ─────────────────────────────────────
@router.get("/random")
def get_random(
    db: Session = Depends(get_db),
    user: User = Depends(auth_user),
):
    from sqlalchemy.sql.expression import func as sqlfunc
    c = db.query(Capture).filter(
        Capture.user_id     == user.id,
        Capture.capture_type == CaptureType.TASK,
        Capture.is_done     == False,
        Capture.is_archived == False,
    ).order_by(sqlfunc.random()).first()
    return {"capture": _serialize(c) if c else None}


# ── Parked thoughts ────────────────────────────────────────────
@router.get("/parked")
def get_parked(
    db: Session = Depends(get_db),
    user: User = Depends(auth_user),
):
    captures = db.query(Capture).filter(
        Capture.user_id    == user.id,
        Capture.is_parked  == True,
        Capture.is_archived == False,
    ).order_by(Capture.created_at.desc()).all()
    return {"captures": [_serialize(c) for c in captures]}


# ── Mark done ──────────────────────────────────────────────────
@router.patch("/{capture_id}/done")
def mark_done(
    capture_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(auth_user),
):
    c = _get_capture(capture_id, user.id, db)
    c.is_done = True
    c.done_at = datetime.utcnow()
    db.commit()
    return {"success": True, "celebrate": True}


# ── Archive ────────────────────────────────────────────────────
@router.patch("/{capture_id}/archive")
def archive_capture(
    capture_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(auth_user),
):
    c = _get_capture(capture_id, user.id, db)
    c.is_archived = True
    db.commit()
    return {"success": True}


# ── Park a thought ─────────────────────────────────────────────
@router.patch("/{capture_id}/park")
def park_capture(
    capture_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(auth_user),
):
    c = _get_capture(capture_id, user.id, db)
    c.is_parked = True
    db.commit()
    return {"success": True}


# ── Search ─────────────────────────────────────────────────────
@router.get("/search")
def search_captures(
    q: str,
    db: Session = Depends(get_db),
    user: User = Depends(auth_user),
):
    if not user.is_pro:
        # Free: search last 30 days only
        from datetime import timedelta
        cutoff = datetime.utcnow() - timedelta(days=30)
        query = db.query(Capture).filter(
            Capture.user_id    == user.id,
            Capture.is_archived == False,
            Capture.ai_summary.ilike(f"%{q}%"),
            Capture.created_at >= cutoff,
        )
    else:
        query = db.query(Capture).filter(
            Capture.user_id    == user.id,
            Capture.is_archived == False,
            Capture.ai_summary.ilike(f"%{q}%"),
        )
    captures = query.order_by(Capture.created_at.desc()).limit(30).all()
    return {"captures": [_serialize(c) for c in captures]}


# ── Helper ─────────────────────────────────────────────────────
def _get_capture(capture_id: str, user_id: str, db: Session) -> Capture:
    c = db.query(Capture).filter(
        Capture.id == capture_id,
        Capture.user_id == user_id,
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="Capture not found")
    return c
