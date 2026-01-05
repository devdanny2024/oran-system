import { NextRequest, NextResponse } from 'next/server';

const BACKEND_API_BASE_URL =
  process.env.BACKEND_API_BASE_URL ||
  'http://ec2-51-20-60-80.eu-north-1.compute.amazonaws.com:4000';

export async function POST(req: NextRequest) {
  const payload = await req.json().catch(() => ({}));

  const res = await fetch(`${BACKEND_API_BASE_URL}/finance/disburse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const body = await res.text();

  return new NextResponse(body, {
    status: res.status,
    headers: res.headers,
  });
}
