"""ElevenLabs helper endpoints (voice list for study content UI)."""

from fastapi import APIRouter

from app.services.elevenlabs_service import list_voices

router = APIRouter(prefix="/api/v1/elevenlabs", tags=["ElevenLabs"])


@router.get("/voices")
async def get_voices():
    """List available voices (requires ELEVENLABS_API_KEY)."""
    return {"voices": await list_voices()}
