from fastapi import APIRouter, Depends, Request, HTTPException, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import User
from routers.auth import auth_user
import os

router = APIRouter()


class UpgradeBody(BaseModel):
    plan: str   # "neuronotes_pro_monthly" | "neuronotes_pro_yearly"


@router.post("/upgrade")
def upgrade(
    body: UpgradeBody,
    db: Session = Depends(get_db),
    user: User = Depends(auth_user),
):
    """
    Called by frontend after RevenueCat purchase completes.
    In production: verify the receipt with RevenueCat REST API first.
    For Shipaton: trust the client call.
    """
    valid_plans = ["neuronotes_pro_monthly", "neuronotes_pro_yearly"]
    if body.plan not in valid_plans:
        raise HTTPException(status_code=400, detail="Invalid plan")

    user.is_pro = True
    db.commit()
    return {"success": True, "plan": body.plan, "is_pro": True}


@router.post("/revenuecat-webhook")
async def revenuecat_webhook(
    request: Request,
    authorization: str = Header(None),
    db: Session = Depends(get_db),
):
    """
    RevenueCat sends subscription events here.
    Set this URL in RevenueCat: Integrations → Webhooks → Add endpoint
    Authorization header must match REVENUECAT_WEBHOOK_AUTH in .env
    """
    expected = os.getenv("REVENUECAT_WEBHOOK_AUTH", "")
    if not expected or authorization != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")

    payload    = await request.json()
    event      = payload.get("event", {})
    event_type = event.get("type", "")
    user_id    = event.get("app_user_id", "")

    user = db.query(User).filter(
        User.id == user_id,
        User.deleted_at == None,
    ).first()

    if not user:
        return {"ok": True}   # unknown user — ignore silently

    PRO_ON  = ("INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION", "PRODUCT_CHANGE")
    PRO_OFF = ("CANCELLATION", "EXPIRATION", "BILLING_ISSUE")

    if event_type in PRO_ON:
        user.is_pro = True
    elif event_type in PRO_OFF:
        user.is_pro = False

    db.commit()
    return {"ok": True}


@router.get("/status")
def billing_status(
    user: User = Depends(auth_user),
):
    return {
        "is_pro":       user.is_pro,
        "daily_captures": user.daily_captures,
    }
