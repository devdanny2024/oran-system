import { NextRequest, NextResponse } from 'next/server';

const BACKEND_API_BASE_URL =
  process.env.BACKEND_API_BASE_URL ||
  'http://ec2-51-20-60-80.eu-north-1.compute.amazonaws.com:4000';

export async function POST(request: NextRequest) {
  const body = await request.json();

  try {
    const projectId = body?.projectId;
    const targetUrl = projectId
      ? `${BACKEND_API_BASE_URL}/quotes/generate/${encodeURIComponent(projectId)}`
      : `${BACKEND_API_BASE_URL}/quotes/generate`;

    const init: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    };

    if (!projectId) {
      init.body = JSON.stringify(body);
    }

    const response = await fetch(targetUrl, init);

    const contentType = response.headers.get('content-type')?.toLowerCase();
    const isJson = contentType?.includes('application/json');
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const message =
        typeof data === 'string'
          ? data
          : data?.message ?? 'Unable to generate quotes';
      return NextResponse.json({ message }, { status: response.status });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unable to reach ORAN backend for quotes.';
    return NextResponse.json({ message }, { status: 502 });
  }
}
