"""
Admin router: User management and API key configuration (admin-only endpoints).
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from services.auth_middleware import require_admin
from services.db_service import (
    get_all_users, create_user, toggle_user_active, delete_user, update_user_password,
    set_settings_bulk, get_all_settings, API_KEY_FIELDS
)

router = APIRouter(prefix="/admin", tags=["admin"])

SETTINGS_KEYS = [
    "openai_api_key", "anthropic_api_key", "google_api_key", "groq_api_key",
    "perplexity_api_key", "tavily_api_key", "serper_api_key", "exa_api_key",
    "kipris_api_key", "patsnap_api_key", "lens_api_key",
    "preferred_llm", "preferred_search", "language",
]


class CreateUserRequest(BaseModel):
    username: str
    email: Optional[str] = ""
    password: str
    display_name: Optional[str] = ""
    avatar_emoji: Optional[str] = "👤"
    is_admin: Optional[bool] = False


class AdminSettingsUpdate(BaseModel):
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


class PasswordChangeRequest(BaseModel):
    new_password: str


# ── User Management ────────────────────────────────────────────────────────

@router.get("/users")
async def list_users(admin: dict = Depends(require_admin)):
    return await get_all_users()


@router.post("/users")
async def add_user(body: CreateUserRequest, admin: dict = Depends(require_admin)):
    try:
        user = await create_user(
            username=body.username.strip(),
            email=body.email or "",
            password=body.password,
            is_admin=body.is_admin or False,
            display_name=body.display_name or body.username,
            avatar_emoji=body.avatar_emoji or "👤",
        )
        # Return without hashed_password
        return {k: v for k, v in user.items() if k != "hashed_password"}
    except Exception as e:
        if "UNIQUE" in str(e):
            raise HTTPException(status_code=400, detail=f"이미 존재하는 사용자명입니다: {body.username}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/users/{user_id}/toggle")
async def toggle_active(user_id: int, admin: dict = Depends(require_admin)):
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="자신의 계정을 비활성화할 수 없습니다.")
    result = await toggle_user_active(user_id)
    if not result:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    return {k: v for k, v in result.items() if k != "hashed_password"}


@router.put("/users/{user_id}/password")
async def change_password(user_id: int, body: PasswordChangeRequest, admin: dict = Depends(require_admin)):
    await update_user_password(user_id, body.new_password)
    return {"message": "비밀번호가 변경되었습니다."}


@router.delete("/users/{user_id}")
async def remove_user(user_id: int, admin: dict = Depends(require_admin)):
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="자신의 계정을 삭제할 수 없습니다.")
    await delete_user(user_id)
    return {"message": "사용자가 삭제되었습니다."}


# ── API Key Management (Admin Only) ──────────────────────────────────────────

@router.put("/settings")
async def update_admin_settings(body: AdminSettingsUpdate, admin: dict = Depends(require_admin)):
    """Save API keys (encrypted) and preferences. Admin only."""
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="변경할 설정이 없습니다.")
    await set_settings_bulk(updates)
    return {"message": "설정이 저장되었습니다.", "updated_keys": list(updates.keys())}


@router.get("/settings")
async def get_admin_settings(admin: dict = Depends(require_admin)):
    """Get API key status (is_set only, never actual key values). Admin only."""
    settings = await get_all_settings()
    result = {}
    for key in SETTINGS_KEYS:
        val = settings.get(key, "")
        if key in API_KEY_FIELDS:
            result[f"{key}_is_set"] = bool(val)
        else:
            result[key] = val
    return result
