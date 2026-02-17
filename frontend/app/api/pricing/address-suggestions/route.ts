import { NextRequest, NextResponse } from 'next/server';

const BACKEND_API_BASE_URL =
  process.env.BACKEND_API_BASE_URL ||
  'http://ec2-51-20-60-80.eu-north-1.compute.amazonaws.com:4000';

export async function GET(request: NextRequest) {
  const input = new URL(request.url).searchParams.get('input') ?? '';

  try {
    const response = await fetch(
      `${BACKEND_API_BASE_URL}/pricing/address-suggestions?input=${encodeURIComponent(input)}`,
      { method: 'GET' },
    );

    const contentType = response.headers.get('content-type')?.toLowerCase();
    const isJson = contentType?.includes('application/json');
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const message =
        typeof data === 'string'
          ? data
          : data?.message ?? 'Unable to load address suggestions.';
      return NextResponse.json({ message, items: [] }, { status: response.status });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : 'Unable to load address suggestions.',
        items: [],
      },
      { status: 502 },
    );
  }
}
