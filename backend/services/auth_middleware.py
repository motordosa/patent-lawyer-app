"""
Auth middleware: FastAPI dependencies for authentication and authorization.
"""
from fastapi import Header, HTTPException, status, Depends
from typing import Optional
from services.auth_service import verify_token
from services.db_service import get_user_by_id


async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """Extract and validate JWT from Authorization header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증이 필요합니다. 로그인해주세요.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization.split(" ", 1)[1]
    payload = verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="세션이 만료되었거나 유효하지 않습니다. 다시 로그인해주세요.",
        )
    # Check user still exists and is active in DB
    user = await get_user_by_id(payload["user_id"])
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="사용자를 찾을 수 없습니다.")
    if not user.get("is_active", True):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="계정이 비활성화되었습니다. 관리자에게 문의하세요.")
    return user


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """Require admin role."""
    if not user.get("is_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="관리자 권한이 필요합니다.",
        )
    return user


async def get_optional_user(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    """Return user if authenticated, else None (for optional auth endpoints)."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        return await get_current_user(authorization)
    except HTTPException:
        return None
