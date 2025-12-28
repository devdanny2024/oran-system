'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

type State =
  | { status: 'idle' | 'loading' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string };

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<State>({ status: 'idle' });

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setState({ status: 'error', message: 'Missing verification token.' });
      return;
    }

    setState({ status: 'loading' });

    (async () => {
      try {
        const response = await fetch(
          `/api/auth/verify-email?token=${encodeURIComponent(token)}`,
        );
        const data = await response.json();

        if (!response.ok) {
          setState({
            status: 'error',
            message: data?.message ?? 'Email verification failed.',
          });
          return;
        }

        if (typeof window !== 'undefined' && data?.token && data?.user) {
          window.localStorage.setItem('oran_token', data.token);
          window.localStorage.setItem('oran_user', JSON.stringify(data.user));
        }

        setState({
          status: 'success',
          message: data?.message ?? 'Your email has been verified.',
        });
      } catch (error) {
        setState({
          status: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Unable to verify email, please try again.',
        });
      }
    })();
  }, [searchParams]);

  const handleContinue = () => {
    router.push('/dashboard');
  };

  const handleGoToLogin = () => {
    router.push('/login');
  };

  const title =
    state.status === 'success'
      ? 'Email verified'
      : state.status === 'error'
        ? 'Verification issue'
        : 'Verifying your email...';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="max-w-md w-full shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          {state.status === 'loading' && (
            <p className="text-muted-foreground">
              Please wait while we confirm your email address with ORAN.
            </p>
          )}
          {state.status === 'success' && (
            <>
              <p className="text-muted-foreground">{state.message}</p>
              <Button className="w-full" onClick={handleContinue}>
                Continue to dashboard
              </Button>
            </>
          )}
          {state.status === 'error' && (
            <>
              <p className="text-destructive font-medium mb-2">{state.message}</p>
              <p className="text-muted-foreground">
                You can try again from the link in your email, or log in if your
                email is already verified.
              </p>
              <Button variant="outline" className="w-full" onClick={handleGoToLogin}>
                Go to login
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

