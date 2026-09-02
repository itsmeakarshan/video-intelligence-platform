import uuid
from datetime import datetime, timedelta
from typing import Optional, Tuple
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError
from passlib.hash import pbkdf2_sha256, bcrypt
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models.user import User

security = HTTPBearer(auto_error=False)
ph = PasswordHasher()


def hash_password(password: str) -> str:
    return ph.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not plain_password or not hashed_password:
        return False

    # 1. Try Argon2
    if hashed_password.startswith("$argon2"):
        try:
            return ph.verify(hashed_password, plain_password)
        except (VerifyMismatchError, VerificationError, Exception):
            return False

    # 2. Try bcrypt
    if hashed_password.startswith("$2a$") or hashed_password.startswith("$2b$"):
        try:
            return bcrypt.verify(plain_password, hashed_password)
        except Exception:
            return False

    # 3. Fallback
    try:
        return pbkdf2_sha256.verify(plain_password, hashed_password)
    except Exception:
        return plain_password == hashed_password


def create_access_token(user_id: int, role: str = "student") -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {
        "sub": str(user_id),
        "user_id": str(user_id),
        "role": role,
        "jti": str(uuid.uuid4()),
        "exp": expire,
    }
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Tuple[Optional[int], Optional[str]]:
    if not token:
        return None, None
    try:
        cleaned = token.strip().strip('"').strip("'")
        if cleaned.lower().startswith("bearer "):
            cleaned = cleaned[7:].strip()

        payload = jwt.decode(
            cleaned,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            options={"verify_sub": False},
        )
        user_id_str = payload.get("sub") or payload.get("user_id")
        user_id = int(user_id_str) if user_id_str else None
        role = payload.get("role", "student")
        return user_id, role
    except Exception:
        return None, None


def get_current_user_optional(
    auth: Optional[HTTPAuthorizationCredentials] = Security(security),
    db: Session = Depends(get_db),
) -> Optional[User]:
    if not auth:
        return None
    user_id, _ = decode_access_token(auth.credentials)
    if not user_id:
        return None
    return db.query(User).filter(User.id == user_id).first()


def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Security(security),
    db: Session = Depends(get_db),
) -> User:
    if not auth:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id, _ = decode_access_token(auth.credentials)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required.",
        )
    return current_user
