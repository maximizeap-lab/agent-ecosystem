"""
Encrypted token storage using Fernet symmetric encryption.
Wraps SQLAlchemy OAuthToken CRUD with transparent encrypt/decrypt.
"""

import os
import base64
import logging
from datetime import datetime
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy.orm import Session

from .models import OAuthToken, Provider

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Key management
# ---------------------------------------------------------------------------
# TOKEN_ENCRYPTION_KEY must be a URL-safe base64-encoded 32-byte key.
# Generate once with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
_RAW_KEY = os.getenv("TOKEN_ENCRYPTION_KEY", "")

if _RAW_KEY:
    _FERNET = Fernet(_RAW_KEY.encode())
else:
    # Dev-only fallback — log a clear warning
    logger.warning(
        "TOKEN_ENCRYPTION_KEY is not set. Generating an ephemeral key. "
        "Tokens will NOT survive restarts. Set TOKEN_ENCRYPTION_KEY in production."
    )
    _FERNET = Fernet(Fernet.generate_key())


def _encrypt(value: str) -> str:
    return _FERNET.encrypt(value.encode()).decode()


def _decrypt(value: str) -> str:
    try:
        return _FERNET.decrypt(value.encode()).decode()
    except InvalidToken as exc:
        raise ValueError("Token decryption failed — key mismatch or data corruption.") from exc


# ---------------------------------------------------------------------------
# CRUD helpers
# ---------------------------------------------------------------------------

def upsert_token(
    db: Session,
    user_id: str,
    provider: Provider,
    access_token: str,
    refresh_token: Optional[str],
    expires_at: Optional[datetime],
    scope: Optional[str] = None,
    token_type: str = "Bearer",
) -> OAuthToken:
    """Insert or update the OAuth token for a user/provider pair."""
    record = db.query(OAuthToken).filter_by(user_id=user_id, provider=provider).first()

    encrypted_access = _encrypt(access_token)
    encrypted_refresh = _encrypt(refresh_token) if refresh_token else None

    if record:
        record.access_token = encrypted_access
        record.refresh_token = encrypted_refresh
        record.expires_at = expires_at
        record.scope = scope
        record.token_type = token_type
        record.updated_at = datetime.utcnow()
        logger.debug("Updated token for user=%s provider=%s", user_id, provider)
    else:
        record = OAuthToken(
            user_id=user_id,
            provider=provider,
            access_token=encrypted_access,
            refresh_token=encrypted_refresh,
            expires_at=expires_at,
            scope=scope,
            token_type=token_type,
        )
        db.add(record)
        logger.debug("Created token for user=%s provider=%s", user_id, provider)

    db.commit()
    db.refresh(record)
    return record


def get_token(db: Session, user_id: str, provider: Provider) -> Optional[OAuthToken]:
    """
    Retrieve and decrypt a token record.
    Returns a transient OAuthToken with plaintext fields for in-memory use.
    """
    record = db.query(OAuthToken).filter_by(user_id=user_id, provider=provider).first()
    if not record:
        return None

    # Return a detached copy with decrypted values
    decrypted = OAuthToken(
        id=record.id,
        user_id=record.user_id,
        provider=record.provider,
        access_token=_decrypt(record.access_token),
        refresh_token=_decrypt(record.refresh_token) if record.refresh_token else None,
        expires_at=record.expires_at,
        scope=record.scope,
        token_type=record.token_type,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )
    return decrypted


def delete_token(db: Session, user_id: str, provider: Provider) -> bool:
    """Revoke stored tokens (e.g., on user disconnect)."""
    record = db.query(OAuthToken).filter_by(user_id=user_id, provider=provider).first()
    if record:
        db.delete(record)
        db.commit()
        logger.info("Deleted token for user=%s provider=%s", user_id, provider)
        return True
    return False
