import asyncio
import logging
import os
import random

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from database import get_db
from models import User, ChatMessage
from routers.auth import auth_user


router = APIRouter()
logger = logging.getLogger(__name__)

MAX_HISTORY = 20
MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]

WARMTH = {
    "overwhelmed": [
        "Hey. You're allowed to have messy days here.",
        "One thing at a time is enough. You don't have to fix it all right now.",
        "That sounds like a lot to carry. What feels most important right now?",
    ],
    "low": [
        "Low-energy days are real. Rest is valid, too.",
        "You don't have to be productive right now. What would feel kind to you?",
        "Sometimes showing up is enough for today.",
    ],
    "okay": [
        "I'm here with you. What's on your mind?",
        "Okay is a perfectly good place to be. How's today going?",
        "I'm listening. What would you like to talk about?",
    ],
    "energized": [
        "I love that energy. What's feeling exciting right now?",
        "That sounds like a good spark. What are you looking forward to?",
        "I'm here for it. What's on your mind?",
    ],
}

SYSTEM_PROMPT ="""
You are NeuroNotes Companion, a warm and emotionally supportive AI companion
for people who may feel overwhelmed, distracted, stuck, anxious, tired,
frustrated, lonely, unmotivated, excited, confused, or simply want someone
to talk to.

Your PRIMARY PURPOSE is emotional support and gentle companionship.

IMPORTANT BEHAVIOR:

1. ALWAYS respond to what the user actually says.
   Do not rely only on their selected emotional_state.
   The user's words are the most important source of context.

2. ALWAYS acknowledge the user's emotional experience before giving advice,
   suggestions, productivity techniques, or solutions.

3. COMFORT THE USER NATURALLY.
   Make them feel heard and understood without sounding robotic,
   clinical, scripted, or like a therapist.

4. NEVER assume that the user is feeling a particular emotion just because
   emotional_state says so. Use the conversation to understand their actual
   feelings.

5. KEEP THE CONVERSATION GOING.
   Do not end the interaction after one response.
   When appropriate, ask ONE simple, gentle follow-up question that makes
   it easy for the user to continue talking.

6. If the user says something very short such as:
   "yes", "no", "idk", "fine", "nothing", "okay", "yeah"
   DO NOT treat that as the end of the conversation.
   Respond naturally and gently invite them to continue.

7. If the user says they cannot start something, do not immediately give
   them a large productivity plan.
   First acknowledge how difficult it feels, then help reduce it to ONE
   tiny next step.

8. If the user is overwhelmed, help reduce mental load.
   Focus on one thing at a time.

9. If the user is tired or has low energy, keep suggestions extremely small
   and low-pressure.

10. If the user is anxious, provide reassurance and grounding before
    suggesting action.

11. If the user is frustrated, validate the frustration instead of
    immediately trying to fix everything.

12. If the user is happy, excited, or proud, respond warmly and share the
    positive moment instead of unnecessarily turning it into a task.

13. If the user just wants to talk, TALK WITH THEM.
    Do not force productivity advice.

14. Do not diagnose the user or claim to be a therapist, doctor, or mental
    health professional.

15. Do not encourage emotional dependency. You can be warm and supportive
    without saying that the user only needs you or that you will always be
    there instead of real people.

16. Keep responses concise and easy to read.
    Usually 2-5 short sentences.
    Use simple language and short paragraphs.

17. Never shame the user for procrastination, unfinished work,
    distraction, lack of motivation, or emotional difficulty.

18. The goal is NOT to immediately solve everything.
    The goal is:
       understand → comfort → reduce overwhelm → find one small next step.

CONVERSATION STYLE:
- warm
- human
- gentle
- non-judgmental
- encouraging
- conversational
- simple
- emotionally aware
- never overly formal
- never robotic
- never preachy

When the user shares something emotional, follow this general pattern:

ACKNOWLEDGE → CONSOLE → GENTLE FOLLOW-UP

Example:

User: "I have so much work and I haven't done anything."

Good response:
"That sounds really heavy, especially when the work has already started
taking up space in your head. You're not lazy for getting stuck. Let's not
think about everything at once — what's the one thing that feels most urgent?"

User: "I don't know."

Good response:
"That's okay. You don't have to know right away. We can figure it out
together — is it more that you're tired, or that you don't know where to
start?"

User: "I'm just tired."

Good response:
"Yeah, that makes sense. If you're running on empty, forcing yourself to
do everything probably isn't going to help. What if we make the next step
ridiculously small?"

Always respond to the CURRENT conversation and maintain continuity with
everything the user has previously said.
"""


class ChatBody(BaseModel):
    messages: List[dict]
    emotional_state: str = "okay"


@router.post("/emotional")
async def emotional_chat(
    body: ChatBody,
    db: Session = Depends(get_db),
    user: User = Depends(auth_user),
):
    state_context = {
        "overwhelmed": "The user is feeling overwhelmed right now. Be extra gentle.",
        "low": "The user has low energy. Don't push productivity.",
        "okay": "The user is feeling okay. Keep it balanced.",
        "energized": "The user is energized. Match their positive energy.",
    }
    system = f"{SYSTEM_PROMPT}\nContext: {state_context.get(body.emotional_state, '')}"

    recent = body.messages[-10:]
    messages = [
        {"role": message["role"], "content": str(message["content"])[:500]}
        for message in recent
        if message.get("role") in ("user", "assistant")
        and message.get("content") is not None
        and str(message["content"]).strip()
    ]

    if not messages:
        raise HTTPException(status_code=400, detail="No messages")

    reply = None
    model_used = "warmth-fallback"

    groq_key = os.getenv("GROQ_API_KEY", "")
    if groq_key.startswith("gsk_"):
        try:
            from groq import Groq

            client = Groq(api_key=groq_key, timeout=10, max_retries=0)
            conversation = [{"role": "system", "content": system}, *messages]
            for model in MODELS:
                try:
                    response = await asyncio.to_thread(
                        client.chat.completions.create,
                        model=model,
                        messages=conversation,
                        max_tokens=200,
                        temperature=0.85,
                    )
                    candidate = response.choices[0].message.content
                    if candidate and candidate.strip():
                        reply = candidate.strip()[:1000]
                        model_used = model
                        break
                except Exception as error:
                    logger.warning("Groq model %s failed: %s", model, error)
        except Exception as error:
            logger.warning("Groq chat client failed: %s", error)

    if not reply:
        gemini_key = os.getenv("GEMINI_API_KEY", "")
        if gemini_key:
            try:
                from google import genai

                client = genai.Client(api_key=gemini_key)
                transcript = "\n".join(
                    f"{message['role'].upper()}: {message['content']}"
                    for message in messages[-6:]
                )
                response = await asyncio.wait_for(
                    asyncio.to_thread(
                        client.models.generate_content,
                        model="gemini-3.6-flash",
                        contents=f"{system}\n\n{transcript}\n\nASSISTANT:",
                    ),
                    timeout=12,
                )
                if response.text and response.text.strip():
                    reply = response.text.strip()[:1000]
                    model_used = "gemini-3.6-flash"
            except Exception as error:
                logger.warning("Gemini chat fallback failed: %s", error)

    if not reply:
        reply = random.choice(WARMTH.get(body.emotional_state, WARMTH["okay"]))

    _store_messages(db, user.id, body.emotional_state, messages, reply)
    return {"reply": reply, "model_used": model_used}


@router.get("/history")
def get_chat_history(db: Session = Depends(get_db), user: User = Depends(auth_user)):
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.user_id == user.id)
        .order_by(ChatMessage.created_at.desc())
        .limit(MAX_HISTORY)
        .all()
    )
    messages.reverse()
    return {
        "messages": [
            {"role": message.role, "content": message.content}
            for message in messages
        ]
    }


def _store_messages(db: Session, user_id: str, state: str, messages: list, reply: str):
    """Store the latest exchange and rotate out old messages over the limit."""
    try:
        count = db.query(ChatMessage).filter(
            ChatMessage.user_id == user_id
        ).count()

        while count + 2 > MAX_HISTORY:
            oldest = db.query(ChatMessage).filter(
                ChatMessage.user_id == user_id
            ).order_by(ChatMessage.created_at.asc()).first()
            if not oldest:
                break
            db.delete(oldest)
            count -= 1

        # Store all user messages from the conversation that aren't already stored
        # We identify new messages by checking the last few exchanges
        # Since frontend sends full history each time, we store the last user message
        # and the assistant reply (the new exchange)
        last_user_message = next(
            (message for message in reversed(messages) if message["role"] == "user"),
            None,
        )
        if last_user_message:
            db.add(ChatMessage(
                user_id=user_id,
                role="user",
                content=last_user_message["content"],
                emotional_state=state,
            ))

        db.add(ChatMessage(
            user_id=user_id,
            role="assistant",
            content=reply,
            emotional_state=state,
        ))
        db.commit()
    except Exception as error:
        logger.error("Could not store chat messages: %s", error)
        db.rollback()
