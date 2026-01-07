import { NextRequest, NextResponse } from 'next/server';

const BACKEND_API_BASE_URL =
  process.env.BACKEND_API_BASE_URL ||
  'http://ec2-51-20-60-80.eu-north-1.compute.amazonaws.com:4000';

export async function GET(
  _request: NextRequest,
  context: { params: { id: string } },
) {
  const id = context.params.id;

  try {
    const res = await fetch(
      `${BACKEND_API_BASE_URL}/admin/revenue/projects/${encodeURIComponent(id)}`,
    );

    const contentType = res.headers.get('content-type')?.toLowerCase();
    const isJson = contentType?.includes('application/json');
    const data = isJson ? await res.json() : await res.text();

    if (!res.ok) {
      const message =
        typeof data === 'string'
          ? data
          : data?.message ?? 'Unable to load project revenue summary.';
      return NextResponse.json({ message }, { status: res.status });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unexpected error while loading project revenue summary.';
    return NextResponse.json({ message }, { status: 500 });
  }
}

