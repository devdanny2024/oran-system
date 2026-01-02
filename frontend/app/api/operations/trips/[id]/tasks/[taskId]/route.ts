import { NextRequest, NextResponse } from 'next/server';

const BACKEND_API_BASE_URL =
  process.env.BACKEND_API_BASE_URL || 'https://api.ore-supply.shop';

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string; taskId: string } },
) {
  const tripId = context.params.id;
  const taskId = context.params.taskId;
  const body = await request.json();

  try {
    const response = await fetch(
      `${BACKEND_API_BASE_URL}/operations/trips/${tripId}/tasks/${taskId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );

    const contentType = response.headers.get('content-type')?.toLowerCase();
    const isJson = contentType?.includes('application/json');
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const message =
        typeof data === 'string'
          ? data
          : data?.message ?? 'Unable to update trip task';
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

