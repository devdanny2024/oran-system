import { NextRequest, NextResponse } from 'next/server';

const BACKEND_API_BASE_URL =
  process.env.BACKEND_API_BASE_URL ||
  'http://ec2-51-20-60-80.eu-north-1.compute.amazonaws.com:4000';

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } },
) {
  const id = context.params.id;

  const body = await request.json().catch(() => ({}));

  try {
    const res = await fetch(
      `${BACKEND_API_BASE_URL}/admin/projects/${encodeURIComponent(id)}/handover-notes`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
    );

    const contentType = res.headers.get('content-type')?.toLowerCase();
    const isJson = contentType?.includes('application/json');
    const data = isJson ? await res.json() : await res.text();

    if (!res.ok) {
      const message =
        typeof data === 'string'
          ? data
          : data?.message ?? 'Unable to save handover notes.';
      return NextResponse.json({ message }, { status: res.status });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unexpected error while saving handover notes.';
    return NextResponse.json({ message }, { status: 500 });
  }
}

