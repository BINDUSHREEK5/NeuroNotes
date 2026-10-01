from sqlalchemy import (
    Column, String, DateTime, Enum, Boolean,
    Text, Integer, ForeignKey, Index
)
from sqlalchemy.dialects.postgresql import JSONB
from database import Base
from datetime import datetime
import uuid, enum


class CaptureType(str, enum.Enum):
    TASK = "task"
    NOTE = "note"
    IDEA = "idea"
    FEELING = "feeling"


class UrgencyLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class EnergyLevel(str, enum.Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    MICRO = "micro"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_pro = Column(Boolean, default=False)
    cat_avatar = Column(String, default="🐱")
    daily_captures = Column(Integer, default=0)
    last_capture_date = Column(String, nullable=True)
    nudge_hour = Column(Integer, default=10)
    quiet_start = Column(Integer, default=22)
    quiet_end = Column(Integer, default=8)

    consent_terms = Column(Boolean, default=False)
    consent_privacy = Column(Boolean, default=False)
    consent_analytics = Column(Boolean, default=False)
    consent_mic = Column(Boolean, default=False)
    consent_timestamp = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)


class Capture(Base):
    __tablename__ = "captures"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    raw_transcript = Column(Text, nullable=False)
    ai_summary = Column(Text, nullable=True)
    capture_type = Column(Enum(CaptureType), default=CaptureType.NOTE)
    urgency = Column(Enum(UrgencyLevel), default=UrgencyLevel.LOW)
    energy_level = Column(Enum(EnergyLevel), default=EnergyLevel.MEDIUM)
    is_done = Column(Boolean, default=False)
    is_archived = Column(Boolean, default=False)
    is_parked = Column(Boolean, default=False)
    group_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    done_at = Column(DateTime, nullable=True)

    __table_args__ = (
        Index(
            "ix_captures_user_active",
            "user_id",
            "is_archived",
            "is_done",
            postgresql_where=None,
        ),
    )


class ChatMessage(Base):
    """Stores emotional chat history; max 20 messages per user, rotated."""

    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    emotional_state = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ConsentLog(Base):
    """Immutable audit log of consent events required for GDPR."""

    __tablename__ = "consent_log"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    event_type = Column(String, nullable=False)
    consent_data = Column(JSONB, nullable=False)
    ip_hash = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
