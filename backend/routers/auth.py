"""
Auth router: Login endpoint for users and admins.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from services.db_service import get_user_by_username, get_user_by_id
from services.auth_service import verify_password, create_token
from services.auth_middleware import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/login")
async def login(body: LoginRequest):
    """Authenticate user and return session token."""
    user = await get_user_by_username(body.username.strip())
    if not user:
        raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 올바르지 않습니다.")
    if not verify_password(body.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 올바르지 않습니다.")
    if not user["is_active"]:
        raise HTTPException(status_code=403, detail="계정이 비활성화되었습니다. 관리자에게 문의하세요.")
    
    token = create_token(
        user_id=user["id"],
        username=user["username"],
        is_admin=bool(user["is_admin"])
    )
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "display_name": user["display_name"] or user["username"],
            "avatar_emoji": user["avatar_emoji"],
            "is_admin": bool(user["is_admin"]),
        }
    }


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user info."""
    return {
        "id": current_user["id"],
        "username": current_user["username"],
        "display_name": current_user.get("display_name", current_user["username"]),
        "avatar_emoji": current_user.get("avatar_emoji", "👤"),
        "email": current_user.get("email", ""),
        "is_admin": bool(current_user["is_admin"]),
        "is_active": bool(current_user["is_active"]),
    }
