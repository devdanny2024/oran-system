'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../../src/app/components/ui/button';

// This page depends on query parameters present only in the browser URL.
// Force it to render dynamically and read search params via window.location
// instead of useSearchParams (which requires a suspense boundary).
export const dynamic = 'force-dynamic';

type FlowType = 'inspection' | 'milestone';

export default function PaystackCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState('Verifying your payment...');
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<{
    projectId: string;
    flowType: FlowType;
  } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference');
    const projectId = params.get('projectId');
    const type = params.get('type');

    if (!reference || !projectId) {
      setError('Missing payment reference or project information.');
      setMessage('');
      return;
    }

    const flowType: FlowType =
      type === 'inspection' ? 'inspection' : 'milestone';

    setContext({ projectId, flowType });

    const verify = async () => {
      try {
        const endpoint =
          flowType === 'inspection'
            ? `/api/projects/${projectId}/inspection/paystack/verify?reference=${encodeURIComponent(
                reference,
              )}`
            : `/api/projects/${projectId}/milestones/paystack/verify?reference=${encodeURIComponent(
                reference,
              )}`;

        const res = await fetch(endpoint);

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

        const successMessage =
          flowType === 'inspection'
            ? 'Inspection payment verified successfully. Redirecting you to your project...'
            : 'Payment verified successfully. Redirecting you to your operations timeline...';

        setMessage(successMessage);
        setError(null);

        setTimeout(() => {
          if (flowType === 'inspection') {
            router.push(`/dashboard/projects/${projectId}`);
          } else {
            router.push(`/dashboard/operations?projectId=${projectId}`);
          }
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
  }, [router]);

  const handleRetry = () => {
    if (!context) {
      router.push('/dashboard');
      return;
    }

    if (context.flowType === 'inspection') {
      router.push(`/dashboard/projects/${context.projectId}`);
    } else {
      router.push(`/dashboard/operations?projectId=${context.projectId}`);
    }
  };

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
      {message && (
        <p className="text-sm text-muted-foreground text-center">{message}</p>
      )}
      {error && (
        <div className="flex flex-col items-center gap-3 max-w-md">
          <p className="text-sm text-red-500 text-center">{error}</p>
          <Button size="sm" variant="outline" onClick={handleRetry}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
