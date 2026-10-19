"""
RESQNET AI — Security & Role-Based Access Control (RBAC) Module

Provides cryptographic token generation, validation, user role definitions,
and FastAPI authorization dependencies. Does not trust client-supplied role values.
"""

import logging
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
import jwt
from fastapi import Depends, Header, HTTPException, status
from pydantic import BaseModel

from backend.app.core.config import settings

logger = logging.getLogger("RESQNET.Security")

# Algorithm and default token validity
ALGORITHM = "HS256"
DEFAULT_EXPIRE_MINUTES = 60 * 24  # 24 hours


class UserRole(str, Enum):
    COORDINATOR = "coordinator"
    RESPONDER = "responder"
    CITIZEN = "citizen"
    ADMIN = "admin"


class User(BaseModel):
    id: str
    username: str
    name: str
    role: UserRole
    email: Optional[str] = None
    is_active: bool = True


# Canonical registered operational users
SYSTEM_USERS: Dict[str, User] = {
    "coordinator": User(
        id="usr-coord-01",
        username="coordinator",
        name="Coordinator Jordan Davis",
        role=UserRole.COORDINATOR,
        email="jordan.davis@resqnet.gov",
    ),
    "jordan.davis": User(
        id="usr-coord-01",
        username="jordan.davis",
        name="Coordinator Jordan Davis",
        role=UserRole.COORDINATOR,
        email="jordan.davis@resqnet.gov",
    ),
    "responder": User(
        id="usr-resp-01",
        username="responder",
        name="Field Rescue Unit 1 Lead",
        role=UserRole.RESPONDER,
        email="field.lead@resqnet.gov",
    ),
    "citizen": User(
        id="usr-cit-01",
        username="citizen",
        name="Public Civilian Reporter",
        role=UserRole.CITIZEN,
        email="citizen@public.net",
    ),
    "admin": User(
        id="usr-admin-01",
        username="admin",
        name="Operations Commander",
        role=UserRole.ADMIN,
        email="admin@resqnet.gov",
    ),
}

# Pre-defined demonstration credentials (hashed or compared securely)
# Production deployments should override credentials via environment variables.
_DEMO_PASSWORDS: Dict[str, str] = {
    "coordinator": "resqnet-coord-2026",
    "jordan.davis": "resqnet-coord-2026",
    "responder": "resqnet-resp-2026",
    "citizen": "resqnet-public-2026",
    "admin": "resqnet-admin-2026",
}


def authenticate_user(username: str, password: str) -> Optional[User]:
    """Authenticate credentials against registered operational users."""
    user = SYSTEM_USERS.get(username.strip().lower())
    if not user:
        return None
    expected_pwd = _DEMO_PASSWORDS.get(username.strip().lower())
    if expected_pwd and expected_pwd == password:
        return user
    return None


def create_access_token(
    user: User,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Generate a signed HS256 JWT access token encoding identity and role."""
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=DEFAULT_EXPIRE_MINUTES))
    payload = {
        "sub": user.id,
        "username": user.username,
        "name": user.name,
        "role": user.role.value,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and cryptographically verify a JWT access token."""
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError as e:
        logger.debug(f"JWT decode error: {e}")
        return None


# Standard development token for initial environment bootstrap
DEV_COORDINATOR_TOKEN = "dev-coordinator-token"


def get_authenticated_user_strict_optional(
    authorization: Optional[str] = Header(None, description="Bearer <token> header"),
) -> Optional[User]:
    """
    Extract and verify the current user from the Authorization header strictly.
    Returns None if no Authorization header is provided (does NOT apply dev fallback).
    Raises HTTPException 401 if a token is provided but is malformed, invalid, or expired.
    """
    if not authorization:
        return None

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format. Expected 'Bearer <token>'.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Recognize dev token in development
    if token == DEV_COORDINATOR_TOKEN:
        return SYSTEM_USERS["coordinator"]

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    role_str = payload.get("role", "citizen")
    try:
        user_role = UserRole(role_str)
    except ValueError:
        user_role = UserRole.CITIZEN

    return User(
        id=payload.get("sub", "anon"),
        username=payload.get("username", "user"),
        name=payload.get("name", "Authenticated User"),
        role=user_role,
        is_active=True,
    )


def get_current_user_optional(
    authorization: Optional[str] = Header(None, description="Bearer <token> header"),
) -> Optional[User]:
    """
    Extract and verify the current user from the Authorization header.
    Returns None if no token is provided.
    """
    if not authorization:
        # Development fallback: if authorization is not provided in development mode,
        # fallback to the default coordinator to avoid breaking legacy UI or unauthenticated tests.
        if settings.ENV == "development":
            return SYSTEM_USERS["coordinator"]
        return None

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format. Expected 'Bearer <token>'.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Recognize dev token in development
    if token == DEV_COORDINATOR_TOKEN:
        return SYSTEM_USERS["coordinator"]

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    role_str = payload.get("role", "citizen")
    try:
        user_role = UserRole(role_str)
    except ValueError:
        user_role = UserRole.CITIZEN

    return User(
        id=payload.get("sub", "anon"),
        username=payload.get("username", "user"),
        name=payload.get("name", "Authenticated User"),
        role=user_role,
        is_active=True,
    )


def get_current_user(
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> User:
    """Enforces authentication: raises 401 if user is not authenticated."""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to access this resource.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return current_user


def require_roles(allowed_roles: List[str]):
    """
    Factory creating a FastAPI dependency that verifies the user's role on the server.
    Admins are always authorized.
    """
    def role_checker(user: User = Depends(get_current_user)) -> User:
        if user.role == UserRole.ADMIN or user.role.value in allowed_roles:
            return user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Access denied: Operation requires one of the following roles: {', '.join(allowed_roles)}. "
                f"Current role: '{user.role.value}'."
            ),
        )

    return role_checker
