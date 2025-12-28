import { NextRequest, NextResponse } from 'next/server';

const BACKEND_API_BASE_URL =
  process.env.BACKEND_API_BASE_URL ||
  'http://ec2-51-20-60-80.eu-north-1.compute.amazonaws.com:4000';

export async function GET(
  _request: NextRequest,
  context: { params: { id: string; agreementId: string } },
) {
  const { id, agreementId } = context.params;

  try {
    const response = await fetch(
      `${BACKEND_API_BASE_URL}/projects/${id}/agreements/${agreementId}/pdf`,
    );

    const arrayBuffer = await response.arrayBuffer();
    const bytes = Buffer.from(arrayBuffer);

    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set(
      'Content-Disposition',
      response.headers.get('content-disposition') ?? 'inline',
    );

    return new NextResponse(bytes, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unable to fetch agreement PDF.';
    return NextResponse.json({ message }, { status: 502 });
  }
}

