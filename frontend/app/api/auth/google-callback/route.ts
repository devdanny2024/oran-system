import { NextRequest, NextResponse } from 'next/server';

const BACKEND_API_BASE_URL =
  process.env.BACKEND_API_BASE_URL ||
  'http://ec2-51-20-60-80.eu-north-1.compute.amazonaws.com:4000';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const code = body?.code as string | undefined;

  if (!code) {
    return NextResponse.json(
      { message: 'Missing Google authorization code.' },
      { status: 400 },
    );
  }

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    return NextResponse.json(
      { message: 'Google sign-in is not configured.' },
      { status: 500 },
    );
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const tokenJson = await tokenRes.json();

    if (!tokenRes.ok) {
      const message =
        tokenJson?.error_description ||
        tokenJson?.error ||
        'Failed to exchange Google authorization code.';
      return NextResponse.json({ message }, { status: 502 });
    }

    const idToken = tokenJson.id_token as string | undefined;

    if (!idToken) {
      return NextResponse.json(
        { message: 'Missing id_token from Google response.' },
        { status: 502 },
      );
    }

    const [, payloadSegment] = idToken.split('.');
    const decoded =
      payloadSegment && payloadSegment.length > 0
        ? JSON.parse(
            Buffer.from(payloadSegment, 'base64').toString('utf8'),
          )
        : null;

    const email = decoded?.email as string | undefined;
    const name = decoded?.name as string | undefined;

    if (!email) {
      return NextResponse.json(
        { message: 'Google did not provide an email address.' },
        { status: 502 },
      );
    }

    const backendRes = await fetch(`${BACKEND_API_BASE_URL}/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, name }),
    });

    const contentType = backendRes.headers.get('content-type')?.toLowerCase();
    const isJson = contentType?.includes('application/json');
    const data = isJson ? await backendRes.json() : await backendRes.text();

    if (!backendRes.ok) {
      const message =
        typeof data === 'string'
          ? data
          : data?.message ?? 'Google login failed on backend.';
      return NextResponse.json({ message }, { status: backendRes.status });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unexpected error during Google sign-in.';
    return NextResponse.json({ message }, { status: 500 });
  }
}

