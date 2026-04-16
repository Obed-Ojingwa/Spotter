# C:\Users\Melody\Documents\Spotter\TESTING_GUIDE.md

# SPOTTER — Local Testing Guide

Run this checklist after your first `.\setup-and-seed.ps1` to confirm everything works end-to-end.

---

## Before you start

Make sure these are running:
- PostgreSQL (check Windows Services)
- Redis (check Windows Services — tporadowski/redis)
- Backend: `.\start-backend.ps1` → wait for "Application startup complete"
- Frontend: `.\start-frontend.ps1` → wait for "Ready in Xs"

Open two tabs:
- App: http://localhost:3000
- API Docs: http://localhost:8000/api/docs

---

## 1. Health check
- [ ] Visit http://localhost:8000/api/health
- [ ] Should return: `{"status":"ok","app":"SPOTTER","env":"development"}`

---

## 2. Register accounts (do these in order)

### 2a. Register a Job Seeker
- [ ] Go to http://localhost:3000/register
- [ ] Select "Job Seeker"
- [ ] Email: `seeker@test.com` · Password: `Test@1234`
- [ ] Should redirect to `/seeker/dashboard`
- [ ] Dashboard shows "Profile 0% complete" bar

### 2b. Register an Organisation
- [ ] Open incognito window → http://localhost:3000/register
- [ ] Select "Organization"
- [ ] Email: `org@test.com` · Password: `Test@1234`
- [ ] Should redirect to `/org/dashboard`
- [ ] Dashboard shows "2 free posts · 2 free matches" banner

### 2c. Register an Agent
- [ ] Open new incognito → http://localhost:3000/register
- [ ] Select "Agent" (no referral code needed for first agent)
- [ ] Email: `agent@test.com` · Password: `Test@1234`
- [ ] Should redirect to `/agent/dashboard`
- [ ] Points balance shows `0.00 pts`

---

## 3. Complete seeker profile

Log in as seeker@test.com

- [ ] Go to `/seeker/profile`
- [ ] Fill in: Name, Gender, Age, City (Lagos), State (Lagos), Education (BSc)
- [ ] Add at least 3 skills (e.g. "Python", "Excel", "Communication")
- [ ] Add 1 work experience entry
- [ ] Set work mode to "Remote"
- [ ] Toggle Availability to "Available"
- [ ] Click Save Profile
- [ ] Should show "Complete" green badge
- [ ] Dashboard completeness bar should be 100%

---

## 4. Organisation posts a job

Log in as org@test.com

- [ ] Go to `/org/jobs/new`
- [ ] Title: "Python Developer"
- [ ] Description: "We need an experienced Python developer for our fintech team."
- [ ] State: Lagos · City: Victoria Island
- [ ] Work mode: Remote · Employment: Full-time
- [ ] Add skills: "Python", "Django", "SQL"
- [ ] Click Post Job
- [ ] Should redirect to the live job page
- [ ] Org dashboard free posts counter drops from 2 → 1

---

## 5. Seeker finds and matches to the job

Log in as seeker@test.com

- [ ] Go to `/jobs` — the Python Developer job should appear
- [ ] Click the job → job detail page loads
- [ ] Click "Get Match Score"
- [ ] Toast says "Match submitted! Score: XX% — awaiting Spotter review"
- [ ] Go to `/seeker/matches` — match appears with status "In review"

---

## 6. Spotter approves the match

Log in as spotter@spotter.ng / Spotter@1234

- [ ] Go to `/spotter/queue`
- [ ] The match should appear in the queue
- [ ] Left sidebar shows candidate name + score
- [ ] Right panel shows score breakdown bars
- [ ] Add optional notes
- [ ] Click "Approve & Reveal"
- [ ] Toast: "Match approved and revealed!"
- [ ] Queue becomes empty (or removes that item)

---

## 7. Verify match revealed on both sides

Log in as seeker@test.com
- [ ] Go to `/seeker/matches`
- [ ] Match status changed to "Revealed" (green badge)
- [ ] If score ≥ 70%: "Download Certificate" link visible
- [ ] Click to expand — score breakdown bars shown

Log in as org@test.com
- [ ] Go to `/org/candidates?job=<job-id>` (or via Candidates link in dashboard)
- [ ] Candidate appears with score badge and name
- [ ] Click to expand — skills, education, score breakdown visible
- [ ] If score ≥ 90%: premium badge shown, unlock banner appears

---

## 8. Test payment flow (dev mode)

Log in as seeker@test.com

- [ ] Trigger a second match on any job (first match is used now)
- [ ] Should get 402 error with redirect to payment
- [ ] Mock payment page appears at `/payment/mock`
- [ ] Click "Approve Payment"
- [ ] Redirected back with success message

Log in as org@test.com (if premium unlock needed)
- [ ] Go to `/org/billing`
- [ ] Click "Pay ₦15,000" on Unlock Premium Candidates
- [ ] Mock payment page → Approve → redirected back
- [ ] Blurred candidates now revealed

---

## 9. Agent workflow

Log in as agent@test.com

- [ ] Go to `/agent/jobs/new`
- [ ] Post a job (any details)
- [ ] Agent dashboard shows `2.00 pts` awarded
- [ ] Go to `/agent/referrals` — referral link visible, copy works

---

## 10. Admin dashboard

Log in as admin@spotter.ng / Admin@1234

- [ ] Go to `/admin/dashboard`
- [ ] Stats show: seekers=1, orgs=1, agents=1, spotters=1
- [ ] Revenue shows payments made in testing
- [ ] Go to `/admin/users` — all registered users visible
- [ ] Try disabling a user → status updates instantly
- [ ] Go to `/admin/promotions` → grant 5 bonus points to all agents
- [ ] Log out, log back in as agent@test.com → points show 7.00 (2 from job + 5 bonus)

---

## 11. API docs smoke test

Open http://localhost:8000/api/docs

- [ ] All routers appear: auth, jobs, applications, seeker, org, matching, spotter, agent, payments, admin
- [ ] Click GET /api/health → Execute → 200 OK
- [ ] Click GET /api/jobs → Execute → returns job list

---

## Common issues and fixes

**Backend won't start**
- Check PostgreSQL is running: `Get-Service postgresql*` in PowerShell
- Check `.env` DATABASE_URL has correct password
- Run `venv\Scripts\activate` then `python -m app.seed` manually

**Frontend shows blank page or crashes**
- Check `.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:8000/api`
- Check backend is running first
- Open browser console (F12) and check for errors

**Login redirects to wrong page**
- Clear browser localStorage: F12 → Application → Local Storage → Clear all
- Refresh and try again

**Match score is 0%**
- Make sure seeker profile is complete (all required fields filled)
- Job must have at least `required_skills` filled in

**Certificate not generating**
- This uses Celery — on Windows without Celery running it generates synchronously
- Check the `uploads/` folder in your backend directory for PDF files
