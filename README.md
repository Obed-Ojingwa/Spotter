
```
Spotter
├─ backend
│  ├─ .env
│  ├─ alembic
│  ├─ app
│  │  ├─ admin
│  │  │  ├─ router.py
│  │  │  └─ service.py
│  │  ├─ agents
│  │  │  ├─ points.py
│  │  │  ├─ referrals.py
│  │  │  ├─ router.py
│  │  │  └─ service.py
│  │  ├─ auth
│  │  │  ├─ router.py
│  │  │  ├─ schemas.py
│  │  │  └─ service.py
│  │  ├─ config.py
│  │  ├─ database.py
│  │  ├─ deps.py
│  │  ├─ jobs
│  │  │  ├─ models.py
│  │  │  ├─ router.py
│  │  │  ├─ schemas.py
│  │  │  ├─ search.py
│  │  │  └─ service.py
│  │  ├─ main.py
│  │  ├─ matching
│  │  │  ├─ criteria.py
│  │  │  ├─ engine.py
│  │  │  ├─ router.py
│  │  │  ├─ schemas.py
│  │  │  └─ weights.py
│  │  ├─ models
│  │  │  ├─ application.py
│  │  │  ├─ job.py
│  │  │  ├─ match.py
│  │  │  └─ user.py
│  │  ├─ notifications
│  │  │  ├─ service.py
│  │  │  └─ templates
│  │  ├─ organizations
│  │  │  ├─ router.py
│  │  │  └─ service.py
│  │  ├─ payments
│  │  │  ├─ paystack.py
│  │  │  ├─ router.py
│  │  │  └─ service.py
│  │  ├─ routers
│  │  │  └─ auth_router.py
│  │  ├─ seeker
│  │  │  └─ seeker_router.py
│  │  ├─ spotters
│  │  │  ├─ router.py
│  │  │  └─ service.py
│  │  ├─ tasks
│  │  │  ├─ celery_app.py
│  │  │  ├─ matching_tasks.py
│  │  │  ├─ points_tasks.py
│  │  │  └─ report_tasks.py
│  │  ├─ users
│  │  │  ├─ models.py
│  │  │  ├─ router.py
│  │  │  ├─ schemas.py
│  │  │  └─ service.py
│  │  └─ utils
│  │     └─ security.py
│  ├─ docker-compose.yml
│  ├─ Dockerfile
│  ├─ pyproject.toml
│  ├─ requirements.txt
│  └─ tests
└─ frontend
   ├─ .env.local
   ├─ app
   │  ├─ (auth)
   │  ├─ (public)
   │  │  ├─ jobs
   │  │  │  ├─ page.tsx
   │  │  │  └─ [id]
   │  │  │     └─ page.tsx
   │  │  └─ page.tsx
   │  ├─ admin
   │  │  ├─ agents
   │  │  ├─ dashboard
   │  │  ├─ promotions
   │  │  ├─ reports
   │  │  └─ users
   │  ├─ agent
   │  │  ├─ dashboard
   │  │  ├─ jobs
   │  │  ├─ points
   │  │  └─ referrals
   │  ├─ org
   │  │  ├─ billing
   │  │  ├─ candidates
   │  │  ├─ dashboard
   │  │  └─ jobs
   │  ├─ seeker
   │  │  ├─ applications
   │  │  ├─ dashboard
   │  │  ├─ matches
   │  │  └─ profile
   │  └─ spotter
   │     ├─ approved
   │     └─ queue
   ├─ components
   │  ├─ ads
   │  ├─ agent
   │  ├─ jobs
   │  ├─ matching
   │  └─ ui
   ├─ Dockerfile
   ├─ layout.tsx
   ├─ lib
   │  ├─ api.ts
   │  ├─ auth.ts
   │  └─ utils.ts
   ├─ store
   │  ├─ authStore.ts
   │  └─ jobStore.ts
   └─ styles
      └─ globals.css

```