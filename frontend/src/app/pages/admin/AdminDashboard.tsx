'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Separator } from '../../components/ui/separator';
import { toast } from 'sonner';

type OranUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  emailVerifiedAt?: string | null;
};

const ALLOWED_ROLES = ['ADMIN', 'TECHNICIAN'];

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<OranUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = window.localStorage.getItem('oran_user');

    if (!stored) {
      toast.error('Please log in to access the admin console.');
      router.replace('/login');
      return;
    }

    try {
      const parsed = JSON.parse(stored) as OranUser;

      if (!ALLOWED_ROLES.includes(parsed.role)) {
        toast.error('You do not have access to this area.');
        router.replace('/dashboard');
        return;
      }

      setUser(parsed);
    } catch {
      toast.error('Unable to read your session. Please log in again.');
      router.replace('/login');
      return;
    } finally {
      setChecking(false);
    }
  }, [router]);

  if (checking || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Checking access…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">O</span>
            </div>
            <div>
              <p className="font-semibold text-foreground">ORAN Admin Console</p>
              <p className="text-xs text-muted-foreground">
                For Admin & Technician users only
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3 text-sm">
            <div className="text-right">
              <p className="font-medium text-foreground">
                {user.name || 'Admin user'}
              </p>
              <p className="text-xs text-muted-foreground">
                Role: {user.role.toLowerCase()}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/dashboard')}
            >
              Go to customer dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Overview
            </h1>
            <p className="text-sm text-muted-foreground">
              Quick view of ORAN projects and operations. We can plug real data here later.
            </p>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <Card className="p-4 space-y-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Projects
            </p>
            <p className="text-2xl font-bold text-foreground">—</p>
            <p className="text-xs text-muted-foreground">
              Total active customer projects (hook to backend later).
            </p>
          </Card>

          <Card className="p-4 space-y-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Site visits
            </p>
            <p className="text-2xl font-bold text-foreground">—</p>
            <p className="text-xs text-muted-foreground">
              Upcoming inspections and technician trips.
            </p>
          </Card>

          <Card className="p-4 space-y-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              System status
            </p>
            <p className="text-sm font-medium text-emerald-600">
              Healthy
            </p>
            <p className="text-xs text-muted-foreground">
              Backend on EC2 + Postgres are online.
            </p>
          </Card>
        </section>

        <Separator />

        <section className="grid gap-4 md:grid-cols-2">
          <Card className="p-4 flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-semibold mb-1">
                Technician workspace
              </h2>
              <p className="text-xs text-muted-foreground mb-3">
                Future home for trip assignments, check-in/out, and photo uploads.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="self-start"
              disabled
            >
              Coming soon
            </Button>
          </Card>

          <Card className="p-4 flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-semibold mb-1">
                Admin tools
              </h2>
              <p className="text-xs text-muted-foreground mb-3">
                Future controls for product catalog, pricing, and approvals.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="self-start"
              disabled
            >
              Coming soon
            </Button>
          </Card>
        </section>
      </main>
    </div>
  );
}

