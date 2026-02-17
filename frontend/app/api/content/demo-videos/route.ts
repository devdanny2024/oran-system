import { NextRequest, NextResponse } from 'next/server';

const BACKEND_API_BASE_URL =
  process.env.BACKEND_API_BASE_URL ||
  'http://ec2-51-20-60-80.eu-north-1.compute.amazonaws.com:4000';

function toPublicVideoSrc(src?: string) {
  if (!src) return src;
  if (src.startsWith('http://') || src.startsWith('https://')) return src;
  if (src.startsWith('/uploads/')) return `${BACKEND_API_BASE_URL}${src}`;
  return src;
}

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_API_BASE_URL}/content/demo-videos`, {
      method: 'GET',
    });
    const data = await response.json();
    const normalized = Array.isArray(data)
      ? data.map((item) => ({ ...item, src: toPublicVideoSrc(item?.src) }))
      : data;
    return NextResponse.json(normalized, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : 'Unable to reach ORAN backend for demo videos.',
      },
      { status: 502 },
    );
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  try {
    const response = await fetch(`${BACKEND_API_BASE_URL}/content/demo-videos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : 'Unable to reach ORAN backend for demo videos.',
      },
      { status: 502 },
    );
  }
}
