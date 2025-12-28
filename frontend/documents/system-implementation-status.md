# ORAN System – Implementation Status (Snapshot as of 2025-12-28)

This document tracks what has been implemented so far across backend, frontend, infra, and operations, and what is still pending. It is a concise “checkpoint” view; deeper narrative and planning lives in `system-plan-and-timelog.md`.

---

## 1. Backend API

- **Core framework & infrastructure**
  - NestJS app bootstrapped with `AppModule`, health endpoint (`GET /health`), and modular structure (`Auth`, `Projects`, `Onboarding`, `Products`, `Operations`, `Email`).
  - Prisma configured against Postgres (`oran_dev` DB on EC2), with schema for `User`, `Project`, `OnboardingSession`, `Product`, and `Trip`.
  - Configured Redis client (currently optional; Redis not yet provisioned in infra).

- **Authentication & users**
  - User model includes `role` (`CUSTOMER`, `TECHNICIAN`, `ADMIN`), plus:
    - `emailVerifiedAt`
    - `verificationToken`
    - `resetPasswordToken`
    - `resetPasswordExpires`
  - Implemented endpoints:
    - `POST /auth/register` – register customer, send verification email.
    - `POST /auth/login` – login with email/password, enforces `emailVerifiedAt`.
    - `GET /auth/verify-email` – verifies email using token and sets `emailVerifiedAt`.
    - `POST /auth/forgot-password` – generates reset token and sends reset email.
    - `POST /auth/reset-password` – validates token and sets new password.
  - Admin bootstrap:
    - `User` table truncated on EC2 and a new admin user created with email `soliupeter@gmail.com`, password `Oran12#`, role `ADMIN`, `emailVerifiedAt` set.

- **Projects, onboarding, and products**
  - `ProjectsModule`:
    - `POST /projects` – create project.
    - `GET /projects` – list projects (filter by user).
    - `GET /projects/:id` – get project detail.
  - `OnboardingModule`:
    - `POST /onboarding` – create/update onboarding session tied to a project.
    - `GET /onboarding/:projectId` – fetch onboarding session.
  - `ProductsModule`:
    - `GET /products` – list products.
    - `POST /products` – create product (admin).
    - `GET /products/:id` – product detail.
  - Onboarding model supports inspection preference fields and selected features list.

- **Operations (admin + technician)**
  - `Trip` model added and wired via `OperationsModule`:
    - `POST /operations/trips` – create a site visit / trip for a project (optional technician assignment).
    - `GET /operations/trips` – list trips (filter by `projectId`/`technicianId`).
    - `PATCH /operations/trips/:id/check-in` – technician check-in (sets `status=IN_PROGRESS`, `checkInAt`).
    - `PATCH /operations/trips/:id/check-out` – technician check-out (sets `status=COMPLETED`, `checkOutAt`).
  - `TECHNICIAN` management APIs:
    - `GET /operations/technicians` – list technicians, returns `resetPasswordToken`/`resetPasswordExpires` so the UI can see pending invites.
    - `POST /operations/technicians/invite` – create/update a user as `TECHNICIAN`, generate reset token + expiry, send invite email so they can set password.
    - `POST /operations/technicians/revoke` – clear `resetPasswordToken` and `resetPasswordExpires` for a technician to revoke an invite.

- **Email system**
  - `EmailModule` and `EmailService` implemented using SMTP (Gmail app password on EC2):
    - `sendVerificationEmail`
    - `sendWelcomeEmail`
    - `sendPasswordResetEmail`
    - `sendTechnicianInviteEmail`
  - SMTP configuration lives in EC2 `.env` (not committed), using:
    - `SMTP_HOST=smtp.gmail.com`
    - `SMTP_PORT=587`
    - `SMTP_USER=devdanny2024@gmail.com`
    - `SMTP_PASS=<gmail-app-password>`
    - `SMTP_FROM="ORAN Smart Home <devdanny2024@gmail.com>"`

**Backend – Pending (near term)**

- Harden auth (refresh tokens or better session model, rate limiting).
- Add role-based guards on all protected routes (decorators + guards).
- Implement full payment, wallet, and AI quote modules.
- Add stricter validation DTOs and error handling across modules.

---

## 2. Frontend (Next.js)

- **Global setup**
  - Next.js 14 App Router, TypeScript, Tailwind + Shadcn UI.
  - Public marketing and onboarding flows already live on `https://oran-system.vercel.app`.
  - `NEXT_PUBLIC_API_BASE_URL` wired so `/app/api/*` routes proxy from Vercel to the EC2 backend.

- **Auth and user flows**
  - Pages:
    - `/signup` – registration, calls `/api/auth/register`.
    - `/login` – login, calls `/api/auth/login`.
    - `/verify-email` – handles email verification link (with `useSearchParams` gated by Suspense to satisfy Next’s CSR requirements).
    - `/forgot-password` – request password reset.
    - `/reset-password` – set a new password via emailed token.
  - On successful login:
    - User and JWT are stored in `localStorage` as `oran_user` and `oran_token`.
    - Redirect rules:
      - `ADMIN` / `TECHNICIAN` → `/admin`.
      - `CUSTOMER` → `/dashboard`.
  - Dashboard-level banner:
    - Shows “Your email is not verified yet” using `emailVerifiedAt` and encourages user to verify; hidden once `emailVerifiedAt` is set.

- **Customer dashboard & projects**
  - `/dashboard` – main customer landing (shell).
  - `/dashboard/projects` – lists projects for the logged-in user:
    - Uses `/api/projects` (proxy to backend) and filters by `userId`.
    - Supports simple filter (All / Active / Completed / Onboarding) and sort options.
  - `/dashboard/projects/[id]` – project detail:
    - Fetches `/api/projects/:id` and shows project info plus onboarding selections and summary.

- **Admin area**
  - `app/admin/layout.tsx`:
    - Reads `oran_user` from `localStorage`.
    - If missing → redirects to `/login`.
    - If role is not `ADMIN` or `TECHNICIAN` → redirects to `/dashboard`.
    - Provides left sidebar with:
      - Overview (`/admin`)
      - Technicians (`/admin/technicians`)
      - Technician workspace (`/technician`)
    - Includes current user info + shortcut to customer dashboard.
  - `/admin` – Admin overview dashboard:
    - Shows total projects, number of onboarding projects, and a recent projects table.
    - Clicking a project navigates to `/admin/projects/[id]`.
  - `/admin/projects/[id]` – Admin project detail:
    - Shows project and onboarding details.
    - Integrates with operations API:
      - Loads trips via `/api/operations/trips?projectId=...`.
      - Allows admin to schedule a site visit (trip) with `datetime-local` selector, technician assignment, and notes.
      - Shows trips list with status and basic technician info.
  - `/admin/technicians` – Technicians management:
    - Access-gated to `ADMIN` and `TECHNICIAN` roles.
    - Lists current technicians via `/api/operations/technicians`.
    - “Invite a technician” form:
      - Name (optional), email (required).
      - Calls `/api/operations/technicians/invite` and refreshes list.
    - **Revoke invite (new)**
      - Table includes an **Invite** column.
      - If a technician has `resetPasswordToken` set → shows “Revoke invite” button.
      - Clicking the button calls `/api/operations/technicians/revoke` via Next API route with `{ userId }`.
      - On success, shows toast and refreshes the technicians list.
      - If no invite is pending → shows a simple `—` placeholder.

- **Technician workspace**
  - `/technician` – Technician dashboard:
    - Access-gated to `TECHNICIAN` and `ADMIN`.
    - Loads trips via `/api/operations/trips?technicianId={user.id}`.
    - Shows metrics:
      - Assigned trips (scheduled + in progress).
      - In-progress trips.
      - Completed today (status `COMPLETED` with today’s date).
    - Upcoming visits section:
      - Renders up to 5 scheduled or in-progress trips sorted by `scheduledFor`.
      - Provides `Check in` and `Check out` buttons that call the operations API and refresh trips.

- **API proxy routes (frontend → backend)**
  - Auth: `/app/api/auth/*` → `BACKEND_API_BASE_URL/auth/*`.
  - Projects: `/app/api/projects` and `/app/api/projects/[id]`.
  - Onboarding: `/app/api/onboarding` and `/app/api/onboarding/[projectId]`.
  - Operations / trips:
    - `/app/api/operations/trips`
    - `/app/api/operations/trips/[id]/check-in`
    - `/app/api/operations/trips/[id]/check-out`
  - Operations / technicians:
    - `/app/api/operations/technicians`
    - `/app/api/operations/technicians/invite`
    - `/app/api/operations/technicians/revoke`

**Frontend – Pending (near term)**

- Finish/extend customer-facing dashboard cards (operations, billing, wallet, documents) and link them to real backend routes as they come online.
- Add proper loading states and error presentation for all admin and technician pages.
- Build quote UI, payments screens, and document signing flows once backend is ready.

---

## 3. Infrastructure & Deployment

- **EC2 backend**
  - Amazon Linux 2023 EC2 instance running Nest backend on port `4000`.
  - Git repo cloned to `~/oran-system` and kept in sync with GitHub.
  - Postgres server installed locally on the EC2 instance:
    - Database: `oran_dev`
    - User: `oran_user`
    - Permissions granted on DB and `public` schema.
  - Prisma connected to Postgres; schema applied via `npx prisma db push`.
  - Backend is managed by PM2:
    - Process name: `oran-backend`.
    - Automatically restarted on server reboot via `pm2 startup`/`pm2 save`.

- **Vercel frontend**
  - Project `oran-system` deploying Next.js frontend from GitHub `devdanny2024/oran-system` (branch `master`).
  - Environment variable `BACKEND_API_BASE_URL` (and/or `NEXT_PUBLIC_API_BASE_URL`) points to EC2 backend (HTTP, for now).
  - Recent build issue (`useSearchParams` needing suspense on `/verify-email` and `/reset-password`) has been fixed in the codebase.

**Infra – Pending**

- Move Postgres to a managed service (e.g., RDS) for resilience and backups.
- Add real Redis instance and wire it into cache and rate-limiting code paths.
- Secure HTTPS for backend (ACM + ALB / Nginx reverse proxy) so all frontend → backend calls are HTTPS and no longer mixed-content.
- Add monitoring/logging stack (CloudWatch, or external provider).

---

## 4. Admin & Technician – What to Test Now

Use the admin account `soliupeter@gmail.com` with password `Oran12#` (already created and email-verified in DB).

- **Admin path**
  - Log in and confirm you land on `/admin` (not customer dashboard).
  - Navigate to:
    - `/admin/projects` (via dashboard links) and confirm project listing and project detail with trips.
    - `/admin/technicians`:
      - Invite a technician with an email you control and confirm an invite email is sent.
      - See the technician appear in the table with a “Revoke invite” button.
      - Click “Revoke invite” and confirm:
        - The button disappears (replaced with `—`).
        - The backend clears `resetPasswordToken` / `resetPasswordExpires`.
  - From `/admin/projects/[id]`, schedule a trip and ensure it shows both for admin and technician views.

- **Technician path**
  - Use a technician account (once invite + password set):
    - Log in and confirm redirect to `/admin` layout with access to `/technician`.
    - On `/technician`, verify trips assigned to that technician show up.
    - Test `Check in` / `Check out` and confirm trip status updates.

---

## 5. Next High-Priority Items

1. **Email reliability & templates**
   - Finalize HTML templates for:
     - Verify email
     - Forgot password
     - Welcome email
     - Technician invite
   - Test against real inboxes to confirm spam score and rendering.

2. **Payments & wallet**
   - Implement Paystack integration in backend (charge API + webhooks).
   - Design wallet + transaction schema in Prisma and wire to dashboard.

3. **AI quote engine**
   - Implement quote generation service with OpenAI (prompt templates + validation).
   - Build customer UI for choosing between Economy/Standard/Luxury quotes and customizing items.

4. **Operations deepening**
   - Add trip notes, technician photo uploads, and project status transitions driven by operations events.
   - Add audit logs for admin and technician actions.

5. **Security, roles, and permissions**
   - Harden role-based access in Nest using guards.
   - Add rate-limiting for auth and sensitive endpoints.

