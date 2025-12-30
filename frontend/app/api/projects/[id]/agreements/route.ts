import { NextRequest, NextResponse } from 'next/server';

const BACKEND_API_BASE_URL =
  process.env.BACKEND_API_BASE_URL ||
  'http://ec2-51-20-60-80.eu-north-1.compute.amazonaws.com:4000';

export async function GET(
  _request: NextRequest,
  context: { params: { id: string } },
) {
  const { id } = context.params;

  try {
    const response = await fetch(
      `${BACKEND_API_BASE_URL}/projects/${id}/agreements`,
      { method: 'GET' },
    );

    const contentType = response.headers.get('content-type')?.toLowerCase();
    const isJson = contentType?.includes('application/json');
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const message =
        typeof data === 'string'
          ? data
          : data?.message ?? 'Unable to load project agreements';
      return NextResponse.json({ message }, { status: response.status });
    }

    // Include backend base URL in the payload for easier debugging,
    // while still returning the original shape (`items`) used by the UI.
    return NextResponse.json(
      { backendBaseUrl: BACKEND_API_BASE_URL, ...(data as any) },
      { status: response.status },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unable to reach ORAN backend for project agreements.';
    return NextResponse.json({ message }, { status: 502 });
  }
}
