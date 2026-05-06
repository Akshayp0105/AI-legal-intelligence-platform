import os
import urllib.request
import json
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Callable, List, Optional

from core.database import get_db_session
from models.user import User, UserRole

security = HTTPBearer()

CLERK_JWKS_URL = os.getenv("CLERK_JWKS_URL") # e.g. https://your-clerk-domain.clerk.accounts.dev/.well-known/jwks.json

# Cache JWKS
_jwks = None

def get_jwks():
    global _jwks
    if _jwks is None and CLERK_JWKS_URL:
        try:
            with urllib.request.urlopen(CLERK_JWKS_URL) as response:
                _jwks = json.loads(response.read().decode())
        except Exception as e:
            print(f"Error fetching JWKS: {e}")
    return _jwks

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db_session)
) -> User:
    """Dependency to extract user_id from Bearer token and verify it via Clerk JWKS"""
    token = credentials.credentials
    jwks = get_jwks()

    if not jwks:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="JWKS not configured or unavailable"
        )

    try:
        # Get the unverified header to find the kid
        unverified_header = jwt.get_unverified_header(token)
        rsa_key = {}
        for key in jwks["keys"]:
            if key["kid"] == unverified_header["kid"]:
                rsa_key = {
                    "kty": key["kty"],
                    "kid": key["kid"],
                    "use": key["use"],
                    "n": key["n"],
                    "e": key["e"]
                }
                break

        if not rsa_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token header. No matching kid found.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            audience=os.getenv("CLERK_AUDIENCE"),
            issuer=os.getenv("CLERK_ISSUER")
        )
        clerk_id = payload.get("sub")
        if clerk_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
            )
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Fetch user from database
    result = await db.execute(select(User).where(User.clerk_id == clerk_id))
    user = result.scalars().first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return user

def require_roles(allowed_roles: List[UserRole]):
    """Decorator / Dependency for role-based access control"""
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted"
            )
        return current_user
    return role_checker
