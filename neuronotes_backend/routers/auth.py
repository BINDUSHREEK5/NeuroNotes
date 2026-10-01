from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from database import get_db
from models import User, ConsentLog
from passlib.context import CryptContext
from jose import jwt, JWTError
from jose.utils import base64url_decode
import os, datetime, hashlib
import httpx
import json

router  = APIRouter()
pwd     = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET  = os.getenv("SECRET_KEY")
if not SECRET:
    raise RuntimeError("SECRET_KEY must be set in the backend environment.")
ALGO    = "HS256"
security = HTTPBearer()

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json" if SUPABASE_URL else ""

# Cache for JWKS
_jwks_cache = None
_jwks_cache_time = 0

async def get_jwks():
    """Fetch and cache Supabase JWKS."""
    global _jwks_cache, _jwks_cache_time
    import time
    now = time.time()
    if _jwks_cache and (now - _jwks_cache_time) < 3600:  # Cache for 1 hour
        return _jwks_cache
    
    if not SUPABASE_JWKS_URL:
        return None
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(SUPABASE_JWKS_URL)
            resp.raise_for_status()
            _jwks_cache = resp.json()
            _jwks_cache_time = now
            return _jwks_cache
    except Exception:
        return None

def get_key_from_jwks(jwks: dict, kid: str):
    """Find the key matching the kid from JWKS."""
    for key in jwks.get("keys", []):
        if key.get("kid") == kid:
            return key
    return None

async def verify_supabase_token(token: str) -> dict | None:
    """Verify a Supabase JWT using JWKS."""
    try:
        # Get the header to find the kid
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        if not kid:
            return None
        
        # Get JWKS
        jwks = await get_jwks()
        if not jwks:
            return None
        
        key = get_key_from_jwks(jwks, kid)
        if not key:
            return None
        
        # Verify and decode
        # Supabase uses ES256 (ECDSA with P-256)
        payload = jwt.decode(
            token,
            key,
            algorithms=["ES256"],
            audience="authenticated",
            options={"verify_aud": True}
        )
        return payload
    except JWTError:
        return None
    except Exception:
        return None

# ── Helpers ───────────────────────────────────────────────────

def make_token(user_id: str) -> str:
    exp = datetime.datetime.utcnow() + datetime.timedelta(days=30)
    return jwt.encode({"sub": user_id, "exp": exp}, SECRET, algorithm=ALGO)

async def get_or_create_user_from_supabase(db: Session, supabase_user_id: str, email: str, name: str = "") -> User:
    """Get existing user or create new one from Supabase user info."""
    # First try to find by supabase_user_id (we'll store it in the id field)
    user = db.query(User).filter(User.id == supabase_user_id).first()
    if user:
        return user
    
    # Try to find by email (migration from old system)
    user = db.query(User).filter(User.email == email.lower()).first()
    if user:
        # Keep the local primary key stable: captures and other records reference it.
        return user
    
    # Create new user
    user = User(
        id=supabase_user_id,
        email=email.lower().strip(),
        name=name.strip() or email.split("@")[0],
        hashed_password="",  # No password - auth is via Supabase
        consent_terms=True,
        consent_privacy=True,
        consent_timestamp=datetime.datetime.utcnow(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

async def auth_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    
    # First try Supabase JWT verification
    if SUPABASE_URL:
        supabase_payload = await verify_supabase_token(token)
        if supabase_payload:
            # Valid Supabase token
            supabase_user_id = supabase_payload.get("sub")
            email = supabase_payload.get("email", "")
            name = supabase_payload.get("user_metadata", {}).get("name", "") or supabase_payload.get("user_metadata", {}).get("full_name", "")
            
            if supabase_user_id:
                user = await get_or_create_user_from_supabase(db, supabase_user_id, email, name)
                if user and user.deleted_at is None:
                    return user
    
    # Fallback: try legacy FastAPI JWT (for backward compatibility)
    try:
        payload = jwt.decode(token, SECRET, algorithms=[ALGO])
        user = db.query(User).filter(
            User.id == payload["sub"],
            User.deleted_at == None,
        ).first()
        if user:
            return user
    except JWTError:
        pass
    
    raise HTTPException(status_code=401, detail="Invalid or expired token")

def serialize_user(user: User, token: str = "") -> dict:
    return {
        "id":             user.id,
        "email":          user.email,
        "name":           user.name,
        "is_pro":         user.is_pro,
        "daily_captures": user.daily_captures,
        "cat_avatar":     user.cat_avatar,
        "nudge_hour":     user.nudge_hour,
        "token":          token,
    }

# ── Schemas ───────────────────────────────────────────────────

class RegisterBody(BaseModel):
    email: str
    password: str
    name: str
    consent_terms: bool = False
    consent_privacy: bool = False
    consent_analytics: bool = False
    consent_mic: bool = False

class LoginBody(BaseModel):
    email: str
    password: str

# ── Endpoints ─────────────────────────────────────────────────

@router.post("/register")
def register(body: RegisterBody, request: Request, db: Session = Depends(get_db)):
    # Must accept terms + privacy to register
    if not body.consent_terms or not body.consent_privacy:
        raise HTTPException(status_code=400, detail="Terms and Privacy Policy must be accepted")

    # Check duplicate email
    if db.query(User).filter(User.email == body.email.lower()).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Validate password length
    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    user = User(
        email=body.email.lower().strip(),
        name=body.name.strip(),
        hashed_password=pwd.hash(body.password),
        consent_terms=body.consent_terms,
        consent_privacy=body.consent_privacy,
        consent_analytics=body.consent_analytics,
        consent_mic=body.consent_mic,
        consent_timestamp=datetime.datetime.utcnow(),
    )
    db.add(user)
    db.flush()  # get user.id before commit

    # Audit log
    ip_raw = request.client.host if request.client else "unknown"
    ip_hash = hashlib.sha256(ip_raw.encode()).hexdigest()[:16]
    db.add(ConsentLog(
        user_id=user.id,
        event_type="granted",
        consent_data={
            "terms": body.consent_terms,
            "privacy": body.consent_privacy,
            "analytics": body.consent_analytics,
            "microphone": body.consent_mic,
        },
        ip_hash=ip_hash,
        user_agent=request.headers.get("user-agent", "")[:200],
    ))
    db.commit()
    db.refresh(user)

    token = make_token(user.id)
    return {"user": serialize_user(user, token)}


@router.post("/login")
def login(body: LoginBody, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        User.email == body.email.lower(),
        User.deleted_at == None,
    ).first()

    if not user or not pwd.verify(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = make_token(user.id)
    return {"user": serialize_user(user, token)}


@router.get("/me")
async def get_me(user: User = Depends(auth_user)):
    return {"user": serialize_user(user)}
