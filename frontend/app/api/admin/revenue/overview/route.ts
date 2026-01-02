import { NextRequest, NextResponse } from 'next/server';

const BACKEND_API_BASE_URL =
  process.env.BACKEND_API_BASE_URL || 'https://api.ore-supply.shop';

export async function GET(_request: NextRequest) {
  try {
    const response = await fetch(
      `${BACKEND_API_BASE_URL}/admin/revenue/overview`,
      {
        method: 'GET',
      },
    );

    const contentType = response.headers.get('content-type')?.toLowerCase();
    const isJson = contentType?.includes('application/json');
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const message =
        typeof data === 'string'
          ? data
          : data?.message ?? 'Unable to load revenue overview';
      return NextResponse.json({ message }, { status: response.status });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unable to reach ORAN backend for revenue overview.';
    return NextResponse.json({ message }, { status: 502 });
  }
}

