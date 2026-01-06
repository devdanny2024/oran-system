'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

type AuthResponse = {
  user: { id: string; name: string | null; email: string; role: string };
  token: string;
};

type NewUserResponse = {
  status: 'NEW_USER';
  email: string;
  name?: string | null;
};

export default function GoogleCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      toast.error('Google sign-in was cancelled or failed.');
      router.replace('/login');
      return;
    }

    if (!code) {
      toast.error('Missing Google authorization code.');
      router.replace('/login');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/auth/google-callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        });

        const data = (await res.json()) as
          | AuthResponse
          | NewUserResponse
          | { message?: string };

        if (!res.ok) {
          if (!cancelled) {
            const message =
              (data as any)?.message ??
              'Google sign-in failed. Please try again.';
            toast.error(message);
            router.replace('/login');
          }
          return;
        }

        // New customer: redirect to signup with prefilled Google details.
        if ((data as any).status === 'NEW_USER') {
          const newUser = data as NewUserResponse;

          if (!cancelled && typeof window !== 'undefined') {
            window.localStorage.setItem(
              'oran_google_prefill',
              JSON.stringify({
                email: newUser.email,
                name: newUser.name ?? '',
              }),
            );

            toast.success(
              'We found no ORAN account for this Google email. Please finish sign up.',
            );
            router.replace('/signup');
          }
          return;
        }

        const { user, token } = data as AuthResponse;

        if (!cancelled) {
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('oran_token', token);
            window.localStorage.setItem('oran_user', JSON.stringify(user));
          }

          toast.success('Signed in with Google.');

          if (user.role === 'ADMIN') {
            router.replace('/admin');
          } else if (user.role === 'TECHNICIAN') {
            router.replace('/technician');
          } else {
            router.replace('/dashboard');
          }
        }
      } catch (err) {
        if (!cancelled) {
          toast.error('Unable to complete Google sign-in. Please try again.');
          router.replace('/login');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-lg font-semibold text-foreground">
          Connecting your Google account…
        </h1>
        <p className="text-sm text-muted-foreground">
          Please wait while we complete your sign-in.
        </p>
      </div>
    </div>
  );
}
