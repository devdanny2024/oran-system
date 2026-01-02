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

type TripTask = {
  id: string;
  label: string;
  sequence: number;
  isDone: boolean;
};

type TripPhoto = {
  id: string;
  url: string;
  caption?: string | null;
};

type Trip = {
  id: string;
  status: TripStatus;
  scheduledFor: string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  notes?: string | null;
  technicianId?: string | null;
  technician?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  reworkReason?: string | null;
  reworkRequestedAt?: string | null;
  tasks?: TripTask[];
  photos?: TripPhoto[];
};

const ALLOWED_ROLES = ['ADMIN'];

export default function AdminProjectDetail() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const projectId = params?.id;

  const [checking, setChecking] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);

  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripsLoading, setTripsLoading] = useState(false);

  const [technicians, setTechnicians] = useState<
    { id: string; name: string | null; email: string }[]
  >([]);
  const [techniciansLoading, setTechniciansLoading] = useState(false);

  const [scheduledFor, setScheduledFor] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [notes, setNotes] = useState('');
  const [creatingTrip, setCreatingTrip] = useState(false);
  const [reopeningTripId, setReopeningTripId] = useState<string | null>(null);

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
        setLoadingProject(true);
        const response = await fetch(`/api/projects/${projectId}`);
        const isJson =
          response.headers
            .get('content-type')
            ?.toLowerCase()
            .includes('application/json') ?? false;
        const body = isJson ? await response.json() : await response.text();

        if (!response.ok) {
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
        setLoadingProject(false);
      }
    };

    const loadTrips = async () => {
      try {
        setTripsLoading(true);
        const response = await fetch(
          `/api/operations/trips?projectId=${encodeURIComponent(projectId)}`,
        );
        const isJson =
          response.headers
            .get('content-type')
            ?.toLowerCase()
            .includes('application/json') ?? false;
        const body = isJson ? await response.json() : await response.text();

        if (!response.ok) {
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

    const loadTechnicians = async () => {
      try {
        setTechniciansLoading(true);
        const response = await fetch('/api/operations/technicians');
        const isJson =
          response.headers
            .get('content-type')
            ?.toLowerCase()
            .includes('application/json') ?? false;
        const body = isJson ? await response.json() : await response.text();

        if (!response.ok) {
          const message =
            typeof body === 'string'
              ? body
              : body?.message ?? 'Unable to load technicians.';
          toast.error(message);
          return;
        }

        const items =
          ((body as any)?.items ??
            []) as { id: string; name: string | null; email: string }[];
        setTechnicians(items);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to load technicians. Please try again.';
        toast.error(message);
      } finally {
        setTechniciansLoading(false);
      }
    };

    void loadProject();
    void loadTrips();
    void loadTechnicians();
  }, [projectId]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Checking access...</p>
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">
          No project ID provided.
        </p>
      </div>
    );
  }

  const handleCreateTrip = async () => {
    if (!project) return;
    if (!scheduledFor) {
      toast.error('Please choose a visit date and time.');
      return;
    }

    const date = new Date(scheduledFor);
    if (Number.isNaN(date.getTime())) {
      toast.error('Scheduled date is not valid.');
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
        scheduledFor: date.toISOString(),
      };
      if (notes.trim()) payload.notes = notes.trim();
      if (technicianId.trim()) payload.technicianId = technicianId.trim();

      const response = await fetch('/api/operations/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const isJson =
        response.headers
          .get('content-type')
          ?.toLowerCase()
          .includes('application/json') ?? false;
      const body = isJson ? await response.json() : await response.text();

      if (!response.ok) {
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

      // Refresh trips
      const tripsResponse = await fetch(
        `/api/operations/trips?projectId=${encodeURIComponent(project.id)}`,
      );
      const tripsIsJson =
        tripsResponse.headers
          .get('content-type')
          ?.toLowerCase()
          .includes('application/json') ?? false;
      const tripsBody = tripsIsJson
        ? await tripsResponse.json()
        : await tripsResponse.text();

      if (tripsResponse.ok) {
        setTrips(((tripsBody as any)?.items ?? []) as Trip[]);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to create trip. Please try again.';
      toast.error(message);
    } finally {
      setCreatingTrip(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/admin')}
            >
              Back to admin
            </Button>
            <div>
              <p className="font-semibold text-foreground">
                Admin – Project detail
              </p>
              <p className="text-xs text-muted-foreground">
                Manage operations and technician visits for this ORAN project.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <section className="space-y-3">
          <h1 className="text-xl font-semibold text-foreground">
            {loadingProject || !project ? 'Loading project...' : project.name}
          </h1>
          {project && (
            <Card className="p-4 text-xs space-y-2">
              <p className="text-sm font-semibold text-foreground">
                Project overview
              </p>
              <p className="text-muted-foreground">
                Created:{' '}
                {new Date(project.createdAt).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </p>
              <p className="text-muted-foreground">
                Status:{' '}
                <span className="uppercase">
                  {project.status.toLowerCase().replace(/_/g, ' ')}
                </span>
              </p>
              <div className="flex flex-wrap gap-4 mt-2">
                <span className="text-muted-foreground">
                  Building type:{' '}
                  <span className="text-foreground">
                    {project.buildingType ?? 'Not set'}
                  </span>
                </span>
                <span className="text-muted-foreground">
                  Rooms:{' '}
                  <span className="text-foreground">
                    {project.roomsCount ?? 'Not set'}
                  </span>
                </span>
              </div>
            </Card>
          )}
        </section>

        <Separator />

        <section className="grid gap-4 md:grid-cols-2">
          <Card className="p-4 space-y-3">
            <h2 className="text-sm font-semibold">Schedule technician visit</h2>
            <p className="text-xs text-muted-foreground">
              Create a new field visit for this project and assign a technician.
            </p>

            <div className="space-y-2 text-xs">
              <label className="block text-muted-foreground">
                Visit date &amp; time
              </label>
              <input
                type="datetime-local"
                className="w-full border rounded px-2 py-1"
                value={scheduledFor}
                onChange={(event) => setScheduledFor(event.target.value)}
              />

              <label className="block text-muted-foreground mt-2">
                Technician
              </label>
              <select
                className="w-full border rounded px-2 py-1"
                value={technicianId}
                onChange={(event) => setTechnicianId(event.target.value)}
              >
                <option value="">
                  {techniciansLoading ? 'Loading technicians...' : 'Unassigned'}
                </option>
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.name ?? tech.email}
                  </option>
                ))}
              </select>

              <label className="block text-muted-foreground mt-2">Notes</label>
              <textarea
                className="w-full border rounded px-2 py-1 min-h-[60px]"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>

            <Button
              size="sm"
              className="mt-2"
              disabled={creatingTrip || !project}
              onClick={handleCreateTrip}
            >
              {creatingTrip ? 'Scheduling...' : 'Schedule visit'}
            </Button>
          </Card>

          <Card className="p-4 space-y-3">
            <h2 className="text-sm font-semibold">Trips for this project</h2>
            {tripsLoading ? (
              <p className="text-xs text-muted-foreground">Loading trips...</p>
            ) : trips.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No trips have been created for this project yet.
              </p>
            ) : (
              <div className="space-y-2 text-xs text-muted-foreground">
                {trips.map((trip) => {
                  const tasks = Array.isArray(trip.tasks) ? trip.tasks : [];
                  const totalTasks = tasks.length;
                  const completedTasks = tasks.filter((t) => t.isDone).length;
                  const photos = Array.isArray(trip.photos) ? trip.photos : [];

                  return (
                    <div
                      key={trip.id}
                      className="space-y-2 border-b border-border/40 pb-2 last:border-b-0"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">
                            {new Date(trip.scheduledFor).toLocaleString()}
                          </p>
                          {trip.notes && (
                            <p className="text-[11px]">{trip.notes}</p>
                          )}
                          {trip.technician?.name && (
                            <p className="text-[10px]">
                              Technician: {trip.technician.name} (
                              {trip.technician.email})
                            </p>
                          )}
                          {trip.reworkReason && (
                            <p className="text-[10px] text-amber-700">
                              Rework reason: {trip.reworkReason}
                            </p>
                          )}
                        </div>
                        <div className="text-right space-y-1">
                          <p className="text-[11px] uppercase tracking-wide">
                            {trip.status.toLowerCase().replace(/_/g, ' ')}
                          </p>
                          {totalTasks > 0 && (
                            <p className="text-[10px]">
                              Tasks: {completedTasks}/{totalTasks} complete
                            </p>
                          )}
                          {trip.checkInAt && (
                            <p className="text-[10px]">
                              In: {new Date(trip.checkInAt).toLocaleString()}
                            </p>
                          )}
                          {trip.checkOutAt && (
                            <p className="text-[10px]">
                              Out: {new Date(trip.checkOutAt).toLocaleString()}
                            </p>
                          )}
                          {trip.status === 'COMPLETED' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-1"
                          disabled={reopeningTripId === trip.id}
                          onClick={async () => {
                            const confirmReopen = window.confirm(
                              'Reopen this trip for rework and reset all tasks to not done?',
                            );
                            if (!confirmReopen) return;

                            const reason =
                              window.prompt(
                                'Why are you reopening this visit? (optional)',
                              ) ?? undefined;

                            try {
                              setReopeningTripId(trip.id);
                              const response = await fetch(
                                `/api/operations/trips/${trip.id}/reopen`,
                                    {
                                      method: 'PATCH',
                                      headers: {
                                        'Content-Type': 'application/json',
                                      },
                                      body: JSON.stringify({
                                        resetTasks: true,
                                        reason: reason && reason.trim()
                                          ? reason.trim()
                                          : undefined,
                                      }),
                                    },
                                  );
                                  const isJson =
                                    response.headers
                                      .get('content-type')
                                      ?.toLowerCase()
                                      .includes('application/json') ?? false;
                                  const body = isJson
                                    ? await response.json()
                                    : await response.text();

                                  if (!response.ok) {
                                    const message =
                                      typeof body === 'string'
                                        ? body
                                        : body?.message ??
                                          'Unable to reopen trip.';
                                    toast.error(message);
                                    return;
                                  }

                                  toast.success(
                                    'Trip reopened for additional work.',
                                  );

                                  const refresh = await fetch(
                                    `/api/operations/trips?projectId=${encodeURIComponent(
                                      projectId,
                                    )}`,
                                  );
                                  const refreshIsJson =
                                    refresh.headers
                                      .get('content-type')
                                      ?.toLowerCase()
                                      .includes('application/json') ?? false;
                                  const refreshBody = refreshIsJson
                                    ? await refresh.json()
                                    : await refresh.text();
                                  if (refresh.ok) {
                                    setTrips(
                                      ((refreshBody as any).items ?? []) as Trip[],
                                    );
                                  }
                                } catch (error) {
                                  const message =
                                    error instanceof Error
                                      ? error.message
                                      : 'Unable to reopen trip. Please try again.';
                                  toast.error(message);
                                } finally {
                                  setReopeningTripId(null);
                                }
                              }}
                            >
                              {reopeningTripId === trip.id
                                ? 'Reopening...'
                                : 'Reopen for rework'}
                            </Button>
                          )}
                        </div>
                      </div>
                      {photos.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-1">
                          {photos.slice(0, 6).map((photo) => (
                            <a
                              key={photo.id}
                              href={photo.url}
                              target="_blank"
                              rel="noreferrer"
                              className="border rounded-md overflow-hidden w-16 h-14 bg-muted flex items-center justify-center"
                            >
                              <img
                                src={photo.url}
                                alt={photo.caption ?? 'Trip photo'}
                                className="object-cover w-full h-full"
                              />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </section>
      </main>
    </div>
  );
}
