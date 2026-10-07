"""Field encryption at rest (Fernet: AES-128-CBC + HMAC-SHA256) for phone numbers and free-text notes.

Values are stored as "enc1:<token>". Rows written before encryption was added are plain text and are
read back unchanged, then encrypted the next time they are saved.
"""

from __future__ import annotations

import base64
import hashlib
from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy import String
from sqlalchemy.types import TypeDecorator

from app.core.config import get_settings

PREFIX = "enc1:"
# Development only: production refuses to start without DATA_ENCRYPTION_KEY.
_DEV_KEY = base64.urlsafe_b64encode(hashlib.sha256(b"prism-dev-only-field-key").digest())


@lru_cache
def _fernet() -> Fernet:
    key = get_settings().data_encryption_key
    if not key:
        return Fernet(_DEV_KEY)
    try:
        return Fernet(key.encode())
    except ValueError:
        # Any long random secret works (e.g. one a hosting dashboard generated): derive a Fernet key from it.
        return Fernet(base64.urlsafe_b64encode(hashlib.sha256(key.encode()).digest()))


def encrypt(value: str) -> str:
    return PREFIX + _fernet().encrypt(value.encode()).decode()


def decrypt(value: str) -> str:
    if not value.startswith(PREFIX):
        return value  # written before encryption was turned on
    try:
        return _fernet().decrypt(value[len(PREFIX) :].encode()).decode()
    except InvalidToken as e:
        raise RuntimeError("Encrypted field cannot be read: DATA_ENCRYPTION_KEY changed") from e


class EncryptedString(TypeDecorator):
    """A string column whose value is encrypted in the database and plain in Python.

    The ciphertext is longer than the text: `length` is the column size, not the text limit
    (the API schema enforces that). It cannot be searched or compared in SQL.
    """

    impl = String
    cache_ok = True

    def process_bind_param(self, value: str | None, dialect) -> str | None:  # noqa: ANN001
        return None if value is None else encrypt(value)

    def process_result_value(self, value: str | None, dialect) -> str | None:  # noqa: ANN001
        return None if value is None else decrypt(value)
