import { Suspense } from 'react';
import VerifyEmailPage from '../../src/app/pages/VerifyEmailPage';

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
          Verifying your email...
        </div>
      }
    >
      <VerifyEmailPage />
    </Suspense>
  );
}
