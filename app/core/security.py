"""Security, hashing, cryptography and rate limiting utilities."""

import hashlib
import time
from collections import defaultdict
from cryptography.fernet import Fernet, InvalidToken
import bcrypt

from app.core.config import settings


# In-memory rate limiting tracker: key -> list of timestamp floats
_rate_limits: dict[str, list[float]] = defaultdict(list)


def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt with 12 rounds."""
    pwd_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    """Verify password against bcrypt hash, with backward-compatible sha256 fallback."""
    if not hashed_password or not password:
        return False
    
    pwd_bytes = password.encode("utf-8")
    hash_bytes = hashed_password.encode("utf-8")

    # Standard bcrypt format check
    if hashed_password.startswith(("$2b$", "$2a$", "$2y$")):
        try:
            return bcrypt.checkpw(pwd_bytes, hash_bytes)
        except Exception:
            return False

    # Backward compatibility: legacy SHA-256 hash (64 hex characters)
    if len(hashed_password) == 64 and all(c in "0123456789abcdefABCDEF" for c in hashed_password):
        legacy_hash = hashlib.sha256(pwd_bytes).hexdigest()
        return legacy_hash.lower() == hashed_password.lower()

    return False


def get_fernet() -> Fernet:
    """Return a Fernet cipher instance configured with settings.encryption_key."""
    key = settings.encryption_key
    if not key:
        key = "MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDE="
    try:
        return Fernet(key.encode("utf-8"))
    except Exception as e:
        raise ValueError(f"Invalid ENCRYPTION_KEY configured: {e}")


def encrypt_secret(plaintext: str | None) -> str:
    """Encrypt a secret string using Fernet. Returns empty string if plaintext is empty."""
    if not plaintext:
        return ""
    cipher = get_fernet()
    return cipher.encrypt(plaintext.encode("utf-8")).decode("utf-8")


def decrypt_secret(ciphertext: str | None) -> str:
    """Decrypt a Fernet encrypted string. If plaintext or unencrypted, returns as-is."""
    if not ciphertext:
        return ""
    # Standard Fernet tokens begin with 'gAAAAA'
    if ciphertext.startswith("gAAAAA"):
        cipher = get_fernet()
        try:
            return cipher.decrypt(ciphertext.encode("utf-8")).decode("utf-8")
        except InvalidToken:
            # If decryption fails (e.g. key changed), return empty or raw string
            return ciphertext
        except Exception:
            return ciphertext
    return ciphertext


def mask_secret(secret: str | None) -> str:
    """Mask a secret for safe exposure in API responses (e.g. 'sk-1...9xyz')."""
    if not secret:
        return ""
    decrypted = decrypt_secret(secret)
    if len(decrypted) <= 8:
        return "********"
    return f"{decrypted[:4]}...{decrypted[-4:]}"


def is_rate_limited(key: str, max_attempts: int = 5, window_seconds: int = 60) -> bool:
    """Check if the given key has exceeded max_attempts within window_seconds."""
    now = time.time()
    cutoff = now - window_seconds
    timestamps = [t for t in _rate_limits[key] if t > cutoff]
    _rate_limits[key] = timestamps
    return len(timestamps) >= max_attempts


def record_attempt(key: str) -> None:
    """Record an authentication or sensitive operation attempt."""
    _rate_limits[key].append(time.time())


def reset_rate_limit(key: str) -> None:
    """Reset the rate limit tracker for a key upon successful authentication."""
    if key in _rate_limits:
        del _rate_limits[key]

