from google import genai
from google.genai import types
import asyncio, json, os

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
MODEL = "gemini-3.8-flash"   


class BrainDumpClassificationError(RuntimeError):
    """Raised when the model cannot return usable brain-dump classifications."""


SINGLE_PROMPT = """You are helping someone with ADHD organise their thoughts.

The user just said or typed:
"{text}"

Reply ONLY with valid JSON — no markdown, no backticks, nothing else:
{{
  "capture_type":  "task",
  "urgency":       "low",
  "energy_level":  "medium",
  "ai_summary":    "one calm encouraging sentence"
}}
- capture_type: task | note | idea | feeling
- urgency: low | medium | high
- energy_level: high | medium | low | micro
- ai_summary: kind, active voice, never: forgot/failed/overdue
"""

DUMP_PROMPT = """Someone with ADHD brain-dumped everything on their mind.
Their dump:
"{text}"

Split into separate captures. Reply ONLY with a JSON array:
[{{"capture_type":"task","urgency":"low","energy_level":"medium","ai_summary":"one sentence"}}]

Max 8 items. Kind tone. Feelings are valid captures.
"""


def _clean(text: str) -> str:
    return text.strip().replace("```json", "").replace("```", "").strip()


def _fallback(text: str) -> dict:
    return {
        "capture_type": "note",
        "urgency": "low",
        "energy_level": "medium",
        "ai_summary": text[:120],
    }


async def classify_capture(text: str) -> dict:
    try:
        loop = asyncio.get_running_loop()
        # BUG 2 FIX: use client.models.generate_content, not _model.generate_content
        response = await loop.run_in_executor(
            None,
            lambda: client.models.generate_content(
                model=MODEL,
                contents=SINGLE_PROMPT.format(text=text[:800]),
            ),
        )
        return json.loads(_clean(response.text))
    except Exception:
        return _fallback(text)


async def classify_brain_dump(text: str) -> list:
    try:
        loop = asyncio.get_running_loop()
        response = await loop.run_in_executor(
            None,
            lambda: client.models.generate_content(
                model=MODEL,
                contents=DUMP_PROMPT.format(text=text[:2500]),
            ),
        )
        result = json.loads(_clean(response.text))
    except Exception as exc:
        raise BrainDumpClassificationError("The model request or response parsing failed.") from exc

    if isinstance(result, dict):
        result = [result]
    if not isinstance(result, list) or not result:
        raise BrainDumpClassificationError("The model returned no brain-dump items.")

    validated = []
    for item in result[:8]:
        if not isinstance(item, dict):
            raise BrainDumpClassificationError("The model returned an invalid brain-dump item.")
        capture_type = item.get("capture_type")
        urgency = item.get("urgency")
        energy_level = item.get("energy_level")
        ai_summary = item.get("ai_summary")
        if not isinstance(capture_type, str) or capture_type not in {"task", "note", "idea", "feeling"}:
            raise BrainDumpClassificationError("The model returned an invalid capture type.")
        if not isinstance(urgency, str) or urgency not in {"low", "medium", "high"}:
            raise BrainDumpClassificationError("The model returned an invalid urgency.")
        if not isinstance(energy_level, str) or energy_level not in {"high", "medium", "low", "micro"}:
            raise BrainDumpClassificationError("The model returned an invalid energy level.")
        if not isinstance(ai_summary, str) or not ai_summary.strip():
            raise BrainDumpClassificationError("The model returned an empty capture summary.")
        validated.append({
            "capture_type": capture_type,
            "urgency": urgency,
            "energy_level": energy_level,
            "ai_summary": ai_summary.strip(),
        })
    return validated