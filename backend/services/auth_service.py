"""
Auth Service: JWT session management, password hashing, Fernet encryption for API keys.
"""
import os
import secrets
import base64
import hashlib
from datetime import datetime, timedelta
from typing import Optional

# ── Fernet encryption for API keys stored in DB ─────────────────────────────
from cryptography.fernet import Fernet

def _get_or_create_fernet_key() -> bytes:
    """Get Fernet key from env, or generate a stable one from a secret phrase."""
    raw = os.getenv("FERNET_KEY", "")
    if raw:
        # Must be 32 url-safe base64-encoded bytes
        try:
            return raw.encode() if isinstance(raw, str) else raw
        except Exception:
            pass
    # Derive a stable key from SECRET_KEY or a hardcoded fallback
    secret = os.getenv("SECRET_KEY", "patent-lawyer-default-secret-change-in-production")
    derived = hashlib.sha256(secret.encode()).digest()
    return base64.urlsafe_b64encode(derived)

FERNET = Fernet(_get_or_create_fernet_key())


def encrypt_value(plaintext: str) -> str:
    """Encrypt a string value for storage."""
    if not plaintext:
        return ""
    return FERNET.encrypt(plaintext.encode()).decode()


def decrypt_value(ciphertext: str) -> str:
    """Decrypt a stored encrypted value. Returns '' on failure."""
    if not ciphertext:
        return ""
    try:
        return FERNET.decrypt(ciphertext.encode()).decode()
    except Exception:
        # If decryption fails (e.g. plaintext legacy value), return as-is
        return ciphertext


# ── Password hashing ─────────────────────────────────────────────────────────
try:
    import bcrypt
    def hash_password(password: str) -> str:
        return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    def verify_password(password: str, hashed: str) -> bool:
        try:
            return bcrypt.checkpw(password.encode(), hashed.encode())
        except Exception:
            return False

except ImportError:
    # Fallback to simple sha256 if bcrypt not available
    def hash_password(password: str) -> str:
        return hashlib.sha256(password.encode()).hexdigest()

    def verify_password(password: str, hashed: str) -> bool:
        return hashlib.sha256(password.encode()).hexdigest() == hashed


# ── JWT-like session tokens (simple signed tokens) ───────────────────────────
import json
import hmac

SECRET_KEY = os.getenv("SECRET_KEY", "patent-lawyer-default-secret-change-in-production")
TOKEN_EXPIRE_HOURS = int(os.getenv("TOKEN_EXPIRE_HOURS", "168"))  # 7 days


def create_token(user_id: int, username: str, is_admin: bool) -> str:
    """Create a signed session token."""
    payload = {
        "user_id": user_id,
        "username": username,
        "is_admin": is_admin,
        "exp": (datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS)).isoformat(),
        "jti": secrets.token_hex(16),
    }
    data = json.dumps(payload, separators=(',', ':'))
    sig = hmac.new(SECRET_KEY.encode(), data.encode(), hashlib.sha256).hexdigest()
    # Encode: base64(data).sig
    encoded = base64.urlsafe_b64encode(data.encode()).decode()
    return f"{encoded}.{sig}"


def verify_token(token: str) -> Optional[dict]:
    """Verify and decode a session token. Returns payload dict or None."""
    try:
        parts = token.rsplit('.', 1)
        if len(parts) != 2:
            return None
        encoded, sig = parts
        data = base64.urlsafe_b64decode(encoded.encode()).decode()
        expected_sig = hmac.new(SECRET_KEY.encode(), data.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected_sig):
            return None
        payload = json.loads(data)
        # Check expiry
        exp = datetime.fromisoformat(payload["exp"])
        if datetime.utcnow() > exp:
            return None
        return payload
    except Exception:
        return None
