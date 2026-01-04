import { NextResponse } from 'next/server';
import { backendFetch } from '../../../../src/app/lib/backendFetch';

export async function GET() {
  const res = await backendFetch('/finance/disbursements', {
    method: 'GET',
  });
  const body = await res.text();

  return new NextResponse(body, {
    status: res.status,
    headers: res.headers,
  });
}

