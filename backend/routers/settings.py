from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.db_service import (
    get_user_profile, update_user_profile,
    get_all_settings, set_settings_bulk
)

router = APIRouter(prefix="/settings", tags=["settings"])

AVATAR_OPTIONS = ['👨‍💼', '👩‍💼', '👨‍🔬', '👩‍🔬', '👨‍💻', '👩‍💻', '🧑‍🏭', '👨‍⚖️', '👩‍⚖️']

# Known API key settings keys
SETTINGS_KEYS = [
    # LLM Models
    "openai_api_key",       # GPT-4o, GPT-4
    "anthropic_api_key",    # Claude 3.5 Sonnet
    "google_api_key",       # Gemini 1.5 Pro
    "groq_api_key",         # LLaMA 3, Mixtral (fast)
    "perplexity_api_key",   # Perplexity (web-enabled LLM)
    # Search & Research
    "tavily_api_key",       # Tavily (AI web search)
    "serper_api_key",       # SerpAPI (Google Search)
    "exa_api_key",          # Exa.ai (semantic search)
    # Patent DBs
    "kipris_api_key",       # KIPRIS 한국 특허 (free, open.kipris.or.kr)
    "patsnap_api_key",      # PatSnap commercial patent DB
    "lens_api_key",         # Lens.org (open patent DB)
    # Preferred LLM
    "preferred_llm",        # openai | anthropic | google | groq
    "preferred_search",     # tavily | serper | exa
    "language",             # ko | en
]


class UserProfileUpdate(BaseModel):
    name: str
    title: Optional[str] = "자동차 R&D 헤드"
    organization: Optional[str] = ""
    email: Optional[str] = ""
    bio: Optional[str] = ""
    avatar_emoji: Optional[str] = "👨‍💼"


class SettingsUpdate(BaseModel):
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    google_api_key: Optional[str] = None
    groq_api_key: Optional[str] = None
    perplexity_api_key: Optional[str] = None
    tavily_api_key: Optional[str] = None
    serper_api_key: Optional[str] = None
    exa_api_key: Optional[str] = None
    kipris_api_key: Optional[str] = None
    patsnap_api_key: Optional[str] = None
    lens_api_key: Optional[str] = None
    preferred_llm: Optional[str] = None
    preferred_search: Optional[str] = None
    language: Optional[str] = None


@router.get("/profile")
async def get_profile():
    return await get_user_profile()


@router.put("/profile")
async def update_profile(body: UserProfileUpdate):
    return await update_user_profile(
        body.name, body.title or "", body.organization or "",
        body.email or "", body.bio or "", body.avatar_emoji or "👨‍💼"
    )


@router.get("/")
async def get_settings():
    settings = await get_all_settings()
    # Mask API keys for security - only show if set or not
    masked = {}
    for key in SETTINGS_KEYS:
        val = settings.get(key, "")
        if key.endswith("_api_key") and val:
            # Show last 4 chars only
            masked[key] = "•" * (len(val) - 4) + val[-4:] if len(val) > 4 else "••••"
            masked[f"{key}_is_set"] = True
        else:
            masked[key] = val
            if key.endswith("_api_key"):
                masked[f"{key}_is_set"] = False
    masked["avatar_options"] = AVATAR_OPTIONS
    return masked


@router.put("/")
async def update_settings(body: SettingsUpdate):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No settings to update")
    await set_settings_bulk(updates)
    return {"message": "Settings updated", "updated_keys": list(updates.keys())}


@router.get("/api-status")
async def check_api_status():
    """Check which APIs are configured."""
    settings = await get_all_settings()
    return {
        "llm": {
            "openai":     bool(settings.get("openai_api_key")),
            "anthropic":  bool(settings.get("anthropic_api_key")),
            "google":     bool(settings.get("google_api_key")),
            "groq":       bool(settings.get("groq_api_key")),
            "perplexity": bool(settings.get("perplexity_api_key")),
        },
        "search": {
            "tavily":  bool(settings.get("tavily_api_key")),
            "serper":  bool(settings.get("serper_api_key")),
            "exa":     bool(settings.get("exa_api_key")),
        },
        "patent": {
            "kipris":  bool(settings.get("kipris_api_key")),
            "patsnap": bool(settings.get("patsnap_api_key")),
            "lens":    bool(settings.get("lens_api_key")),
            "uspto":   True,   # Free, always available
        },
        "preferred_llm": settings.get("preferred_llm", "openai"),
        "preferred_search": settings.get("preferred_search", "tavily"),
    }
