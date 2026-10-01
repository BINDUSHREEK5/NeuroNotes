from datetime import datetime
import hashlib

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import Capture, ChatMessage, ConsentLog, User
from routers.auth import auth_user


router = APIRouter()

ALLOWED_AVATARS = [
    "🐱", "🐈", "😸", "🙀",
    "🐱‍🚀", "🧙", "🥷", "👻", "🤖", "👽", "🦋", "🐉", "🦅", "💎", "⭐", "🌙",
]
FREE_AVATARS = ["🐱", "🐈", "😸", "🙀"]


class AvatarBody(BaseModel):
    cat_avatar: str


class ConsentBody(BaseModel):
    terms: bool
    privacy: bool
    analytics: bool
    microphone: bool


@router.patch("/avatar")
def update_avatar(
    body: AvatarBody,
    db: Session = Depends(get_db),
    user: User = Depends(auth_user),
):
    if body.cat_avatar not in ALLOWED_AVATARS:
        raise HTTPException(status_code=400, detail="Invalid avatar")

    if body.cat_avatar not in FREE_AVATARS and not user.is_pro:
        raise HTTPException(status_code=402, detail="Pro required for this avatar")

    user.cat_avatar = body.cat_avatar
    db.commit()
    return {"success": True, "cat_avatar": body.cat_avatar}


@router.get("/me")
def get_profile(
    db: Session = Depends(get_db),
    user: User = Depends(auth_user),
):
    capture_count = db.query(Capture).filter(
        Capture.user_id == user.id,
        Capture.is_archived == False,
    ).count()
    done_count = db.query(Capture).filter(
        Capture.user_id == user.id,
        Capture.is_done == True,
    ).count()

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "is_pro": user.is_pro,
        "cat_avatar": user.cat_avatar,
        "daily_captures": user.daily_captures,
        "total_captures": capture_count,
        "total_done": done_count,
        "member_since": user.created_at.isoformat(),
    }


@router.patch("/consent")
def update_consent(
    body: ConsentBody,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(auth_user),
):
    raw_ip = request.client.host if request.client else "unknown"
    ip_hash = hashlib.sha256(raw_ip.encode()).hexdigest()[:16]

    user.consent_terms = body.terms
    user.consent_privacy = body.privacy
    user.consent_analytics = body.analytics
    user.consent_mic = body.microphone
    user.consent_timestamp = datetime.utcnow()

    db.add(ConsentLog(
        user_id=user.id,
        event_type="updated",
        consent_data={
            "terms": body.terms,
            "privacy": body.privacy,
            "analytics": body.analytics,
            "microphone": body.microphone,
        },
        ip_hash=ip_hash,
        user_agent=request.headers.get("user-agent", "")[:200],
    ))
    db.commit()
    return {"success": True}


@router.get("/export")
def export_data(
    db: Session = Depends(get_db),
    user: User = Depends(auth_user),
):
    captures = db.query(Capture).filter(Capture.user_id == user.id).all()
    messages = db.query(ChatMessage).filter(ChatMessage.user_id == user.id).all()

    return {
        "export_date": datetime.utcnow().isoformat(),
        "user": {
            "name": user.name,
            "email": user.email,
            "member_since": user.created_at.isoformat(),
            "is_pro": user.is_pro,
        },
        "captures": [
            {
                "summary": capture.ai_summary,
                "type": capture.capture_type,
                "urgency": capture.urgency,
                "created_at": capture.created_at.isoformat(),
                "is_done": capture.is_done,
            }
            for capture in captures
        ],
        "chat_history": [
            {
                "role": message.role,
                "content": message.content,
                "created_at": message.created_at.isoformat(),
            }
            for message in messages
        ],
    }


@router.delete("/account")
def delete_account(
    db: Session = Depends(get_db),
    user: User = Depends(auth_user),
):
    user.email = f"deleted_{user.id}@neuronotes.deleted"
    user.name = "Deleted User"
    user.hashed_password = "DELETED"
    user.deleted_at = datetime.utcnow()

    db.query(Capture).filter(Capture.user_id == user.id).delete()
    db.query(ChatMessage).filter(ChatMessage.user_id == user.id).delete()

    db.commit()
    return {"success": True, "message": "Account and all data deleted."}
