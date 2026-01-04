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
};

const ALLOWED_ROLES = ['TECHNICIAN'];

export default function TechnicianWorkspaceShell() {
  const router = useRouter();
  const [user, setUser] = useState<OranUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = window.localStorage.getItem('oran_user');

    if (!stored) {
      toast.error('Please log in to access the technician workspace.');
      router.replace('/login');
      return;
    }

    try {
      const parsed = JSON.parse(stored) as OranUser;

      if (!ALLOWED_ROLES.includes(parsed.role)) {
        toast.error('You do not have access to the technician workspace.');
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
        <p className="text-sm text-muted-foreground">Checking access...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">O</span>
            </div>
            <div>
              <p className="font-semibold text-foreground">
                ORAN Technician Workspace
              </p>
              <p className="text-xs text-muted-foreground">
                Technician tools are being upgraded. For now, use admin and
                operations views to track work.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/dashboard')}
            >
              Customer dashboard
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.localStorage.removeItem('oran_token');
                  window.localStorage.removeItem('oran_user');
                }
                router.push('/login');
              }}
            >
              Log out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Technician workspace
          </h1>
          <p className="text-sm text-muted-foreground">
            This area will soon show assigned trips, tasks and inspection
            quotes. For now, operations can be monitored from the admin and
            operations dashboards.
          </p>
        </div>

        <Separator />

        <section>
          <Card className="p-4 space-y-2 text-xs">
            <p className="font-semibold text-foreground">
              Coming soon: full technician tools
            </p>
            <p className="text-muted-foreground">
              We are upgrading this workspace to connect site inspections,
              product lists and quotes directly to operations. Technicians will
              be able to check in/out of trips, upload photos and generate
              inspection-based quotes from here.
            </p>
          </Card>
        </section>
      </main>
    </div>
  );
}

