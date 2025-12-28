import { NextRequest, NextResponse } from 'next/server';

const BACKEND_API_BASE_URL =
  process.env.BACKEND_API_BASE_URL ||
  'http://ec2-51-20-60-80.eu-north-1.compute.amazonaws.com:4000';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const technicianId = searchParams.get('technicianId');
  const projectId = searchParams.get('projectId');

  const query = new URLSearchParams();
  if (technicianId) query.set('technicianId', technicianId);
  if (projectId) query.set('projectId', projectId);

  const url = `${BACKEND_API_BASE_URL}/operations/trips${
    query.toString() ? `?${query.toString()}` : ''
  }`;

  try {
    const response = await fetch(url, {
      method: 'GET',
    });

    const contentType = response.headers.get('content-type')?.toLowerCase();
    const isJson = contentType?.includes('application/json');
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const message =
        typeof data === 'string'
          ? data
          : data?.message ?? 'Unable to list trips';
      return NextResponse.json({ message }, { status: response.status });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unable to reach ORAN backend for trips.';
    return NextResponse.json({ message }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  try {
    const response = await fetch(`${BACKEND_API_BASE_URL}/operations/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const contentType = response.headers.get('content-type')?.toLowerCase();
    const isJson = contentType?.includes('application/json');
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const message =
        typeof data === 'string'
          ? data
          : data?.message ?? 'Unable to create trip';
      return NextResponse.json({ message }, { status: response.status });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unable to reach ORAN backend for trips.';
    return NextResponse.json({ message }, { status: 502 });
  }
}

