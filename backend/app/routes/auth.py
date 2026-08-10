from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User

from app.schemas.user import (
    UserRegister,
    UserLogin,
    TokenResponse,
    UserResponse,
)

from app.services.auth_service import (
    hash_password,
    verify_password,
    create_access_token,
)


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(
    request: UserRegister,
    db: Session = Depends(get_db),
):

    existing_user = (
        db.query(User)
        .filter(
            User.email == request.email
        )
        .first()
    )

    if existing_user:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists.",
        )

    user = User(
        name=request.name.strip(),
        email=request.email.lower().strip(),
        password_hash=hash_password(
            request.password
        ),
    )

    db.add(user)

    db.commit()

    db.refresh(user)

    return user


@router.post(
    "/login",
    response_model=TokenResponse,
)
def login(
    request: UserLogin,
    db: Session = Depends(get_db),
):

    user = (
        db.query(User)
        .filter(
            User.email == request.email.lower().strip()
        )
        .first()
    )

    if not user:

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not verify_password(
        request.password,
        user.password_hash,
    ):

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    access_token = create_access_token(
        user.id
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user,
    }