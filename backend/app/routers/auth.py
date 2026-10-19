"""
RESQNET AI — Authentication API Router

Provides login, current user introspection, and demo token generation for role testing.
"""

from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from backend.app.core.security import (
    User,
    UserRole,
    SYSTEM_USERS,
    authenticate_user,
    create_access_token,
    get_current_user,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    username: str = Field(description="Operational username (e.g. 'coordinator', 'responder', 'citizen', 'admin')")
    password: str = Field(description="Account password")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]


class UserResponse(BaseModel):
    id: str
    username: str
    name: str
    role: str
    email: str = ""


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest):
    """
    Authenticate user credentials and issue a signed HS256 JWT access token.
    """
    user = authenticate_user(payload.username, payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(user)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user={
            "id": user.id,
            "username": user.username,
            "name": user.name,
            "role": user.role.value,
        },
    )


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(user: User = Depends(get_current_user)):
    """Retrieve details and role for the currently authenticated identity."""
    return UserResponse(
        id=user.id,
        username=user.username,
        name=user.name,
        role=user.role.value,
        email=user.email or "",
    )


@router.get("/demo-tokens")
def get_demo_tokens():
    """
    Returns signed tokens for all supported roles for automated testing and operational evaluation.
    """
    tokens = {}
    for role_key, user in SYSTEM_USERS.items():
        if role_key in ("coordinator", "responder", "citizen", "admin"):
            tokens[role_key] = {
                "token": create_access_token(user),
                "role": user.role.value,
                "name": user.name,
            }
    return tokens
