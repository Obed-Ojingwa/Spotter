# C:\Users\Melody\Documents\Spotter\backend\app\deps.py
"""
Main deps file - now re-exports everything from rbac.deps.
Existing imports like `from app.deps import get_admin` continue to work unchanged.
"""
from app.rbac.deps import (
    get_current_user,
    require_role,
    require_permission,
    require_hierarchy_above,
    assert_higher_than,
    get_seeker,
    get_org,
    get_agent,
    get_spotter,
    get_admin,
    get_super_admin,
)

__all__ = [
    "get_current_user",
    "require_role",
    "require_permission",
    "require_hierarchy_above",
    "assert_higher_than",
    "get_seeker",
    "get_org",
    "get_agent",
    "get_spotter",
    "get_admin",
    "get_super_admin",
]
