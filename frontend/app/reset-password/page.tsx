import { Suspense } from 'react';
import ResetPasswordPage from '../../src/app/pages/ResetPasswordPage';

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
          Preparing reset form...
        </div>
      }
    >
      <ResetPasswordPage />
    </Suspense>
  );
}
