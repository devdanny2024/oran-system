import { NextRequest, NextResponse } from 'next/server';

const BACKEND_API_BASE_URL =
  process.env.BACKEND_API_BASE_URL || 'http://localhost:3001';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = params.id;

  try {
    const res = await fetch(
      `${BACKEND_API_BASE_URL}/notifications/admin/${encodeURIComponent(id)}/read`,
      {
        method: 'POST',
      },
    );

    const isJson =
      res.headers.get('content-type')?.toLowerCase().includes('application/json') ??
      false;
    const data = isJson ? await res.json() : await res.text();

    if (!res.ok) {
      const message =
        typeof data === 'string'
          ? data
          : data?.message ?? 'Unable to mark notification as read.';
      return NextResponse.json({ message }, { status: res.status });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unable to reach ORAN backend. Please try again.';
    return NextResponse.json({ message }, { status: 500 });
  }
}

