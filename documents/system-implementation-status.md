# ORAN System – Implementation Status and Next Steps

_Last updated: 2025-12-28_

This document summarises what is currently implemented across the ORAN platform (frontend, backend, infra), and what is still left to build, based on the system plan and recent work.

---

## 1. Auth, Accounts & Email

**Implemented**
- Backend `AuthModule` with:
  - Email/password registration (`/auth/register`) with bcrypt hashing.
  - Login (`/auth/login`) with JWT issuance and `emailVerifiedAt` enforcement.
  - Email verification via `verificationToken` (`/auth/verify-email?token=`).
  - Forgot password + reset password flows using `resetPasswordToken` and expiry.
- Prisma `User` model extended with:
  - `role` (`CUSTOMER`, `TECHNICIAN`, `ADMIN`).
  - `emailVerifiedAt`, `verificationToken`, `resetPasswordToken`, `resetPasswordExpires`.
- Email infrastructure:
  - `EmailService` using SMTP (Resend) with:
    - Verification email.
    - Welcome email.
    - Password reset email.
    - Technician invite email (new).
  - Emails fail gracefully (errors logged, but do not break API responses).
- Frontend flows:
  - `/signup`, `/login`, `/verify-email`, `/forgot-password`, `/reset-password`.
  - All wired through Next.js API routes that proxy to the EC2 backend.
  - Dashboard banner that warns when `emailVerifiedAt` is not set.

**Remaining**
- Optional: UI to show “email not verified” state more prominently and allow resending verification email.
- Optional: rate limiting around auth endpoints and email sends.

---

## 2. Database & Infrastructure

**Implemented**
- Postgres on EC2:
  - DB: `oran_dev`, user: `oran_user`, wired via `DATABASE_URL`.
  - Prisma schema and migrations applied (`User`, `Project`, `OnboardingSession`, `Product`, `Trip`).
- Prisma:
  - `PrismaService` with safe startup (non-fatal when DB unreachable at boot).
  - `PrismaModule` shared across modules.
- Backend runtime:
  - Nest app running on port `4000`, managed by PM2 as `oran-backend`.
  - systemd unit configured so PM2 restarts on reboot.
  - Health endpoint `/health` returning JSON.
- Redis is referenced (for future caching) but not yet used functionally.

**Remaining**
- Move Postgres and Redis to managed services (e.g. RDS, ElastiCache) for production.
- Add basic observability (structured logs, metrics, error tracking).

---

## 3. Core Backend Modules

### 3.1 Projects & Onboarding

**Implemented**
- Prisma models:
  - `Project` (user, name, status, building type, rooms).
  - `OnboardingSession` (project status, construction stage, needs inspection, selected features JSON, stair steps).
- Nest modules:
  - `ProjectsModule`:
    - `POST /projects` – create project for a user.
    - `GET /projects` – list projects (with onboarding).
    - `GET /projects/:id` – project detail (with onboarding).
  - `OnboardingModule`:
    - `POST /onboarding` – upsert onboarding details for a project.
    - `GET /onboarding/:projectId` – fetch onboarding by project.

**Remaining**
- Expand `ProjectStatus` transitions and ensure APIs enforce valid state flow.
- Attach more fields to onboarding (inspection location/time, etc.) as PRD requires.

### 3.2 Products

**Implemented**
- Prisma `Product` model with category, price tier, unit price, description, image URL, active flag.
- `ProductsModule` with:
  - `POST /products` – simple create.
  - `GET /products` – list active products.
  - `GET /products/:id` – product detail.

**Remaining**
- Admin UI for product CRUD (create/update/deactivate).
- Seed script for initial product catalog.

### 3.3 Operations & Trips

**Implemented**
- Prisma `Trip` model:
  - `projectId`, optional `technicianId`, `status` (`SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`), `scheduledFor`, check-in/out timestamps, notes.
- `OperationsModule`:
  - Trips:
    - `POST /operations/trips` – create a trip for a project (validates project and technician role).
    - `GET /operations/trips?technicianId=&projectId=` – list trips filtered by technician/project.
    - `PATCH /operations/trips/:id/check-in` – mark trip as `IN_PROGRESS` and set `checkInAt`.
    - `PATCH /operations/trips/:id/check-out` – mark trip as `COMPLETED` and set `checkOutAt`.
  - Technicians:
    - `GET /operations/technicians` – list all technicians (id, name, email).
    - `POST /operations/technicians/invite` – invite flow:
      - Creates or updates a user with `role = TECHNICIAN`.
      - Generates reset token and sends technician invite email with link to set password.

**Remaining**
- Attach trips more tightly to inspection / operations flows (e.g. visit types).
- Add technician notes and photo uploads per trip (requires storage integration).
- Add status transitions validations (prevent invalid jumps).

---

## 4. Frontend – Customer App

**Implemented**
- Landing page:
  - TikTok-style “Watch Demo” viewer with vertical scroll of videos in `frontend/public/video`.
- Auth pages:
  - `/signup`, `/login`, `/forgot-password`, `/reset-password`, `/verify-email`.
  - Use `sonner` toasts, store `oran_token` and `oran_user` in `localStorage`.
- Dashboard:
  - Shows basic user info.
  - Banner for “email not verified yet” using `emailVerifiedAt`.
- Onboarding flow (`/onboarding`):
  - Multi-step client component:
    - Project status, building type, room count, feature selection, review.
  - On final step:
    - Creates a `Project` via `/api/projects`.
    - Upserts `OnboardingSession` via `/api/onboarding`.
    - Redirects to `/dashboard` with success toast.

**Remaining**
- Project list view in customer dashboard (show projects created via onboarding).
- UX polish on onboarding (validation, back/continue guardrails).

---

## 5. Frontend – Admin & Technician

### 5.1 Admin Console

**Implemented**
- `/admin` (Admin dashboard):
  - Role-gated to `ADMIN` and `TECHNICIAN`.
  - Reads `oran_user` from `localStorage`.
  - Overview:
    - Total projects (via `/api/projects`).
    - Projects in `ONBOARDING`.
    - Basic system status (backend health).
  - Recent projects list:
    - Clickable rows navigate to `/admin/projects/{id}`.
- `/admin/projects/[id]` (Project detail):
  - Shows project info + onboarding summary + selected features.
  - Lists trips for this project via `/api/operations/trips?projectId=`.
  - “Schedule a site visit” form:
    - Date/time picker.
    - Technician selector (populated from `/api/operations/technicians`).
    - Notes field.
    - Calls `POST /api/operations/trips` and refreshes trip list.
- `/admin/technicians`:
  - Role-gated list of technicians:
    - Name, email, short ID.
  - “Invite a technician” form:
    - Name (optional), email (required).
    - Uses `POST /api/operations/technicians/invite`.
    - Refreshes technicians list on success.

**Remaining**
- Admin navigation shell (e.g. sidebar linking to Dashboard, Projects, Technicians).
- Filters and search on projects and technicians.

### 5.2 Technician Workspace

**Implemented**
- `/technician`:
  - Role-gated to `TECHNICIAN` and `ADMIN`.
  - Loads trips for current technician via `/api/operations/trips?technicianId=`.
  - Metrics:
    - Assigned trips (scheduled + in progress).
    - In-progress trips.
    - Completed today.
  - Upcoming visits:
    - Next 5 trips (SCHEDULED / IN_PROGRESS) sorted by `scheduledFor`.
    - Buttons:
      - `Check in` → `/api/operations/trips/{id}/check-in`.
      - `Check out` → `/api/operations/trips/{id}/check-out`.
    - Automatically reloads trips and shows toasts on success/failure.

**Remaining**
- Show project context (name, location) alongside each trip.
- Add space for technician notes and photo uploads per trip.

---

## 6. Remaining Major Phases (from System Plan)

### Phase 2 – Backend Core + Onboarding + Products (partial)
- [x] Implement full onboarding APIs and connect frontend flow.
- [x] Implement basic product catalog endpoints.
- [x] Introduce trips/operations layer for site visits.
- [ ] Build admin UI for product catalog management and seeding tools.
- [ ] Add richer onboarding fields (address, inspection preferences, etc.).

### Phase 3 – AI Quote Engine & Quote UI
- [ ] Quote generation service integrating with an LLM for 3 tiers.
- [ ] `Quote` and `QuoteItem` models and persistence.
- [ ] Frontend quote overview and detail screens connected to backend.

### Phase 4 – Documents & Payments
- [ ] Document templates, PDF generation and signing flow.
- [ ] Paystack integration:
  - Wallet top-ups, milestone and 80/10/10 payments.
  - Webhooks and reconciliation.
- [ ] Billing UI wired to real wallet/transactions data.

### Phase 5 – Operations & Technician Flows (extended)
- [x] Core trip model and technician workspace.
- [ ] Detailed operations API for trip allocation logic.
- [ ] Technician photo uploads and status reporting.

### Phase 6 – AI Chat, Notifications, Polishing
- [ ] AI chat endpoints and frontend widget.
- [ ] In-app notifications (and later email/SMS).
- [ ] Performance/security hardening across stack.

### Phase 7 – Testing, UAT, Launch Prep
- [ ] Add automated tests (unit/integration) for critical flows.
- [ ] UAT with real projects and technicians.
- [ ] Launch documentation and playbooks.

---

This document is meant to be a living overview. As new features are implemented, update the relevant sections and mark items as complete so we can always see the current shape of the ORAN platform at a glance.

