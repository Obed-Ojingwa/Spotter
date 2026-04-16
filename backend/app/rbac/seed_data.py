# C:\Users\Melody\Documents\Spotter\backend\app\rbac\seed_data.py
"""
Canonical role and permission definitions.
Called by app/seed.py and migrations.
"""

# ── Roles ─────────────────────────────────────────────────────────────────
ROLES = [
    {
        "name": "Super Admin",
        "slug": "super_admin",
        "description": "Unrestricted access. Overrides every permission rule.",
        "hierarchy_level": 0,
        "is_system": True,
    },
    {
        "name": "Executive Admin",
        "slug": "executive_admin",
        "description": "Manages admin accounts, monitors platform, views analytics.",
        "hierarchy_level": 1,
        "is_system": True,
    },
    {
        "name": "Admin",
        "slug": "admin",
        "description": "Manages platform operations, agents, jobs, and organisations.",
        "hierarchy_level": 2,
        "is_system": True,
    },
    {
        "name": "Agent",
        "slug": "agent",
        "description": "Intermediary. Creates org/seeker accounts, posts jobs, earns points.",
        "hierarchy_level": 3,
        "is_system": True,
    },
    {
        "name": "Spotter",
        "slug": "spotter",
        "description": "Reviews and approves/rejects candidate matches.",
        "hierarchy_level": 4,
        "is_system": True,
    },
    {
        "name": "Organization",
        "slug": "org",
        "description": "Employer. Posts jobs, reviews applicants, hires seekers.",
        "hierarchy_level": 5,
        "is_system": True,
    },
    {
        "name": "Seeker",
        "slug": "seeker",
        "description": "Job seeker. Browses jobs, applies, tracks applications.",
        "hierarchy_level": 6,
        "is_system": True,
    },
]

# ── Permissions ────────────────────────────────────────────────────────────
# Format: (slug, resource, action, description)
PERMISSIONS = [
    # ── User management ────────────────────────────────────────────────────
    ("create_user",              "user", "create",    "Create any user account"),
    ("read_user",                "user", "read",      "View user profiles"),
    ("update_user",              "user", "update",    "Edit any user profile"),
    ("delete_user",              "user", "delete",    "Delete any user account"),
    ("activate_user",            "user", "activate",  "Enable or disable a user account"),

    # ── Role management ────────────────────────────────────────────────────
    ("assign_role",              "role", "assign",    "Assign any role to a user"),
    ("remove_role",              "role", "remove",    "Remove a role from a user"),
    ("create_role",              "role", "create",    "Create a new role"),
    ("edit_role",                "role", "edit",      "Modify a role's metadata"),
    ("delete_role",              "role", "delete",    "Delete a non-system role"),

    # ── Specific role assignment permissions ───────────────────────────────
    ("assign_admin_role",        "role", "assign_admin",     "Assign the Admin role"),
    ("assign_executive_role",    "role", "assign_executive", "Assign the Executive Admin role"),
    ("assign_agent_role",        "role", "assign_agent",     "Assign the Agent role"),
    ("assign_spotter_role",      "role", "assign_spotter",   "Assign the Spotter role"),

    # ── Permission management ──────────────────────────────────────────────
    ("manage_permissions",       "permission", "manage",     "Add/remove permissions from roles"),
    ("grant_permission",         "permission", "grant",      "Grant a permission to a user"),
    ("revoke_permission",        "permission", "revoke",     "Revoke a permission from a user"),
    ("delegate_permission",      "permission", "delegate",   "Delegate a permission to another user"),
    ("assign_temp_role",         "permission", "temp_role",  "Assign a temporary role to a user"),

    # ── Organisation management ────────────────────────────────────────────
    ("create_org",               "org", "create",    "Create an organisation account"),
    ("approve_org",              "org", "approve",   "Approve an organisation account"),
    ("manage_org",               "org", "manage",    "Edit any organisation"),

    # ── Job management ─────────────────────────────────────────────────────
    ("create_job",               "job", "create",    "Post a job listing"),
    ("edit_job",                 "job", "edit",      "Edit any job listing"),
    ("delete_job",               "job", "delete",    "Delete any job listing"),
    ("moderate_job",             "job", "moderate",  "Moderate / flag job postings"),
    ("manage_job_categories",    "job", "categories","Manage job categories"),

    # ── Application management ─────────────────────────────────────────────
    ("view_applications",        "application", "read",   "View job applications"),
    ("manage_applications",      "application", "manage", "Shortlist, reject, or manage applications"),
    ("apply_for_seeker",         "application", "proxy",  "Apply for a job on behalf of a seeker"),

    # ── Matching ───────────────────────────────────────────────────────────
    ("trigger_match",            "match", "trigger",  "Trigger a match for a job"),
    ("review_match",             "match", "review",   "Review and approve/reject a match"),
    ("view_candidates",          "match", "view",     "View matched candidates"),
    ("unlock_candidates",        "match", "unlock",   "Unlock premium candidates"),

    # ── Payments ───────────────────────────────────────────────────────────
    ("process_payment",          "payment", "process", "Process payment on behalf of a user"),
    ("view_payments",            "payment", "view",    "View payment records"),
    ("manage_payouts",           "payment", "payout",  "Approve agent point payouts"),

    # ── Agent system ───────────────────────────────────────────────────────
    ("manage_agents",            "agent", "manage",   "Enable/disable/monitor agents"),
    ("grant_bonus_points",       "agent", "bonus",    "Grant bonus points to agents"),
    ("convert_points",           "agent", "convert",  "Request points-to-naira conversion"),

    # ── Analytics & reporting ──────────────────────────────────────────────
    ("view_analytics",           "analytics", "view",   "View platform analytics"),
    ("export_reports",           "analytics", "export", "Export platform reports as CSV"),

    # ── Seeker actions ─────────────────────────────────────────────────────
    ("create_seeker_profile",    "seeker", "create",  "Create/edit a seeker profile"),
    ("search_jobs",              "seeker", "search",  "Search and browse jobs"),
    ("apply_to_job",             "seeker", "apply",   "Apply to a job"),

    # ── Platform admin ─────────────────────────────────────────────────────
    ("manage_platform",          "platform", "manage", "Full platform management"),
    ("run_promotions",           "platform", "promote","Run bonus point promotions"),
]

# ── Default role-to-permission mappings ───────────────────────────────────
# Super Admin: all permissions (handled in resolver, not mapped here)
ROLE_PERMISSIONS: dict[str, list[str]] = {

    "executive_admin": [
        "create_user", "read_user", "update_user", "activate_user",
        "assign_role",
        "assign_admin_role", "assign_agent_role", "assign_spotter_role",
        "assign_executive_role",
        "remove_role", "view_analytics", "export_reports",
        "manage_agents", "approve_org",
        "view_applications", "view_payments",
        "moderate_job", "manage_job_categories",
    ],

    "admin": [
        "read_user", "activate_user",
        "assign_agent_role", "assign_spotter_role",
        "approve_org", "manage_org",
        "create_job", "edit_job", "delete_job", "moderate_job", "manage_job_categories",
        "view_applications", "manage_applications",
        "manage_agents", "grant_bonus_points",
        "view_analytics", "view_payments", "manage_payouts",
        "run_promotions",
    ],

    "agent": [
        "create_org", "create_user",
        "create_job", "edit_job",
        "apply_for_seeker",
        "view_applications",
        "trigger_match",
        "process_payment",
        "convert_points",
    ],

    "spotter": [
        "review_match",
        "view_candidates",
        "read_user",
    ],

    "org": [
        "create_job", "edit_job", "delete_job",
        "view_applications", "manage_applications",
        "trigger_match", "view_candidates", "unlock_candidates",
        "process_payment",
    ],

    "seeker": [
        "create_seeker_profile",
        "search_jobs",
        "apply_to_job",
        "trigger_match",
    ],
}
