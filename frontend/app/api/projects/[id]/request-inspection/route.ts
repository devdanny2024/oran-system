import { NextRequest, NextResponse } from 'next/server';

const BACKEND_API_BASE_URL =
  process.env.BACKEND_API_BASE_URL ||
  'http://ec2-51-20-60-80.eu-north-1.compute.amazonaws.com:4000';

export async function POST(
  _request: NextRequest,
  context: { params: { id: string } },
) {
  const projectId = context.params.id;

  try {
    const response = await fetch(
      `${BACKEND_API_BASE_URL}/projects/${projectId}/request-inspection`,
      {
        method: 'POST',
      },
    );

    const contentType = response.headers.get('content-type')?.toLowerCase();
    const isJson = contentType?.includes('application/json');
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const message =
        typeof data === 'string'
          ? data
          : data?.message ?? 'Unable to request site inspection.';
      return NextResponse.json({ message }, { status: response.status });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unable to reach ORAN backend for site inspection.';
    return NextResponse.json({ message }, { status: 502 });
  }
}

