'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Separator } from '../../components/ui/separator';
import { toast } from 'sonner';

type OranUser = {
  id: string;
  role: string;
};

type Onboarding = {
  projectStatus?: string | null;
  constructionStage?: string | null;
  needsInspection?: boolean | null;
  selectedFeatures?: unknown;
  stairSteps?: number | null;
};

type Project = {
  id: string;
  name: string;
  status: string;
  buildingType: string | null;
  roomsCount: number | null;
  createdAt: string;
  onboarding?: Onboarding | null;
};

type TripStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

type Trip = {
  id: string;
  status: TripStatus;
  scheduledFor: string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  notes?: string | null;
  technicianId?: string | null;
};

const ALLOWED_ROLES = ['ADMIN', 'TECHNICIAN'];

export default function AdminProjectDetail() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const projectId = params?.id;

  const [checking, setChecking] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [creatingTrip, setCreatingTrip] = useState(false);
  const [scheduledFor, setScheduledFor] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = window.localStorage.getItem('oran_user');

    if (!stored) {
      toast.error('Please log in to access admin projects.');
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
    if (!projectId) return;

    const loadProject = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/projects/${projectId}`);
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
              : body?.message ?? 'Unable to load project.';
          toast.error(message);
          return;
        }

        setProject(body as Project);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to load project. Please try again.';
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    const loadTrips = async () => {
      try {
        setTripsLoading(true);
        const res = await fetch(
          `/api/operations/trips?projectId=${encodeURIComponent(projectId)}`,
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
              : body?.message ?? 'Unable to load trips.';
          toast.error(message);
          return;
        }

        const items = (body?.items ?? []) as Trip[];
        setTrips(items);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to load trips. Please try again.';
        toast.error(message);
      } finally {
        setTripsLoading(false);
      }
    };

    void loadProject();
    void loadTrips();
  }, [projectId]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Checking access…</p>
      </div>
    );
  }

  if (loading || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading project…</p>
      </div>
    );
  }

  const createdDate = new Date(project.createdAt).toLocaleString();
  const onboarding = project.onboarding ?? undefined;
  const features =
    (onboarding?.selectedFeatures as string[] | undefined) ?? undefined;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              Admin · Project
            </p>
            <h1 className="text-xl font-semibold text-foreground">
              {project.name}
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/admin')}
            >
              Back to admin
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <Card className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase">
                Project info
              </p>
              <p className="text-sm font-medium text-foreground">
                {project.buildingType || 'Unknown type'} ·{' '}
                {project.roomsCount ?? 0} rooms
              </p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p className="uppercase tracking-wide">
                {project.status.toLowerCase().replace(/_/g, ' ')}
              </p>
              <p>Created {createdDate}</p>
            </div>
          </div>
        </Card>

        <section className="grid gap-4 md:grid-cols-2 items-start">
          <Card className="p-4 space-y-3">
            <h2 className="text-sm font-semibold">Onboarding summary</h2>
            {onboarding ? (
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">
                    Project status:
                  </span>{' '}
                  {onboarding.projectStatus || 'Not set'}
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    Construction stage:
                  </span>{' '}
                  {onboarding.constructionStage || 'Not set'}
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    Needs inspection:
                  </span>{' '}
                  {onboarding.needsInspection ? 'Yes' : 'No'}
                </p>
                {typeof onboarding.stairSteps === 'number' && (
                  <p>
                    <span className="font-medium text-foreground">
                      Stair steps:
                    </span>{' '}
                    {onboarding.stairSteps}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No onboarding data recorded yet.
              </p>
            )}
          </Card>

          <Card className="p-4 space-y-3">
            <h2 className="text-sm font-semibold">Selected features</h2>
            {features && features.length > 0 ? (
              <div className="flex flex-wrap gap-2 text-xs">
                {features.map((feature) => (
                  <span
                    key={feature}
                    className="rounded-full bg-muted px-2 py-1 text-foreground capitalize"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No feature selections captured for this project yet.
              </p>
            )}
          </Card>
        </section>

        <Separator />

        <section className="grid gap-4 md:grid-cols-2 items-start">
          <Card className="p-4 space-y-3">
            <h2 className="text-sm font-semibold">Schedule a site visit</h2>
            <p className="text-xs text-muted-foreground">
              Create a basic trip for this project. You can paste a technician
              ID for now; later we can add a picker.
            </p>
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="block text-muted-foreground" htmlFor="scheduledFor">
                  Scheduled for (ISO or local date-time)
                </label>
                <input
                  id="scheduledFor"
                  type="datetime-local"
                  className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                  value={scheduledFor}
                  onChange={(e) => setScheduledFor(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-muted-foreground" htmlFor="technicianId">
                  Technician ID (optional)
                </label>
                <input
                  id="technicianId"
                  type="text"
                  className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                  placeholder="Paste technician user id"
                  value={technicianId}
                  onChange={(e) => setTechnicianId(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-muted-foreground" htmlFor="notes">
                  Notes
                </label>
                <textarea
                  id="notes"
                  className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs resize-none"
                  rows={3}
                  placeholder="Short description of the visit"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <Button
                size="sm"
                disabled={creatingTrip || !scheduledFor}
                onClick={async () => {
                  if (!scheduledFor) {
                    toast.error('Please choose a date and time.');
                    return;
                  }
                  try {
                    setCreatingTrip(true);
                    const payload: {
                      projectId: string;
                      scheduledFor: string;
                      notes?: string;
                      technicianId?: string;
                    } = {
                      projectId: project.id,
                      scheduledFor: new Date(scheduledFor).toISOString(),
                    };
                    if (notes.trim()) payload.notes = notes.trim();
                    if (technicianId.trim()) payload.technicianId = technicianId.trim();

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
                          : body?.message ?? 'Unable to create trip.';
                      toast.error(message);
                      return;
                    }

                    toast.success('Trip scheduled for this project.');
                    setScheduledFor('');
                    setNotes('');
                    await (async () => {
                      try {
                        setTripsLoading(true);
                        const resTrips = await fetch(
                          `/api/operations/trips?projectId=${encodeURIComponent(
                            project.id,
                          )}`,
                        );
                        const isJsonTrips =
                          resTrips.headers
                            .get('content-type')
                            ?.toLowerCase()
                            .includes('application/json') ?? false;
                        const bodyTrips = isJsonTrips
                          ? await resTrips.json()
                          : await resTrips.text();

                        if (resTrips.ok) {
                          setTrips((bodyTrips?.items ?? []) as Trip[]);
                        }
                      } finally {
                        setTripsLoading(false);
                      }
                    })();
                  } catch (error) {
                    const message =
                      error instanceof Error
                        ? error.message
                        : 'Unable to create trip. Please try again.';
                    toast.error(message);
                  } finally {
                    setCreatingTrip(false);
                  }
                }}
              >
                {creatingTrip ? 'Scheduling…' : 'Schedule visit'}
              </Button>
            </div>
          </Card>

          <Card className="p-4 space-y-3">
            <h2 className="text-sm font-semibold">Trips for this project</h2>
            {tripsLoading ? (
              <p className="text-xs text-muted-foreground">Loading trips…</p>
            ) : trips.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No trips have been created for this project yet.
              </p>
            ) : (
              <div className="space-y-2 text-xs text-muted-foreground">
                {trips.map((trip) => (
                  <div
                    key={trip.id}
                    className="flex items-center justify-between border-b border-border/40 pb-2 last:border-b-0"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {new Date(trip.scheduledFor).toLocaleString()}
                      </p>
                      {trip.notes && (
                        <p className="text-[11px]">{trip.notes}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] uppercase tracking-wide">
                        {trip.status.toLowerCase().replace(/_/g, ' ')}
                      </p>
                      {trip.technicianId && (
                        <p className="text-[10px]">
                          Tech: {trip.technicianId.slice(0, 6)}…
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>
      </main>
    </div>
  );
}
