from fastapi import APIRouter, Depends
from models.user import User, UserRole
from core.auth import get_current_user, require_roles

router = APIRouter()

@router.get("/me", response_model=dict)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    """Return the authenticated user's profile from the JWT token."""
    return {
        "id": str(current_user.id),
        "clerk_id": current_user.clerk_id,
        "email": current_user.email,
        "name": current_user.name,
        "role": current_user.role.value,
        "subscription_tier": current_user.subscription_tier,
        "created_at": current_user.created_at
    }

# Example of a role-based protected endpoint
@router.get("/admin/only")
async def admin_only_route(current_user: User = Depends(require_roles([UserRole.firm, UserRole.advocate]))):
    """
    Example of role-based access route.
    """
    return {"message": f"Hello, privileged user {current_user.name}"}
