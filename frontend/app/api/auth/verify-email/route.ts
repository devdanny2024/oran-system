import { NextResponse } from 'next/server';

const BACKEND_API_BASE_URL =
  process.env.BACKEND_API_BASE_URL ||
  'http://ec2-51-20-60-80.eu-north-1.compute.amazonaws.com:4000';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return NextResponse.json(
      { message: 'Verification token is required.' },
      { status: 400 },
    );
  }

  try {
    const backendUrl = new URL(
      `/auth/verify-email?token=${encodeURIComponent(token)}`,
      BACKEND_API_BASE_URL,
    );

    const response = await fetch(backendUrl, {
      method: 'GET',
    });

    const contentType = response.headers.get('content-type')?.toLowerCase();
    const isJson = contentType?.includes('application/json');
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const message =
        typeof data === 'string'
          ? data
          : data?.message ?? 'Email verification failed.';
      return NextResponse.json({ message }, { status: response.status });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unable to reach ORAN backend for email verification.';
    return NextResponse.json({ message }, { status: 502 });
  }
}

