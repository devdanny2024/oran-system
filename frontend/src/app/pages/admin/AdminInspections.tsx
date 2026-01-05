'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Separator } from '../../components/ui/separator';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';

type OranUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
};

type Project = {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  onboarding?: {
    siteAddress?: string | null;
    contactPhone?: string | null;
  } | null;
};

const ALLOWED_ROLES = ['ADMIN'];

export default function AdminInspections() {
  const router = useRouter();
  const [user, setUser] = useState<OranUser | null>(null);
  const [checking, setChecking] = useState(true);

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  const [scheduleAt, setScheduleAt] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [submittingFor, setSubmittingFor] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = window.localStorage.getItem('oran_user');

    if (!stored) {
      toast.error('Please log in to access inspection requests.');
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

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/projects');
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
              : body?.message ?? 'Unable to load projects.';
          toast.error(message);
          return;
        }

        const items = ((body as any)?.items ?? []) as Project[];
        const pending = items.filter((p) =>
          ['INSPECTION_REQUESTED', 'INSPECTION_SCHEDULED'].includes(
            p.status,
          ),
        );
        setProjects(pending);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to load projects. Please try again.';
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [user]);

  const handleSchedule = async (projectId: string) => {
    const when = scheduleAt[projectId];

    if (!when) {
      toast.error('Please choose a date and time for the inspection.');
      return;
    }

    try {
      setSubmittingFor(projectId);

      const payload = {
        projectId,
        scheduledFor: new Date(when).toISOString(),
        notes: notes[projectId] || 'Site inspection visit',
      };

      const res = await fetch('/api/operations/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

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
            : body?.message ?? 'Unable to schedule inspection.';
        toast.error(message);
        return;
      }

      toast.success('Inspection scheduled and customer notified.');

      // Remove from list or mark as scheduled.
      setProjects((prev) =>
        prev.filter((p) => p.id !== projectId),
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to schedule inspection. Please try again.';
      toast.error(message);
    } finally {
      setSubmittingFor(null);
    }
  };

  if (checking || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Checking access…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Site inspection requests
        </h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/admin')}
        >
          Back to admin overview
        </Button>
      </div>

      <Card className="p-4 space-y-3 text-sm">
        <p className="text-muted-foreground">
          Customers who pay the inspection fee appear here. Choose a date and time
          to schedule the visit. A trip will be created in operations, the project
          will move to <span className="font-semibold">inspection scheduled</span>
          and the customer will receive an email confirmation.
        </p>
      </Card>

      <Card className="p-4 space-y-3 text-sm">
        {loading ? (
          <p className="text-muted-foreground">Loading inspection requests…</p>
        ) : projects.length === 0 ? (
          <p className="text-muted-foreground">
            There are no pending inspection requests right now.
          </p>
        ) : (
          <div className="space-y-4">
            {projects.map((project) => {
              const address =
                project.onboarding?.siteAddress?.trim() || '';
              const phone =
                project.onboarding?.contactPhone?.trim() || '';

              return (
                <div key={project.id}>
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">
                        {project.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Requested on{' '}
                        {new Date(project.createdAt).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Status:{' '}
                        {project.status.toLowerCase().replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Site address:{' '}
                        {address || <span className="italic">not provided</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Contact phone:{' '}
                        {phone || <span className="italic">not provided</span>}
                      </p>
                    </div>
                    <div className="w-full md:w-80 space-y-2">
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-muted-foreground">
                          Inspection date &amp; time
                        </label>
                        <Input
                          type="datetime-local"
                          value={scheduleAt[project.id] ?? ''}
                          onChange={(e) =>
                            setScheduleAt((prev) => ({
                              ...prev,
                              [project.id]: e.target.value,
                            }))
                          }
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-muted-foreground">
                          Notes for technician (optional)
                        </label>
                        <Input
                          type="text"
                          placeholder="E.g. new build, confirm wiring routes…"
                          value={notes[project.id] ?? ''}
                          onChange={(e) =>
                            setNotes((prev) => ({
                              ...prev,
                              [project.id]: e.target.value,
                            }))
                          }
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          disabled={submittingFor === project.id}
                          onClick={() => handleSchedule(project.id)}
                        >
                          {submittingFor === project.id
                            ? 'Scheduling…'
                            : 'Schedule inspection'}
                        </Button>
                      </div>
                    </div>
                  </div>
                  <Separator className="my-3" />
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

