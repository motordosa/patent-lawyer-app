from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.db_service import (
    get_user_profile, update_user_profile,
    get_all_settings, API_KEY_FIELDS
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
    """Return settings status. API key VALUES are never exposed to frontend."""
    settings = await get_all_settings()
    masked = {}
    for key in SETTINGS_KEYS:
        val = settings.get(key, "")
        if key in API_KEY_FIELDS:
            # Never expose key values — only is_set boolean
            masked[f"{key}_is_set"] = bool(val)
        else:
            masked[key] = val
    masked["avatar_options"] = AVATAR_OPTIONS
    return masked


# NOTE: PUT /settings/ (API key write) has been moved to /admin/settings
# Only preferences (preferred_llm, preferred_search, language) can still be updated here
class PreferencesUpdate(BaseModel):
    preferred_llm: Optional[str] = None
    preferred_search: Optional[str] = None
    language: Optional[str] = None

@router.put("/")
async def update_preferences(body: PreferencesUpdate):
    """Update non-sensitive preferences only (LLM/search choice, language)."""
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No preferences to update")
    from services.db_service import set_settings_bulk
    await set_settings_bulk(updates)
    return {"message": "Preferences updated", "updated_keys": list(updates.keys())}


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
