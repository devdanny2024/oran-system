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
  completedAt?: string | null;
  handoverAt?: string | null;
  handoverNotes?: string | null;
  onboarding?: Onboarding | null;
};

type ProjectRevenueSummary = {
  projectId: string;
  projectName: string;
  planType: 'MILESTONE_3' | 'EIGHTY_TEN_TEN';
  totalAmount: number;
  collectedAmount: number;
  devicesCost?: number;
  technicianCostInstall?: number;
  technicianCostIntegration?: number;
  taxAmount?: number;
  grossRevenue?: number;
  profit?: number;
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

type DeviceShipmentStatus =
  | 'NOT_PREPARED'
  | 'WRAPPING'
  | 'IN_TRANSIT'
  | 'NIGERIA_STORE'
  | 'DELIVERED';

type ProjectDeviceShipment = {
  id: string;
  projectId: string;
  milestoneId?: string | null;
  status: DeviceShipmentStatus;
  itemsJson: {
    quoteItemId?: string;
    quantity?: number;
    name?: string | null;
    category?: string | null;
  }[];
  estimatedFrom?: string | null;
  estimatedTo?: string | null;
  locationNote?: string | null;
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
  const [deviceShipment, setDeviceShipment] =
    useState<ProjectDeviceShipment | null>(null);
  const [deviceShipmentLoading, setDeviceShipmentLoading] = useState(false);
  const [updatingShipment, setUpdatingShipment] = useState(false);
  const [shipmentStatus, setShipmentStatus] =
    useState<DeviceShipmentStatus>('NOT_PREPARED');
  const [shipmentFrom, setShipmentFrom] = useState('');
  const [shipmentTo, setShipmentTo] = useState('');
  const [shipmentNote, setShipmentNote] = useState('');
  const [handoverNotes, setHandoverNotes] = useState('');

  const [technicians, setTechnicians] = useState<
    { id: string; name: string | null; email: string }[]
  >([]);
  const [techniciansLoading, setTechniciansLoading] = useState(false);

  const [scheduledFor, setScheduledFor] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [notes, setNotes] = useState('');
  const [creatingTrip, setCreatingTrip] = useState(false);
  const [reopeningTripId, setReopeningTripId] = useState<string | null>(null);

  const [revenueSummary, setRevenueSummary] =
    useState<ProjectRevenueSummary | null>(null);
  const [revenueLoading, setRevenueLoading] = useState(false);

  const projectTickets = tickets.filter(
    (t) => t.projectId === projectId,
  );

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

          const proj = body as Project;
          setProject(proj);
          if (proj.handoverNotes) {
            setHandoverNotes(proj.handoverNotes);
          }
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

      const loadRevenueSummary = async () => {
        try {
          setRevenueLoading(true);
          const res = await fetch(
            `/api/admin/revenue/projects/${encodeURIComponent(projectId)}`,
          );
          const isJson =
            res.headers
              .get('content-type')
              ?.toLowerCase()
              .includes('application/json') ?? false;
          const body = isJson ? await res.json() : await res.text();

          if (!res.ok) {
            // Soft-fail: just log via toast if needed.
            const message =
              typeof body === 'string'
                ? body
                : body?.message ?? 'Unable to load revenue summary.';
            // Only warn in UI if there is a project; otherwise it can be noisy.
            if (projectId) {
              // eslint-disable-next-line no-console
              console.warn('AdminProjectDetail revenue error:', message);
            }
            return;
          }

          if (body) {
            setRevenueSummary(body as ProjectRevenueSummary);
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn(
            'AdminProjectDetail revenue error:',
            error instanceof Error ? error.message : String(error),
          );
        } finally {
          setRevenueLoading(false);
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

    const loadDeviceShipment = async () => {
      try {
        setDeviceShipmentLoading(true);
        const response = await fetch(
          `/api/projects/${projectId}/device-shipment`,
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
              : body?.message ?? 'Unable to load device shipment.';
          toast.error(message);
          return;
        }

        setDeviceShipment(body as ProjectDeviceShipment);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to load device shipment. Please try again.';
        toast.error(message);
      } finally {
        setDeviceShipmentLoading(false);
      }
    };

      void loadProject();
      void loadRevenueSummary();
    void loadTrips();
    void loadTechnicians();
    void loadDeviceShipment();
  }, [projectId]);

  useEffect(() => {
    if (!deviceShipment) return;
    setShipmentStatus(deviceShipment.status);
    setShipmentFrom(
      deviceShipment.estimatedFrom
        ? new Date(deviceShipment.estimatedFrom).toISOString().slice(0, 10)
        : '',
    );
    setShipmentTo(
      deviceShipment.estimatedTo
        ? new Date(deviceShipment.estimatedTo).toISOString().slice(0, 10)
        : '',
    );
    setShipmentNote(deviceShipment.locationNote ?? '');
  }, [deviceShipment]);

  const handleSaveShipment = async () => {
    if (!projectId) return;
    if (!deviceShipment) return;

    try {
      setUpdatingShipment(true);
      const payload: {
        status: DeviceShipmentStatus;
        locationNote: string | null;
        estimatedFrom: string | null;
        estimatedTo: string | null;
      } = {
        status: shipmentStatus,
        locationNote: shipmentNote.trim() ? shipmentNote.trim() : null,
        estimatedFrom: shipmentFrom || null,
        estimatedTo: shipmentTo || null,
      };

      const res = await fetch(
        `/api/projects/${projectId}/device-shipment`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
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
            : body?.message ?? 'Unable to update device shipment.';
        toast.error(message);
        return;
      }

      setDeviceShipment(body as ProjectDeviceShipment);
      toast.success('Device shipment updated.');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to update device shipment. Please try again.';
      toast.error(message);
    } finally {
      setUpdatingShipment(false);
    }
  };

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
              <div className="grid gap-4 md:grid-cols-2 items-start">
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
                  {project.completedAt && (
                    <p className="text-muted-foreground">
                      Completed:{' '}
                      {new Date(project.completedAt).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  )}
                  {project.handoverAt && (
                    <p className="text-muted-foreground">
                      Handover:{' '}
                      {new Date(project.handoverAt).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  )}
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

                <Card className="p-4 text-xs space-y-2">
                  <p className="text-sm font-semibold text-foreground">
                    Revenue & profit
                  </p>
                  {revenueLoading && (
                    <p className="text-muted-foreground">
                      Loading revenue summary...
                    </p>
                  )}
                  {!revenueLoading && !revenueSummary && (
                    <p className="text-muted-foreground">
                      No revenue data yet. Once milestones are generated and
                      customers start paying, collections and profit will
                      appear here.
                    </p>
                  )}
                  {revenueSummary && (
                    <div className="space-y-1">
                      <p className="text-muted-foreground">
                        Payment plan:{' '}
                        <span className="text-foreground">
                          {revenueSummary.planType === 'MILESTONE_3'
                            ? '3 milestones'
                            : '80 / 10 / 10'}
                        </span>
                      </p>
                      <p className="text-muted-foreground">
                        Collected:{' '}
                        <span className="text-foreground font-medium">
                          ₦{revenueSummary.collectedAmount.toLocaleString()}
                        </span>
                      </p>
                      <p className="text-muted-foreground">
                        Projected total:{' '}
                        <span className="text-foreground">
                          ₦{revenueSummary.totalAmount.toLocaleString()}
                        </span>
                      </p>
                      <p className="text-muted-foreground">
                        Devices cost:{' '}
                        <span className="text-foreground">
                          ₦{Number(revenueSummary.devicesCost ?? 0).toLocaleString()}
                        </span>
                      </p>
                      <p className="text-muted-foreground">
                        Technician cost (install + integration):{' '}
                        <span className="text-foreground">
                          ₦
                          {(
                            Number(revenueSummary.technicianCostInstall ?? 0) +
                            Number(revenueSummary.technicianCostIntegration ?? 0)
                          ).toLocaleString()}
                        </span>
                      </p>
                      <p className="text-muted-foreground">
                        Tax:{' '}
                        <span className="text-foreground">
                          ₦{Number(revenueSummary.taxAmount ?? 0).toLocaleString()}
                        </span>
                      </p>
                      <p className="text-muted-foreground">
                        Profit (collected so far):{' '}
                        <span
                          className={
                            Number(revenueSummary.profit ?? 0) >= 0
                              ? 'text-emerald-600 font-semibold'
                              : 'text-red-600 font-semibold'
                          }
                        >
                          ₦{Number(revenueSummary.profit ?? 0).toLocaleString()}
                        </span>
                      </p>
                    </div>
                  )}
                </Card>
              </div>
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

          <Card className="p-4 space-y-3">
            <h2 className="text-sm font-semibold">Devices & logistics</h2>
            {deviceShipmentLoading ? (
              <p className="text-xs text-muted-foreground">
                Loading device shipment...
              </p>
            ) : !deviceShipment ? (
              <p className="text-xs text-muted-foreground">
                No shipment record yet. This will be created automatically once
                milestones are generated.
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Devices associated with paid milestones for this project and
                  their logistics status.
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Status</span>
                    <select
                      className="border rounded px-2 py-1 text-xs"
                      value={shipmentStatus}
                      disabled={updatingShipment}
                      onChange={(event) =>
                        setShipmentStatus(
                          event.target.value as DeviceShipmentStatus,
                        )
                      }
                    >
                      <option value="NOT_PREPARED">Not prepared</option>
                      <option value="WRAPPING">Wrapping</option>
                      <option value="IN_TRANSIT">In transit</option>
                      <option value="NIGERIA_STORE">Nigeria store</option>
                      <option value="DELIVERED">Delivered</option>
                    </select>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground">ETA from</span>
                      <input
                        type="date"
                        className="border rounded px-2 py-1 text-xs"
                        value={shipmentFrom}
                        onChange={(event) => setShipmentFrom(event.target.value)}
                        disabled={updatingShipment}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground">ETA to</span>
                      <input
                        type="date"
                        className="border rounded px-2 py-1 text-xs"
                        value={shipmentTo}
                        onChange={(event) => setShipmentTo(event.target.value)}
                        disabled={updatingShipment}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground">Location note</span>
                    <textarea
                      className="border rounded px-2 py-1 text-xs min-h-[60px]"
                      value={shipmentNote}
                      onChange={(event) => setShipmentNote(event.target.value)}
                      disabled={updatingShipment}
                    />
                  </div>
                  <div className="flex justify-end pt-1">
                    <Button
                      size="sm"
                      className="text-xs"
                      disabled={updatingShipment}
                      onClick={handleSaveShipment}
                    >
                      {updatingShipment ? 'Saving...' : 'Save logistics details'}
                    </Button>
                  </div>
                  {deviceShipment.itemsJson.length > 0 && (
                    <div className="space-y-1">
                      <p className="font-medium text-foreground text-xs">
                        Devices in this shipment
                      </p>
                      <ul className="list-disc list-inside text-[11px] text-muted-foreground">
                        {deviceShipment.itemsJson.map((item, index) => (
                          <li key={item.quoteItemId ?? index}>
                            {item.name ?? 'Device'} &times;{' '}
                            {item.quantity ?? 1}{' '}
                            {item.category
                              ? `(${item.category.toLowerCase()})`
                              : ''}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    Typical device delivery window is 1–3 weeks from first
                    milestone payment. Update status above as items move from
                    wrapping to transit and into the Nigeria store.
                  </p>
                </div>
              </>
            )}
          </Card>
        </section>

          {project && (
            <section className="space-y-3">
              <Card className="p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">
                      Handover notes
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Internal notes about final walkthrough, punch-list items and
                      handover. Visible only to admins.
                    </p>
                  </div>
                </div>
                <textarea
                  className="w-full border rounded px-2 py-1 min-h-[80px]"
                  value={handoverNotes}
                  onChange={(event) => setHandoverNotes(event.target.value)}
                  placeholder="Add any final notes about completion and handover for this project."
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={async () => {
                      try {
                        const res = await fetch(
                          `/api/admin/projects/${projectId}/handover-notes`,
                          {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ handoverNotes }),
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
                              : body?.message ?? 'Unable to save handover notes.';
                          toast.error(message);
                          return;
                        }

                        toast.success('Handover notes saved.');
                      } catch (error) {
                        const message =
                          error instanceof Error
                            ? error.message
                            : 'Unable to save handover notes. Please try again.';
                        toast.error(message);
                      }
                    }}
                  >
                    Save handover notes
                  </Button>
                </div>
              </Card>

              {projectTickets.length > 0 && (
                <Card className="p-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold text-foreground">
                      Support tickets for this project
                    </h2>
                    <span className="text-[11px] text-muted-foreground">
                      {projectTickets.length} ticket
                      {projectTickets.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tickets raised from the customer Support page that reference
                    this project. Use the main Support inbox to reply.
                  </p>
                  <div className="border rounded-md divide-y">
                    {projectTickets.map((t) => (
                      <div key={t.id} className="px-3 py-2 flex flex-col gap-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-foreground truncate">
                            {t.subject}
                          </p>
                          <span className="text-[10px] uppercase text-muted-foreground">
                            {t.status.toLowerCase().replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {t.name} · {t.email}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(t.createdAt).toLocaleString('en-NG', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </section>
          )}
      </main>
    </div>
  );
}
