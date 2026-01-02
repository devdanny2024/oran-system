# ORAN Backend Deployment & HTTPS / Paystack Runbook

This document captures the end‑to‑end steps we used to run the backend on EC2, put it behind HTTPS on your custom domain, and integrate Paystack + the frontend.

Current values are specific to your setup; you can swap them later if anything changes.

- EC2: Amazon Linux 2023
- Backend repo path: `~/oran-system/backend`
- Elastic IP: `51.21.101.0`
- Domain host: Hostinger
- API domain: `api.ore-supply.shop`
- Frontend production: `https://oran-system.vercel.app`

---

## 1. DNS & Elastic IP

1. Allocate an Elastic IP in AWS EC2 and associate it with the backend instance.
   - Result: `51.21.101.0` attached to instance `i-03cb09cb862ba05cc` (private IP `172.31.19.225`).
2. In Hostinger DNS for `ore-supply.shop` add/update these records:
   - `CNAME  www   42a70112c8a2efc0.vercel-dns-017.com` (Vercel for the frontend).
   - `A      api   51.21.101.0` (backend API on EC2).
   - Keep existing `CAA` records that allow Let’s Encrypt / other CAs.
3. From your PC, verify DNS:
   - PowerShell:
     ```powershell
     nslookup api.ore-supply.shop
     ```
   - Response should show `51.21.101.0`.

---

## 2. SSH Access to EC2

From your Windows machine (PowerShell):

```powershell
ssh -i "C:\Users\soliu\OneDrive\Documents\ORAN System\Credentials\oran-ec2-key.pem" ec2-user@51.21.101.0
```

If you ever re‑associate the Elastic IP, update the IP in this command.

---

## 3. Install & Run Nginx as Reverse Proxy

On the EC2 instance:

```bash
sudo dnf update -y
sudo dnf install -y nginx

sudo systemctl enable nginx
sudo systemctl start nginx
```

Create the backend server block to proxy `api.ore-supply.shop` → NestJS on `127.0.0.1:4000`:

```bash
sudo tee /etc/nginx/conf.d/oran-backend.conf >/dev/null << 'EOF'
server {
    listen 80;
    server_name api.ore-supply.shop;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

sudo nginx -t
sudo systemctl reload nginx
```

At this point, once the backend is running on port 4000, `http://api.ore-supply.shop/health` should hit the Nest health endpoint.

---

## 4. Let’s Encrypt HTTPS (Certbot)

Install Certbot and the Nginx plugin:

```bash
sudo dnf install -y certbot python3-certbot-nginx
```

Request a certificate for `api.ore-supply.shop` and auto‑configure Nginx:

```bash
sudo certbot --nginx -d api.ore-supply.shop \
  --non-interactive --agree-tos \
  -m devdanny2024@gmail.com \
  --redirect
```

This:

- Obtains and installs a certificate for `api.ore-supply.shop`.
- Adds an HTTPS server block and redirect from HTTP → HTTPS.
- Sets up a systemd timer to auto‑renew.

Quick HTTPS check:

```bash
curl -k https://api.ore-supply.shop/health
```

If the backend is up, this should return the Nest health JSON. A `502 Bad Gateway` here means Nginx cannot reach `127.0.0.1:4000` (backend not running or crashed).

---

## 5. Backend app (NestJS + Prisma) on EC2

Backend repo lives at `~/oran-system/backend`.

### 5.1 Environment variables

The `.env` on the server should look like this (values can be changed later):

```env
PORT=4000
NODE_ENV=production

DATABASE_URL=postgresql://oran_user:oran_pass_123@localhost:5432/oran_dev
REDIS_URL=redis://localhost:6379/0

AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=oran-local-access-key-2d8f9c7a
AWS_SECRET_ACCESS_KEY=oran-local-secret-key-7f4a2b9c1d
AWS_S3_BUCKET=oran-local-bucket-8e3c

PAYSTACK_SECRET_KEY=sk_test_b9119bc70a8158020375841381826360c248c315
PAYSTACK_PUBLIC_KEY=pk_test_7f2d59d7b1aa643ca4d8723718ee4f52d1d0ae35

JWT_SECRET=oran_dev_jwt_9f7c8e14f1a84e6b8a3f2c51
JWT_EXPIRES_IN=7d

SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=re_3P399yoS_KfsGYdVG6CMTTqacQ5vxLiBQ
SMTP_FROM="ORAN Smart Home <no-reply@oran-system.com>"

FRONTEND_BASE_URL=https://oran-system.vercel.app

PAYSTACK_CALLBACK_BASE_URL=https://oran-system.vercel.app/paystack/callback

GEMINI_API_KEY=AIzaSyAGx2Grm227IpuWyNey6BWHdCZlys2HmBc
GEMINI_MODEL=gemini-2.5-flash
```

Key points:

- `FRONTEND_BASE_URL` is the live frontend on Vercel.
- `PAYSTACK_CALLBACK_BASE_URL` ensures Paystack sends users back to Vercel, not `localhost`.

### 5.2 Build & run with PM2

On EC2:

```bash
cd ~/oran-system/backend
git pull
npm ci
npx prisma db push    # only if schema changed
npm run build
pm2 start dist/main.js --name oran-backend
pm2 save
```

To restart after changes:

```bash
cd ~/oran-system/backend
git pull
npm ci
npm run build
pm2 restart oran-backend
```

Health checks:

```bash
curl http://127.0.0.1:4000/health           # direct to Nest
curl -k https://api.ore-supply.shop/health  # through Nginx + HTTPS
pm2 logs oran-backend --lines 100           # if something fails
```

---

## 6. Frontend (Vercel) → Backend wiring

### 6.1 Vercel environment variables

In the Vercel project settings for the frontend app, define:

- `NEXT_PUBLIC_API_BASE_URL = /api`
- `BACKEND_API_BASE_URL   = https://api.ore-supply.shop`

`/api` routes in Next.js work as a proxy layer; they call the backend using `BACKEND_API_BASE_URL`. Keeping `NEXT_PUBLIC_API_BASE_URL=/api` avoids mixed‑content issues in the browser.

After updating, trigger a rebuild:

- Push to `master`, or
- Use “Redeploy” in Vercel UI.

### 6.2 Paystack callback flow

Backend logic (in `milestones.service.ts`) now builds the Paystack callback URL as:

```ts
const explicitCallbackBase =
  process.env.PAYSTACK_CALLBACK_BASE_URL as string | undefined;
const fallbackCallbackBase = `${this.email.getFrontendBaseUrl()}/paystack/callback`;
const callbackBase = explicitCallbackBase || fallbackCallbackBase;

const callbackUrl = `${callbackBase}?projectId=${encodeURIComponent(
  projectId,
)}&milestoneId=${encodeURIComponent(milestoneId)}`;
```

With the env above, Paystack redirects customers to:

```text
https://oran-system.vercel.app/paystack/callback?projectId=...&milestoneId=...&reference=...
```

The Next.js page at `app/paystack/callback/page.tsx` then:

1. Reads `reference` and `projectId` from the URL.
2. Calls `/api/projects/[id]/milestones/paystack/verify?reference=...`.
3. On success, redirects the user to `/dashboard/operations?projectId=...`.

This removes all `localhost` references in the production payment flow.

---

## 7. Operations & Technician Flow (High Level)

Backend services involved:

- `MilestonesService.initializePaystackPayment` – creates Paystack transaction with the correct callback URL.
- `MilestonesService.verifyPaystackPayment` – verifies payment, marks milestone as completed, and calls `createOperationsVisitAndNotify`.
- `MilestonesService.createOperationsVisitAndNotify` – creates a `Trip` for the project and sends an operations email.
- `OperationsService` – lists trips, manages technicians, and handles check‑in / check‑out.

Frontend:

- `ProjectDetailPage` – shows milestones, allows “Make payment now” for the next payable milestone.
- `paystack/callback` – verifies the payment and redirects to Operations.
- `dashboard/operations` – will be wired to show real trips and technician assignments.

---

## 8. Quick End‑to‑End Checklist

1. DNS
   - `api.ore-supply.shop` A‑record points to the current Elastic IP.
2. Nginx
   - `sudo nginx -t` passes.
   - `curl -k https://api.ore-supply.shop/health` returns JSON, not `502`.
3. Backend
   - `pm2 status oran-backend` shows `online`.
   - `curl http://127.0.0.1:4000/health` works.
4. Vercel
   - `BACKEND_API_BASE_URL=https://api.ore-supply.shop`.
   - `NEXT_PUBLIC_API_BASE_URL=/api`.
5. Paystack
   - `PAYSTACK_SECRET_KEY` configured on backend.
   - `PAYSTACK_CALLBACK_BASE_URL=https://oran-system.vercel.app/paystack/callback` in backend `.env`.
   - Test payment flow:
     - Click “Make payment now” in a project.
     - Complete Paystack test checkout.
     - You should be redirected to `https://oran-system.vercel.app/paystack/callback?...` and then to the Operations page for that project.

Keep this document updated whenever you change domain, IP, or environment variables so future deployments (or a new EC2 instance) can be reproduced reliably.

