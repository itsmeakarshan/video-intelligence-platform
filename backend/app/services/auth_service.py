from datetime import datetime, timedelta, timezone

from argon2 import PasswordHasher
from argon2.exceptions import (
    InvalidHashError,
    VerificationError,
    VerifyMismatchError,
)

from jose import JWTError, jwt

from app.core.config import settings


# --------------------------------------------------
# Password hashing
# --------------------------------------------------

password_hasher = PasswordHasher()


def hash_password(password: str) -> str:

    return password_hasher.hash(password)


def verify_password(
    password: str,
    password_hash: str
) -> bool:

    try:

        return password_hasher.verify(
            password_hash,
            password
        )

    except (
        VerifyMismatchError,
        VerificationError,
        InvalidHashError,
    ):

        return False


# --------------------------------------------------
# JWT
# --------------------------------------------------

def create_access_token(
    user_id: int
) -> str:

    expire = (
        datetime.now(timezone.utc)
        + timedelta(minutes=60 * 24)
    )

    payload = {
        "sub": str(user_id),
        "exp": expire
    }

    return jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )


def decode_access_token(
    token: str
) -> int | None:

    try:

        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[
                settings.JWT_ALGORITHM
            ]
        )

        user_id = payload.get("sub")

        if user_id is None:
            return None

        return int(user_id)

    except (
        JWTError,
        ValueError,
        TypeError
    ):

        return None