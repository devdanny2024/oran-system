# ORAN System Environment Configuration (Local Defaults)

> All values here are placeholder/random strings for local/dev use.  
> You should replace them with real secrets in your own environment and in production.

## Backend (`backend/.env`)

- `PORT=4000`
- `NODE_ENV=development`
- `DATABASE_URL=postgresql://oran_user:oran_pass_123@localhost:5432/oran_dev`
- `REDIS_URL=redis://localhost:6379/0`
- `AWS_REGION=eu-west-1`
- `AWS_ACCESS_KEY_ID=oran-local-access-key-2d8f9c7a`
- `AWS_SECRET_ACCESS_KEY=oran-local-secret-key-7f4a2b9c1d`
- `AWS_S3_BUCKET=oran-local-bucket-8e3c`
- `PAYSTACK_SECRET_KEY=sk_test_oran_local_3f8e7c2b9a`
- `PAYSTACK_PUBLIC_KEY=pk_test_oran_local_5c7a2e1f9b`
- `OPENAI_API_KEY=sk-oran-local-1e8f2c9b7a6d`
- `JWT_SECRET=oran_dev_jwt_9f7c8e14f1a84e6b8a3f2c51`
- `JWT_EXPIRES_IN=7d`
- `SMTP_HOST=smtp.oran-local.test`
- `SMTP_PORT=587`
- `SMTP_USER=oran_smtp_user_81c7`
- `SMTP_PASS=oran_smtp_pass_3f9a`
- `SMTP_FROM="ORAN Smart Home <no-reply@oran.local>"`
- `FRONTEND_BASE_URL=https://oran-system.vercel.app`

## Frontend (`frontend/.env.local`)

- `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000`

You can update these values on EC2 (and in Vercel) to point at your real database, Redis, AWS, Paystack, and OpenAI accounts. The frontend will automatically talk to whatever `NEXT_PUBLIC_API_BASE_URL` you set.
