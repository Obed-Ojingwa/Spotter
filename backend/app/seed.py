# C:\Users\Melody\Documents\Spotter\backend\app\seed.py
"""
Run once after first launch:
  Windows: cd backend && venv\Scripts\activate && python -m app.seed
  Docker:  docker compose exec backend python -m app.seed

This script:
1. Creates all demo user accounts
2. Seeds the RBAC roles, permissions, and mappings
3. Migrates all existing users into the new UserRoles table
"""
import asyncio
import random
import string
from sqlalchemy import select
from app.database import AsyncSessionLocal, engine, Base
import app.models
import app.rbac.models

from app.models import User, UserRole as LegacyUserRole, JobSeeker, Organization, Agent, Spotter, MatchingWeight
from app.rbac.models import Role, Permission, RolePermission, UserRole as RBACUserRole
from app.rbac.seed_data import ROLES, PERMISSIONS, ROLE_PERMISSIONS
from app.auth.service import hash_password


def gen_referral_code(length: int = 8) -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))


async def seed_rbac_roles_and_permissions(db):
    """Seed all roles, permissions, and their mappings."""

    print("\n── Seeding RBAC roles ──────────────────────────────────")
    role_map: dict[str, Role] = {}

    for role_data in ROLES:
        result = await db.execute(select(Role).where(Role.slug == role_data["slug"]))
        role = result.scalar_one_or_none()
        if not role:
            role = Role(**role_data)
            db.add(role)
            await db.flush()
            print(f"  ✓ Role: {role.name} (level {role.hierarchy_level})")
        role_map[role.slug] = role

    print("\n── Seeding permissions ─────────────────────────────────")
    perm_map: dict[str, Permission] = {}

    for perm_data in PERMISSIONS:
        slug, resource, action, description = perm_data
        result = await db.execute(select(Permission).where(Permission.slug == slug))
        perm = result.scalar_one_or_none()
        if not perm:
            perm = Permission(
                name=slug.replace("_", " ").title(),
                slug=slug,
                resource=resource,
                action=action,
                description=description,
            )
            db.add(perm)
            await db.flush()
        perm_map[slug] = perm

    print(f"  ✓ {len(perm_map)} permissions seeded")

    print("\n── Seeding role-permission mappings ────────────────────")
    for role_slug, perm_slugs in ROLE_PERMISSIONS.items():
        role = role_map.get(role_slug)
        if not role:
            continue
        for perm_slug in perm_slugs:
            perm = perm_map.get(perm_slug)
            if not perm:
                continue
            exists = await db.execute(
                select(RolePermission).where(
                    RolePermission.role_id == role.id,
                    RolePermission.permission_id == perm.id,
                )
            )
            if not exists.scalar_one_or_none():
                db.add(RolePermission(role_id=role.id, permission_id=perm.id))

    await db.flush()
    print(f"  ✓ Role-permission mappings seeded")
    return role_map


async def migrate_existing_users_to_rbac(db, role_map: dict):
    """Assign RBAC UserRole records to all existing users based on their legacy role."""
    print("\n── Migrating existing users to RBAC ────────────────────")

    # Map legacy role enum values → RBAC role slugs
    legacy_to_rbac = {
        "super_admin": "super_admin",
        "admin":       "admin",
        "agent":       "agent",
        "spotter":     "spotter",
        "org":         "org",
        "seeker":      "seeker",
    }

    result = await db.execute(select(User))
    users = result.scalars().all()
    migrated = 0

    for user in users:
        rbac_slug = legacy_to_rbac.get(user.role.value, "seeker")
        role = role_map.get(rbac_slug)
        if not role:
            continue

        # Check if already has this RBAC role
        existing = await db.execute(
            select(RBACUserRole).where(
                RBACUserRole.user_id == user.id,
                RBACUserRole.role_id == role.id,
            )
        )
        if not existing.scalar_one_or_none():
            db.add(RBACUserRole(
                user_id=user.id,
                role_id=role.id,
                is_primary=True,
            ))
            migrated += 1

    await db.flush()
    print(f"  ✓ Migrated {migrated} existing users to RBAC roles")


async def seed():
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:

        # ── Seed RBAC system ──────────────────────────────────────────────
        role_map = await seed_rbac_roles_and_permissions(db)

        # ── Helper ────────────────────────────────────────────────────────
        async def create_user(email, password, legacy_role, label, rbac_slug=None):
            result = await db.execute(select(User).where(User.email == email))
            if result.scalar_one_or_none():
                print(f"  (exists) {label}: {email}")
                return None
            user = User(
                email=email,
                password_hash=hash_password(password),
                role=legacy_role,
                is_active=True,
                is_verified=True,
            )
            db.add(user)
            await db.flush()

            # Assign RBAC role
            slug = rbac_slug or legacy_role.value
            role = role_map.get(slug)
            if role:
                db.add(RBACUserRole(
                    user_id=user.id,
                    role_id=role.id,
                    is_primary=True,
                ))

            print(f"  ✓ {label}: {email} / {password}")
            return user

        print("\n── Creating demo accounts ───────────────────────────────")

        # Super Admin
        await create_user(
            "admin@spotter.ng", "Admin@1234",
            LegacyUserRole.SUPER_ADMIN, "Super Admin", "super_admin"
        )

        # Executive Admin (new role — maps to ADMIN legacy for now)
        exec_user = await create_user(
            "exec@spotter.ng", "Exec@1234",
            LegacyUserRole.ADMIN, "Executive Admin", "executive_admin"
        )

        # Admin
        await create_user(
            "manager@spotter.ng", "Manager@1234",
            LegacyUserRole.ADMIN, "Admin", "admin"
        )

        # Spotter
        spotter_user = await create_user(
            "spotter@spotter.ng", "Spotter@1234",
            LegacyUserRole.SPOTTER, "Spotter", "spotter"
        )
        if spotter_user:
            db.add(Spotter(user_id=spotter_user.id, name="Demo Spotter"))

        # Job Seeker
        seeker_user = await create_user(
            "seeker@test.com", "Seeker@1234",
            LegacyUserRole.SEEKER, "Job Seeker", "seeker"
        )
        if seeker_user:
            db.add(JobSeeker(
                user_id=seeker_user.id,
                name="Amaka Okonkwo",
                city="Ikeja", state="Lagos",
                gender="Female", age=27,
                education="BSc",
                degree_classification="Second Class Upper",
                skills=["Python", "Data Analysis", "Excel", "Communication"],
                tech_stack=["Python", "SQL", "Power BI"],
                soft_skills=["Leadership", "Teamwork"],
                work_mode="hybrid", available=True, profile_complete=True,
                work_experience=[{
                    "company": "TechCorp Nigeria", "role": "Data Analyst",
                    "years": 2, "description": "Analysed sales data"
                }],
            ))

        # Organisation
        org_user = await create_user(
            "hr@testcompany.com", "Org@1234",
            LegacyUserRole.ORG, "Organisation", "org"
        )
        if org_user:
            db.add(Organization(
                user_id=org_user.id,
                name="TestCompany Nigeria Ltd",
                description="A leading technology company in Lagos",
                industry="Technology",
                city="Victoria Island", state="Lagos",
                free_posts_left=2, free_matches_left=2,
                is_verified=True,
            ))

        # Agent
        agent_user = await create_user(
            "agent@test.com", "Agent@1234",
            LegacyUserRole.AGENT, "Agent", "agent"
        )
        if agent_user:
            db.add(Agent(
                user_id=agent_user.id,
                name="Emeka Eze",
                referral_code=gen_referral_code(),
                points=0.0, plan="basic",
            ))

        # ── Matching weights ─────────────────────────────────────────────
        print("\n── Seeding matching weights ────────────────────────────")
        DEFAULT_WEIGHTS = [
            ("skills", 30.0), ("tech_stack", 20.0), ("experience", 15.0),
            ("location", 12.0), ("education", 8.0), ("work_mode", 5.0),
            ("availability", 5.0), ("demographics", 5.0),
        ]
        for criterion, weight in DEFAULT_WEIGHTS:
            result = await db.execute(
                select(MatchingWeight).where(MatchingWeight.criterion == criterion)
            )
            if not result.scalar_one_or_none():
                db.add(MatchingWeight(criterion=criterion, weight=weight))

        # ── Migrate any pre-existing users to RBAC ────────────────────────
        await migrate_existing_users_to_rbac(db, role_map)

        await db.commit()

        print("\n════════════════════════════════════════════════════════")
        print("  SPOTTER v2.0 — Database seeded with RBAC system!")
        print("════════════════════════════════════════════════════════")
        print()
        print("  Account            Email                    Password")
        print("  ──────────────────────────────────────────────────────")
        print("  Super Admin    →  admin@spotter.ng         Admin@1234")
        print("  Exec Admin     →  exec@spotter.ng          Exec@1234")
        print("  Admin          →  manager@spotter.ng       Manager@1234")
        print("  Spotter        →  spotter@spotter.ng       Spotter@1234")
        print("  Job Seeker     →  seeker@test.com          Seeker@1234")
        print("  Organisation   →  hr@testcompany.com       Org@1234")
        print("  Agent          →  agent@test.com           Agent@1234")
        print("════════════════════════════════════════════════════════")
        print()
        print("  RBAC endpoints: http://localhost:8000/api/docs#/rbac")
        print("  My permissions: GET /api/rbac/me/permissions")
        print("════════════════════════════════════════════════════════\n")


if __name__ == "__main__":
    asyncio.run(seed())
