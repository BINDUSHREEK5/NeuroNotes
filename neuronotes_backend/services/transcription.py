from openai import AsyncOpenAI
import os


client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))


async def transcribe_audio(file_path: str) -> str:
    """Send audio file to OpenAI Whisper and return transcript."""
    with open(file_path, "rb") as f:
        transcript = await client.audio.transcriptions.create(
            model="whisper-1",
            file=f,
            language="en",
            response_format="text",
        )
    return str(transcript).strip()
