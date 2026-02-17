'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '../../../src/app/components/ui/button';

export default function BookInspectionSuccessPage() {
  const params = useSearchParams();
  const projectId = params.get('projectId');

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-xl w-full rounded-xl border bg-white p-6 space-y-3 text-center">
        <h1 className="text-2xl font-bold text-foreground">Inspection booked successfully</h1>
        <p className="text-sm text-muted-foreground">
          Payment was confirmed. ORAN admin has been notified and you will receive confirmation by email shortly.
        </p>
        {projectId && (
          <p className="text-xs text-muted-foreground">Reference Project ID: {projectId}</p>
        )}
        <div className="pt-2 flex flex-wrap justify-center gap-2">
          <Link href="/book-inspection">
            <Button variant="outline" size="sm">Book another inspection</Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">Build a package</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
