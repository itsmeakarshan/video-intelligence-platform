from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.auth import (
    UserRegisterDto,
    UserLoginDto,
    UserResponseDto,
    TokenResponseDto,
)
from app.services.auth_service import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=UserResponseDto, status_code=status.HTTP_201_CREATED)
def register(dto: UserRegisterDto, db: Session = Depends(get_db)):
    email_clean = dto.email.strip().lower()
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email address already exists.",
        )

    user = User(
        name=dto.name.strip(),
        email=email_clean,
        password_hash=hash_password(dto.password),
        role=dto.role or "student",
        created_at=datetime.utcnow(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return UserResponseDto(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
    )


@router.post("/login", response_model=TokenResponseDto)
def login(dto: UserLoginDto, db: Session = Depends(get_db)):
    email_clean = dto.email.strip().lower()
    user = db.query(User).filter(User.email == email_clean).first()
    if not user or not verify_password(dto.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email address or password.",
        )

    token = create_access_token(user.id, user.role)
    user_dto = UserResponseDto(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
    )

    return TokenResponseDto(
        access_token=token,
        token_type="bearer",
        user=user_dto,
    )


@router.get("/me", response_model=UserResponseDto)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponseDto(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        role=current_user.role,
    )
