import { NextRequest, NextResponse } from 'next/server';

const BACKEND_API_BASE_URL =
  process.env.BACKEND_API_BASE_URL || 'https://api.ore-supply.shop';

export async function GET(
  _request: NextRequest,
  context: { params: { id: string } },
) {
  const tripId = context.params.id;

  try {
    const response = await fetch(
      `${BACKEND_API_BASE_URL}/operations/trips/${tripId}/tasks`,
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
          : data?.message ?? 'Unable to load trip tasks';
      return NextResponse.json({ message }, { status: response.status });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unable to reach ORAN backend for trip tasks.';
    return NextResponse.json({ message }, { status: 502 });
  }
}

