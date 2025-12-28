# ORAN Smart Home Automation Platform – System Plan & Time Log

Created: 2025-12-27  
Owner: ORAN Product / Engineering

---

## 1. High-Level System Architecture

### 1.1 Components

- **Customer Web App (Existing)**
  - Next.js 14 (App Router) + TypeScript
  - Tailwind CSS + Shadcn UI
  - Roles initially: `customer`
  - Responsible for: marketing site, onboarding, quotes, dashboard, operations, billing, wallet, documents, AI chat.

- **Backend API**
  - Node.js with a structured framework (recommended: NestJS; alternative: Express + modular architecture).
  - REST APIs for all domain operations; later GraphQL if needed.
  - WebSockets (Socket.io) for real-time updates (technician status, notifications, chat streaming).

- **Technician & Admin Interfaces**
  - Phase 1: Responsive web views in same Next.js app:
    - `/technician` – trips, work updates.
    - `/admin` – product catalog, pricing, approvals.
  - Phase 2/3: Optional separate apps (mobile, dedicated admin).

- **Database**
  - PostgreSQL as primary relational DB.
  - Prisma or TypeORM as ORM/data access layer.
  - Redis for:
    - Caching (product catalog, AI results where safe).
    - Rate limiting.
    - Short-lived tokens/sessions.

- **Storage and Media**
  - S3-compatible storage (AWS S3 or equivalent) for:
    - Product images.
    - Signed documents (PDF).
    - Technician photos and reports.

- **AI Services**
  - Third-party LLM API (e.g., OpenAI) for:
    - AI quotation generation (three tiers).
    - AI chat assistant with project context.
  - A separate AI service layer in backend that:
    - Prepares prompts.
    - Validates and normalizes outputs into internal schemas.

- **Payments & Wallet**
  - Paystack integration for:
    - Card payments, wallet top-ups, milestone payments, extra trips.
  - Webhooks endpoint in backend for payment confirmation and reconciliation.

- **Document Management / E-Sign**
  - Internal document templates rendered to PDF (PDFKit/Puppeteer).
  - E-sign integration (DocuSign/Adobe Sign) or custom lightweight signature flow for MVP.

- **Maps & Location**
  - Google Maps or Mapbox:
    - Address autocomplete.
    - Geocoding for site visits and inspections.

---

## 2. Domain Model Overview

### 2.1 Core Entities

- **User**
  - `id`, `role` (customer, technician, admin)
  - `name`, `email`, `phone`
  - `password_hash`
  - Optional: address, KYC info.

- **Project**
  - `id`, `user_id`
  - `name` (e.g., “Living Room Smart Home”)
  - `status`:
    - `onboarding`, `inspection_requested`, `inspection_scheduled`, `inspection_completed`,
      `quotes_generated`, `quote_selected`, `documents_pending`, `documents_signed`,
      `payment_plan_selected`, `in_progress`, `completed`, etc.
  - `building_type` (corporate/commercial, residential)
  - `rooms_count`
  - `created_at`, `updated_at`

- **OnboardingSession / ProjectOnboarding**
  - `project_id`
  - `project_status` (New/Ongoing/Finished)
  - `construction_stage` (if ongoing)
  - `needs_inspection` (boolean)
  - Inspection preference fields:
    - location address, GPS coordinates, preferred date/time
  - `selected_features` list:
    - Lighting, Climate, Access, Surveillance, Gate, Staircase, etc.
  - `stair_steps` (if staircase selected).

- **Product**
  - `id`, `name`
  - `category` (Lighting, Climate, Access, Surveillance, Gate, Staircase)
  - `price_tier` (Economy, Standard, Luxury)
  - `unit_price`
  - `description`, `specs`
  - `image_url`
  - `installation_time_estimate`
  - `compatibility_requirements`
  - `active` flag.

- **Quote**
  - `id`, `project_id`
  - `tier` (Economy, Standard, Luxury)
  - `status` (Draft, Generated, CustomerModified, Selected, Rejected)
  - Monies:
    - `products_subtotal`, `installation_cost`, `service_fee`, `travel_cost`, `total`
  - `timeline_weeks`
  - `ai_metadata` (raw AI response, versioning).

- **QuoteItem**
  - `id`, `quote_id`, `product_id`
  - `category` (duplicated for quick grouping)
  - `quantity`
  - `unit_price`, `total_price`
  - `editable` (can user adjust quantities/remove?)
  - `meta` (e.g., per-room allocation).

- **PaymentPlan**
  - `id`, `project_id`
  - `type` (`MILESTONE_2`, `MILESTONE_3`, `EIGHTY_TEN_TEN`)
  - `terms_document_id` (for 80/10/10 extra terms).

- **PaymentMilestone**
  - `id`, `payment_plan_id`
  - `label` (e.g., “Milestone 1 – Procurement”)
  - `percentage`, `amount`
  - `due_date`
  - `status` (Pending, Paid, Overdue)

- **Payment**
  - `id`, `project_id`, `milestone_id?`
  - `amount`, `currency`
  - `method` (wallet, card via Paystack)
  - `paystack_reference`
  - `status` (Initiated, Success, Failed)
  - `created_at`, `confirmed_at`

- **Wallet**
  - `user_id`
  - `balance`

- **WalletTransaction**
  - `wallet_id`
  - `type` (Topup, Debit)
  - `amount`
  - `reference` (Paystack ref or internal)
  - `description`
  - `created_at`

- **SiteVisit**
  - `id`, `project_id`, `technician_id?`
  - `type` (Inspection, Installation, Testing, Training, etc.)
  - `status` (Scheduled, EnRoute, InProgress, Completed, Cancelled)
  - `scheduled_at`, `actual_start`, `actual_end`
  - `address`, `geo_lat`, `geo_lng`
  - `notes`, `customer_visible_summary`

- **TechnicianAssignment**
  - `project_id`, `technician_id`
  - `role` (Lead, Support)
  - `status` (Active, Completed).

- **Document**
  - `id`, `project_id`
  - `type` (ServiceAgreement, TermsConditions, InstallationAuthorization, DeliveryTerms, Invoice)
  - `status` (Pending, Signed, Executed)
  - `storage_url`, `generated_at`

- **Signature**
  - `document_id`, `user_id`
  - `signed_at`
  - `signature_type` (typed, drawn)
  - `metadata` (IP, device info).

- **ChatSession**
  - `id`
  - `user_id`
  - `project_id?`
  - `created_at`

- **ChatMessage**
  - `session_id`
  - `sender` (user, ai, technician, admin)
  - `content`
  - `created_at`
  - `metadata` (e.g., prompts, references).

- **Notification**
  - `user_id`, `type`
  - `payload` JSON
  - `read_at`

---

## 3. Backend API Modules & Endpoints (Planned)

### 3.1 Auth & User

- `POST /auth/register` – create customer account.
- `POST /auth/login` – email/password login, returns access + refresh tokens.
- `POST /auth/refresh` – refresh access token.
- `GET /me` – current user profile.
- `PATCH /me` – update profile details.

### 3.2 Projects & Onboarding

- `POST /projects`
  - Creates a new project, initializes onboarding record.
  - Takes basic name and initial answers (project status, building type, etc.).
- `GET /projects`
  - For customers: their projects.
  - For admin: filtered lists (with RBAC).
- `GET /projects/:id`
  - Full project view (status, onboarding, latest quote, payments summary).
- `PATCH /projects/:id/onboarding`
  - Updates:
    - Project status (new/ongoing/finished).
    - Construction stage.
    - Building type and rooms count.
    - Features selected, stair steps.
    - Inspection preference (needs_inspection, location, date).

### 3.3 Inspection & Site Visits

- `POST /projects/:id/inspection-request`
  - Creates a `SiteVisit` entry with type Inspection, calculates cost (if any).
  - Stores location, date/time, payment preference.
- `GET /projects/:id/site-visits`
  - List of visits (for customer view).
- `POST /projects/:id/site-trips/request`
  - Request additional site visit (non-inspection operations).
  - Checks remaining trip allocation; if zero, returns purchase requirement.
- `POST /projects/:id/site-trips/purchase`
  - Initiates Paystack payment or wallet usage for additional trips.

### 3.4 Products & Quote Engine

- `GET /products`
  - Filters: category, price tier, search.
- `GET /products/:id`
  - Detailed specs for product.
- `POST /projects/:id/quotes/generate`
  - Inputs:
    - Project onboarding fields.
    - Selected features and counts.
  - Flow:
    - Backend prepares AI prompt with project data + product catalog.
    - Calls LLM (third-party API).
    - Validates returned JSON against schema.
    - Persists three quotes (Economy, Standard, Luxury) with quote items.
- `GET /projects/:id/quotes`
  - List three tiers.
- `GET /quotes/:id`
  - Detailed quote with items grouped by category.
- Customization endpoints:
  - `PATCH /quotes/:id/items/:itemId`
    - Update quantity or mark as removed.
  - `POST /quotes/:id/items`
    - Add new product to quote (from product catalog).
  - `POST /quotes/:id/recalculate`
    - Recompute totals, recalc recommended payment plan.
- `POST /quotes/:id/select`
  - Mark as chosen tier, lock in base totals.

### 3.5 Documents & E-Sign

- `POST /projects/:id/documents/generate`
  - Generates:
    - Service Agreement
    - Terms & Conditions
    - Installation Authorization
    - 80/10/10 Delivery Terms (if that plan is chosen)
  - Renders PDFs and stores in S3.
- `GET /projects/:id/documents`
  - List documents with statuses.
- `GET /documents/:id`
  - Secure signed URL or inline viewing.
- `POST /documents/:id/acknowledge`
  - “I have read and agree” checkbox.
- `POST /documents/:id/sign`
  - Accepts signature payload (typed/drawn).
  - Moves document status to Signed, and once all required parties sign, to Executed.

### 3.6 Payment & Wallet (Paystack)

- Wallet:
  - `GET /wallet`
  - `GET /wallet/transactions`
  - `POST /wallet/topup`
    - Initiates Paystack charge for wallet.
  - `POST /wallet/use`
    - Deducts for milestones, extra trips, repairs (with checks).

- Payment Plans:
  - `POST /projects/:id/payment-plan`
    - Choose between:
      - 2-milestone, 3-milestone, 80/10/10.
    - Creates `PaymentPlan` + `PaymentMilestones`.
  - `GET /projects/:id/payment-plan`
    - Shows configured plan and statuses.

- Milestone payments:
  - `POST /milestones/:id/pay`
    - Creates `Payment` record and Paystack transaction.
  - `POST /paystack/webhook`
    - Handles Paystack events, updates Payment & Milestone status, wallet transactions if top-up.

### 3.7 Operations & Technician

- Customer-facing operations:
  - `GET /projects/:id/operations`
    - Aggregated data:
      - Trip allocation and usage.
      - Recent visits, upcoming visit.
      - Work progress percentages per feature.
- Technician endpoints:
  - `GET /technician/trips`
  - `GET /technician/trips/:id`
  - `PATCH /site-visits/:id`
    - Status transitions: EnRoute, InProgress, Completed.
    - Check-in/out timestamps, notes, photos.

### 3.8 AI Chat

- `POST /chat/session`
  - Creates session, optionally linked to project.
- `POST /chat/session/:id/messages`
  - Sends user message; backend:
    - Collects context: project, payments, visits, quotes, docs.
    - Calls LLM.
    - Returns AI message (streamed or chunked).
- `GET /chat/session/:id/messages`
  - Chat history.

### 3.9 Notifications

- `GET /notifications`
- `PATCH /notifications/:id/read`
- Internal event emitters for:
  - Quote generated.
  - Docs ready.
  - Payment success/failure.
  - Technician en route/completed.

---

## 4. Frontend / UI Plan (Customer App)

### 4.1 Public Flows

- `/` – Landing page (existing).
- `/login` – Login (existing).
- `/signup` – Signup (existing).

### 4.2 Onboarding Flow

Route: `/onboarding` (existing wizard, enhanced to match PRD):

1. **Project Classification**
   - Question: Project Status (New/Ongoing/Finished).
   - If Ongoing: show construction stage selector.
   - Persist into `OnboardingSession`.

2. **Inspection Decision**
   - Question: “Do you need a site inspection?”
   - If YES:
     - Address autocomplete.
     - Date & time picker with slots.
     - Cost summary (base + distance).
     - Pay Now / Pay on Arrival choice.
   - If NO:
     - Skip to building specs.

3. **Building Specs**
   - Building type (Corporate/Residential).
   - Rooms to automate (numeric, 1–50+).

4. **Features Selection**
   - Cards per feature (Lighting, Climate, Access, Surveillance, Gate, Staircase).
   - Each card:
     - icon + name.
     - short description.
     - video thumbnail (optional).
     - “Learn more” collapsible section.
     - checkbox to select.
   - Staircase card: extra numeric field for number of steps.

5. **Review & AI Quote Generation**
   - Summary of previous steps.
   - Button: “Generate AI Quotes”.
   - Triggers API call to `/projects/:id/quotes/generate` and navigates to quotes page.

### 4.3 Quotes & Customization

1. **Quotes Overview**
   - Route: `/dashboard/projects/:projectId/quotes`
   - Three quote cards:
     - Economy / Standard / Luxury.
     - Total, breakdown summary, timeline, `View Details`, `Select`.

2. **Quote Detail & Editing**
   - Route: `/dashboard/projects/:projectId/quotes/:quoteId`
   - Layout:
     - Left: tabbed categories (Lighting, Climate, Access, Surveillance, Gate, Staircase).
     - Main: products in that category with image, description, specs & controls:
       - quantity stepper.
       - toggle/remove.
     - Right: summary card with totals & breakdown.
   - Actions:
     - “Reset to AI Recommendation”.
     - “Save Customizations”.
     - “Continue to Documents”.

### 4.4 Documents & E-Sign

- Documents list:
  - Route: `/dashboard/projects/:projectId/documents`
  - Shows 3–4 documents, status badges (Pending/Signed/Executed), actions: `Review & Sign`, `View`.
- Document viewer:
  - Route: `/dashboard/documents/:documentId`
  - Contains:
    - PDF preview (or styled HTML view).
    - Agreement checkbox.
    - Signature capture.
    - `Sign` button.

### 4.5 Dashboard Home

Route: `/dashboard`

- Project status card:
  - Project name, status badge, progress bar.
  - Next action button (e.g., “Sign documents”, “Make first payment”, “Schedule site visit”).
- Analytics mini-cards:
  - Site Visits (X),
  - Total Spent (₦XXX,XXX),
  - Active Projects.
- Quick Action shortcuts:
  - Start New Project.
  - Schedule Site Visit.
  - Make Payment.
  - View Documents.
- AI Chat:
  - Floating button.
  - Opens side drawer/chat widget tied to active project/session.

### 4.6 Operations & Site Trips

Route: `/dashboard/operations` (already partly built, will be wired to backend).

- Site Trips summary:
  - Allocated, used, remaining.
  - Progress bar.
  - Request Site Visit (modal) + Purchase additional trips.
- Visit history:
  - Completed and scheduled visits.
  - Buttons: View Photos, View Report, Reschedule, Cancel.
- Work progress tracker:
  - Feature-level progress with icons and progress bars.
- Action footer:
  - Export operations report.
  - Contact support.

### 4.7 Billing & Wallet

Route: `/dashboard/billing` (already drafted, will be connected to backend).

- Sections:
  - Plan summary and current monthly cost.
  - Payment status, next billing date.
  - Usage for current cycle.
  - Payment method card (with update/add buttons).
  - Invoice history table with PDF/View actions.
  - Action footer with support links.

Optional dedicated wallet view:

- `/dashboard/wallet`:
  - Wallet balance.
  - Add Money flow.
  - Recent transactions.

### 4.8 Documents & Support Pages

- `/dashboard/documents` – all documents across projects.
- `/dashboard/support` – support contact, FAQs, possibly ticket history.

### 4.9 Technician & Admin (Web Views)

- Technician:
  - `/technician` – dashboard with today’s trips and notifications.
  - `/technician/trips` – list view.
  - `/technician/trips/:id` – detail view, check-in/out, upload photos, notes.
- Admin (later):
  - `/admin/products` – manage product catalog and pricing tiers.
  - `/admin/projects` – oversight and manual overrides.

---

## 5. AI Quote Engine & Chat Design

### 5.1 Quote Engine Flow

1. Input:
   - Project onboarding details.
   - Selected features, room counts, staircase steps.
   - Optional inspection data.
   - Product catalog snapshot.

2. Prompt:
   - Structured prompt with instructions to output three tiers (Economy, Standard, Luxury) in strict JSON schema.

3. AI Response:
   - Tiers with:
     - Items grouped by category.
     - Quantities, unit prices, total per item.
     - Installation hours.
     - Site trip allocation.
     - Timeline.

4. Validation:
   - JSON schema validation.
   - Validate product IDs and prices against DB (no AI-generated prices).

5. Persistence:
   - Create `Quote` and `QuoteItem` records.
   - Derive recommended payment plan templates.

6. Customization:
   - User modifies quote via UI; backend enforces constraints and recalculates totals.

### 5.2 AI Chat

- Context:
  - Current project status, milestones, dates, amounts.
  - Site visit schedule and history.
  - Quote details and selected tier.
  - Wallet balance and payments.
- Capabilities:
  - Answer questions like “When is my next technician visit?”, “How much have I spent?” etc.
  - Suggest actions (e.g., reschedule, pay milestone) and link to relevant UI.

---

## 6. Implementation Phases (Timeline)

Assuming a ~16-week window as in PRD.

### Phase 1 (Weeks 1–2): Planning & Foundations

- Finalize architecture decisions (NestJS vs Express, ORM choice).
- Create backend repo and bootstrap:
  - Auth module with basic signup/login.
  - Initial DB schema for User, Project, OnboardingSession, Product.
- Connect frontend auth flows to backend.

### Phase 2 (Weeks 3–6): Backend Core + Onboarding + Products

- Implement:
  - Full onboarding APIs.
  - Product catalog CRUD (admin-side).
  - Site visit (inspection) models and scheduling APIs.
- Integrate Next.js onboarding flow with new endpoints.

### Phase 3 (Weeks 7–8): AI Quote Engine & Quote UI

- Build quote generation backend:
  - LLM integration, prompt templates, validation.
  - Quote and QuoteItem persistence.
- Implement quotes overview and detail pages in frontend:
  - 3 tier cards.
  - Tabbed product categories with images and customization controls.

### Phase 4 (Weeks 9–10): Documents & Payments (Paystack + Wallet)

- Implement document module:
  - Templates, PDF generation, status tracking, signing endpoints.
- Implement Paystack integration:
  - Wallet top-ups.
  - Milestone and 80/10/10 payments.
  - Webhook handler and reconciliation.
- Wire Billing page and basic wallet view.

### Phase 5 (Weeks 11–12): Operations & Technician Flows

- Implement:
  - Site trip allocation logic by project size.
  - Operations API for customer view.
  - Technician endpoints and UI for trips, check-in/out, photo uploads.
- Connect `/dashboard/operations` and `/dashboard/billing` to live data.

### Phase 6 (Weeks 13–14): AI Chat, Notifications, Polishing

- Implement AI chat endpoints and frontend widget.
- Implement notification system (in-app first, then email/SMS).
- Performance tuning and security pass.

### Phase 7 (Weeks 15–16): Testing, UAT, Launch Prep

- Unit, integration, and UAT.
- Fix bugs, refine UX.
- Prepare documentation and run a soft launch.

---

## 7. Time Log (High-Level Engineering Log)

> Note: This is a simple log for the planning done so far. As implementation starts, this log can be extended with more granular entries by date and task.

- **2025-12-27**
  - Reviewed existing Next.js project structure and main customer UI (landing, login, signup, onboarding, dashboard, operations, billing).
  - Migrated the project shell to TypeScript Next.js with app router and set up route structure for:
    - `/`, `/login`, `/signup`, `/onboarding`, `/dashboard`, `/dashboard/projects`, `/dashboard/operations`, `/dashboard/billing`, `/dashboard/documents`, `/dashboard/support`.
  - Implemented Operations page UI (`/dashboard/operations`) according to PRD (site trips, visit history, work progress, request visit modal).
  - Implemented Billing page UI (`/dashboard/billing`) with plan summary, payment method, invoice history and action footer.
- Fully reviewed the ORAN PRD and extracted:
    - Core value proposition and user roles.
    - Onboarding, inspection, AI quote generation, payment models (Milestone and 80/10/10), operations, wallet and AI chat requirements.
  - Designed end-to-end backend architecture:
    - Chosen stack (Node.js, PostgreSQL, Redis, Paystack, third-party LLM).
    - Defined major modules (Auth, Projects, Onboarding, Products, Quotes, Documents, Payments, Operations, Technician, Chat, Notifications).
  - Defined domain model and key tables/entities for implementation.
  - Mapped PRD user flows to Next.js routes and screens, including quote customization with category tabs and product images.
  - Captured this system plan and time log into `documents/system-plan-and-timelog.md` for future reference.

- **2025-12-27 (Backend bootstrap & infra setup)**
  - Initialized `backend` Node.js project with Nest-style architecture, core `AppModule`, health endpoint, and initial feature modules: `Auth`, `Projects`, `Onboarding`, `Products`.
  - Introduced infrastructure layer with `PrismaModule`, `AwsModule` (S3 client), and `CacheModule` (Redis), plus Prisma schema for User/Project/OnboardingSession/Product.
  - Added `.env.example` and wired config for AWS (RDS, ElastiCache, S3), Paystack, and OpenAI; created `.env` on EC2 from this template.
  - Set up Git repo (`oran-system`) under personal GitHub account `devdanny2024/oran-system`, fixed author identity, and pushed initial backend + frontend code.
  - Provisioned EC2 instance `oran-backend-ec2` (t3.micro, Amazon Linux 2023), installed Git/Node, cloned the repo, built the backend, and started it with `PORT=4000` (verified `GET /health` returns status `ok`).
  - Configured Next.js app pages (`Login`, `Signup`, `Dashboard`, `Onboarding`) as client components to fix Vercel build issues and confirmed frontend builds successfully.

- **2025-12-28 (Auth, email, Postgres, PM2)**
  - Implemented real Auth module in Nest backend with password hashing, JWT issuance, email verification, forgot password, and reset password flows, all backed by Prisma models and new `emailVerifiedAt`/token fields on `User`.
  - Wired frontend auth pages (`/signup`, `/login`, `/verify-email`, `/forgot-password`, `/reset-password`) to Next.js API routes that proxy to the EC2 backend, including a dashboard banner that checks `emailVerifiedAt`.
  - Installed PostgreSQL on EC2, created `oran_user` and `oran_dev` database, pointed `DATABASE_URL` at this instance, and successfully applied Prisma schema.
  - Configured SMTP via Resend using SMTP host/user/pass; added EmailService logic so SMTP errors (e.g. unverified domain or test-mode restrictions) are logged but do not break user-facing requests like registration.
  - Installed and configured PM2 on EC2 to run the Nest backend as `oran-backend` on port `4000`, enabled PM2 startup via systemd, and verified `/health` stays green across restarts.

### Remaining work vs. plan

- **Phase 1 (Planning & Foundations)**
  - [x] Finalize high-level architecture and stack choices.
  - [x] Create backend repo and bootstrap modules.
  - [x] Implement real Auth (signup/login) with password hashing and JWT/session model.
  - [x] Define and apply initial DB schema to a managed PostgreSQL instance (currently self-hosted Postgres on EC2 for MVP) and connect backend via `DATABASE_URL`.
  - [x] Connect frontend auth flows to live backend APIs.

- **Phase 2 (Backend Core + Onboarding + Products)**
  - [ ] Implement full onboarding APIs backed by Prisma models (including inspection preferences and feature selections).
  - [ ] Implement Product catalog CRUD and seed initial product data.
  - [ ] Add site visit/inspection models and scheduling APIs.
  - [ ] Wire Next.js onboarding and product-related flows to backend endpoints.

- **Phase 3 (AI Quote Engine & Quote UI)**
  - [ ] Implement quote generation service (LLM integration, prompt templates, validation pipeline) and persistence for Quote/QuoteItem.
  - [ ] Build quotes overview/detail UI hooked to backend, including tiered cards and customization tabs.

- **Phase 4 (Documents & Payments)**
  - [ ] Implement document templates, PDF generation, and signing endpoints.
  - [ ] Integrate Paystack (wallet top-ups, milestone and 80/10/10 payments, webhooks, reconciliation).
  - [ ] Connect billing UI to real wallet/transactions data.

- **Phase 5 (Operations & Technician Flows)**
  - [ ] Implement site trip allocation logic and operations API.
  - [ ] Build technician endpoints for trips, check-in/out, and photo uploads; connect to dashboard views.

- **Phase 6 (AI Chat, Notifications, Polishing)**
  - [ ] Implement AI chat endpoints, notification system (in-app first), and performance/security hardening.

- **Phase 7 (Testing, UAT, Launch Prep)**
  - [ ] Add automated tests (unit/integration), run UAT, and complete launch documentation.
