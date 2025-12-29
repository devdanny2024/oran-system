'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// This page depends on search params from the browser after Paystack
// redirects back, so force it to render dynamically instead of being
// prerendered at build time.
export const dynamic = 'force-dynamic';

export default function PaystackCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('Verifying your payment...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const reference = searchParams.get('reference');
    const projectId = searchParams.get('projectId');

    if (!reference || !projectId) {
      setError('Missing payment reference or project information.');
      setMessage('');
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch(
          `/api/projects/${projectId}/milestones/paystack/verify?reference=${encodeURIComponent(
            reference,
          )}`,
        );

        const isJson =
          res.headers
            .get('content-type')
            ?.toLowerCase()
            .includes('application/json') ?? false;
        const body = isJson ? await res.json() : await res.text();

        if (!res.ok) {
          const message =
            typeof body === 'string'
              ? body
              : body?.message ?? 'Unable to verify payment.';
          setError(message);
          setMessage('');
          return;
        }

        setMessage('Payment verified successfully. Redirecting you back...');
        setTimeout(() => {
          router.push(`/dashboard/projects/${projectId}`);
        }, 2000);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to verify payment. Please try again.',
        );
        setMessage('');
      }
    };

    void verify();
  }, [router, searchParams]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-2">
      {message && (
        <p className="text-sm text-muted-foreground text-center">{message}</p>
      )}
      {error && (
        <p className="text-sm text-red-500 max-w-md text-center">{error}</p>
      )}
    </div>
  );
}
