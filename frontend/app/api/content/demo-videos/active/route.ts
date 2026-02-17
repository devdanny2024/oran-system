import { NextResponse } from 'next/server';

const BACKEND_API_BASE_URL =
  process.env.BACKEND_API_BASE_URL ||
  'http://ec2-51-20-60-80.eu-north-1.compute.amazonaws.com:4000';

export async function GET() {
  try {
    const response = await fetch(
      `${BACKEND_API_BASE_URL}/content/demo-videos/active`,
      {
        method: 'GET',
      },
    );
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : 'Unable to reach ORAN backend for active demo videos.',
      },
      { status: 502 },
    );
  }
}
