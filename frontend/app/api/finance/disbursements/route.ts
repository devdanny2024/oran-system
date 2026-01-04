import { NextResponse } from 'next/server';

export async function GET() {
  // Stubbed empty list so the finance page
  // can load without depending on backend.
  return NextResponse.json({ items: [] }, { status: 200 });
}
