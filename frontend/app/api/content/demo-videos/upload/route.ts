import { NextRequest, NextResponse } from 'next/server';

const BACKEND_API_BASE_URL =
  process.env.BACKEND_API_BASE_URL ||
  'http://ec2-51-20-60-80.eu-north-1.compute.amazonaws.com:4000';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ message: 'Video file is required.' }, { status: 400 });
    }

    const forward = new FormData();
    forward.append('file', file);

    const response = await fetch(`${BACKEND_API_BASE_URL}/content/demo-videos/upload`, {
      method: 'POST',
      body: forward,
    });

    const data = await response.json();

    if (data?.src && typeof data.src === 'string' && data.src.startsWith('/uploads/')) {
      data.publicUrl = `${BACKEND_API_BASE_URL}${data.src}`;
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : 'Unable to upload demo video.',
      },
      { status: 502 },
    );
  }
}
