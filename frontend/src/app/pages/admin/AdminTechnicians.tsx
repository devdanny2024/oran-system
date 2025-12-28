'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';

type OranUser = {
  id: string;
  role: string;
};

type Technician = {
  id: string;
  name: string | null;
  email: string;
};

const ALLOWED_ROLES = ['ADMIN', 'TECHNICIAN'];

export default function AdminTechnicians() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = window.localStorage.getItem('oran_user');

    if (!stored) {
      toast.error('Please log in to access technicians.');
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
    } catch {
      toast.error('Unable to read your session. Please log in again.');
      router.replace('/login');
      return;
    } finally {
      setChecking(false);
    }
  }, [router]);

  useEffect(() => {
    if (checking) return;

    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/operations/technicians');
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
              : body?.message ?? 'Unable to load technicians.';
          toast.error(message);
          return;
        }

        setTechnicians((body?.items ?? []) as Technician[]);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to load technicians. Please try again.';
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [checking]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Checking access…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              Admin · Technicians
            </p>
            <h1 className="text-xl font-semibold text-foreground">
              Technicians
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/admin')}
            >
              Back to admin
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/technician')}
            >
              Open technician workspace
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        <Card className="p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">
            Invite a technician
          </p>
          <p className="text-xs text-muted-foreground">
            Send an email invite so they can choose a password and log in as a technician.
          </p>
          <div className="grid gap-3 md:grid-cols-[1.2fr,1.6fr,auto] items-end text-xs">
            <div className="space-y-1">
              <label className="block text-muted-foreground" htmlFor="inviteName">
                Name (optional)
              </label>
              <input
                id="inviteName"
                type="text"
                className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                placeholder="Technician name"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-muted-foreground" htmlFor="inviteEmail">
                Email
              </label>
              <input
                id="inviteEmail"
                type="email"
                className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                placeholder="technician@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              disabled={inviteLoading || !inviteEmail}
              onClick={async () => {
                if (!inviteEmail) {
                  toast.error('Please enter an email address.');
                  return;
                }

                try {
                  setInviteLoading(true);
                  const res = await fetch(
                    '/api/operations/technicians/invite',
                    {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        name: inviteName || undefined,
                        email: inviteEmail,
                      }),
                    },
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
                        : body?.message ?? 'Unable to send invite.';
                    toast.error(message);
                    return;
                  }

                  toast.success('Technician invite sent.');
                  setInviteName('');
                  setInviteEmail('');

                  // Refresh list so newly invited technician shows up.
                  try {
                    setLoading(true);
                    const resTech = await fetch('/api/operations/technicians');
                    const isJsonTech =
                      resTech.headers
                        .get('content-type')
                        ?.toLowerCase()
                        .includes('application/json') ?? false;
                    const bodyTech = isJsonTech
                      ? await resTech.json()
                      : await resTech.text();
                    if (resTech.ok) {
                      setTechnicians((bodyTech?.items ?? []) as Technician[]);
                    }
                  } finally {
                    setLoading(false);
                  }
                } catch (error) {
                  const message =
                    error instanceof Error
                      ? error.message
                      : 'Unable to send invite. Please try again.';
                  toast.error(message);
                } finally {
                  setInviteLoading(false);
                }
              }}
            >
              {inviteLoading ? 'Sending…' : 'Send invite'}
            </Button>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-foreground">
              Registered technicians
            </p>
            <span className="text-xs text-muted-foreground">
              {loading ? 'Loading…' : `${technicians.length} total`}
            </span>
          </div>
          {loading ? (
            <p className="text-xs text-muted-foreground">Loading technicians…</p>
          ) : technicians.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No technicians found yet. You can mark users as TECHNICIAN in the
              database to see them here.
            </p>
          ) : (
            <div className="border rounded-md divide-y">
              <div className="flex items-center px-3 py-2 text-[11px] font-semibold text-muted-foreground">
                <div className="flex-1">Name</div>
                <div className="flex-1">Email</div>
                <div className="w-32 text-right">User ID</div>
              </div>
              {technicians.map((tech) => (
                <div
                  key={tech.id}
                  className="flex items-center px-3 py-2 text-xs text-muted-foreground"
                >
                  <div className="flex-1 text-foreground">
                    {tech.name || '—'}
                  </div>
                  <div className="flex-1">{tech.email}</div>
                  <div className="w-32 text-right font-mono text-[11px]">
                    {tech.id.slice(0, 8)}…
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
