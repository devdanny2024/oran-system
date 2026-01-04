import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '../../../../src/app/lib/backendFetch';

export async function POST(req: NextRequest) {
  const payload = await req.json().catch(() => ({}));

  const res = await backendFetch('/finance/disburse', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  });
  const body = await res.text();

  return new NextResponse(body, {
    status: res.status,
    headers: res.headers,
  });
}

