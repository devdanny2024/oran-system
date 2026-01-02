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
  createdAt: string;
};

type Trip = {
  id: string;
  status: TripStatus;
  scheduledFor: string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  notes?: string | null;
  projectId: string;
  tasks?: TripTask[];
  photos?: TripPhoto[];
  reworkReason?: string | null;
};

export default function TechnicianWorkspace() {
  const router = useRouter();

  const [user, setUser] = useState<OranUser | null>(null);
  const [checking, setChecking] = useState(true);

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [updatingTripId, setUpdatingTripId] = useState<string | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);

  const [photoInputs, setPhotoInputs] = useState<
    Record<string, { url: string; caption: string }>
  >({});
  const [savingPhotoForTripId, setSavingPhotoForTripId] = useState<
    string | null
  >(null);
  const [rescheduleInputs, setRescheduleInputs] = useState<
    Record<string, string>
  >({});
  const [reschedulingTripId, setReschedulingTripId] = useState<string | null>(
    null,
  );

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

  const loadTrips = async (technicianId: string) => {
    try {
      setLoadingTrips(true);
      const response = await fetch(
        `/api/operations/trips?technicianId=${encodeURIComponent(
          technicianId,
        )}`,
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
      setLoadingTrips(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    void loadTrips(user.id);
  }, [user]);

  const today = new Date();
  const isSameDay = (iso?: string | null) => {
    if (!iso) return false;
    const date = new Date(iso);
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  const assignedTrips = trips.filter(
    (trip) => trip.status === 'SCHEDULED' || trip.status === 'IN_PROGRESS',
  );
  const inProgressTrips = trips.filter(
    (trip) => trip.status === 'IN_PROGRESS',
  );
  const completedTodayTrips = trips.filter(
    (trip) =>
      trip.status === 'COMPLETED' &&
      isSameDay(trip.checkOutAt ?? trip.checkInAt),
  );

  const upcomingTrips = trips
    .filter(
      (trip) => trip.status === 'SCHEDULED' || trip.status === 'IN_PROGRESS',
    )
    .sort(
      (a, b) =>
        new Date(a.scheduledFor).getTime() -
        new Date(b.scheduledFor).getTime(),
    )
    .slice(0, 5);

  if (checking || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Checking access...</p>
      </div>
    );
  }

  const activeTrip =
    activeTripId != null
      ? upcomingTrips.find((trip) => trip.id === activeTripId) ??
        trips.find((trip) => trip.id === activeTripId) ??
        null
      : null;

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
                For technicians managing site visits, tasks and site photos.
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
            Today&apos;s work
          </h1>
          <p className="text-sm text-muted-foreground">
            See trips assigned to you and keep track of check-ins, tasks and
            photos for each visit.
          </p>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <Card className="p-4 space-y-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Assigned trips
            </p>
            <p className="text-2xl font-bold text-foreground">
              {loadingTrips ? '...' : assignedTrips.length}
            </p>
            <p className="text-xs text-muted-foreground">
              Upcoming visits assigned to you.
            </p>
          </Card>

          <Card className="p-4 space-y-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              In progress
            </p>
            <p className="text-2xl font-bold text-foreground">
              {loadingTrips ? '...' : inProgressTrips.length}
            </p>
            <p className="text-xs text-muted-foreground">
              Jobs you&apos;ve checked into but not completed.
            </p>
          </Card>

          <Card className="p-4 space-y-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Completed today
            </p>
            <p className="text-2xl font-bold text-foreground">
              {loadingTrips ? '...' : completedTodayTrips.length}
            </p>
            <p className="text-xs text-muted-foreground">
              Trips you completed today.
            </p>
          </Card>
        </section>

        <Separator />

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Upcoming visits</h2>
          <Card className="p-4 text-xs text-muted-foreground space-y-2">
            {upcomingTrips.length === 0 && !loadingTrips ? (
              <p>No upcoming visits yet.</p>
            ) : (
              <>
                {upcomingTrips.map((trip) => (
                  <div
                    key={trip.id}
                    className="flex flex-col gap-2 py-2 border-b last:border-b-0 border-border/40"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          {new Date(trip.scheduledFor).toLocaleString()}
                        </p>
                        {trip.notes && (
                          <p className="text-[11px] text-muted-foreground">
                            {trip.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          {trip.status.toLowerCase().replace(/_/g, ' ')}
                        </span>
                        {trip.checkOutAt && trip.status !== 'COMPLETED' && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px]">
                            Rework visit
                          </span>
                        )}
                        {trip.status === 'SCHEDULED' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[11px] h-7"
                            disabled={updatingTripId === trip.id}
                            onClick={async () => {
                              try {
                                setUpdatingTripId(trip.id);
                                const response = await fetch(
                                  `/api/operations/trips/${trip.id}/check-in`,
                                  { method: 'PATCH' },
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
                                        'Unable to check in to this trip.';
                                  toast.error(message);
                                  return;
                                }

                                toast.success('Checked in to trip.');
                                await loadTrips(user.id);
                              } catch (error) {
                                const message =
                                  error instanceof Error
                                    ? error.message
                                    : 'Unable to check in. Please try again.';
                                toast.error(message);
                              } finally {
                                setUpdatingTripId(null);
                              }
                            }}
                          >
                            {updatingTripId === trip.id ? 'Checking in...' : 'Check in'}
                          </Button>
                        )}
                        {trip.status === 'IN_PROGRESS' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[11px] h-7"
                            disabled={updatingTripId === trip.id}
                            onClick={async () => {
                              try {
                                setUpdatingTripId(trip.id);
                                const response = await fetch(
                                  `/api/operations/trips/${trip.id}/check-out`,
                                  { method: 'PATCH' },
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
                                        'Unable to check out of this trip.';
                                  toast.error(message);
                                  return;
                                }

                                toast.success('Checked out of trip.');
                                await loadTrips(user.id);
                              } catch (error) {
                                const message =
                                  error instanceof Error
                                    ? error.message
                                    : 'Unable to check out. Please try again.';
                                toast.error(message);
                              } finally {
                                setUpdatingTripId(null);
                              }
                            }}
                          >
                            {updatingTripId === trip.id
                              ? 'Checking out...'
                              : 'Check out'}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-[11px] h-7"
                          onClick={() =>
                            setActiveTripId(
                              activeTripId === trip.id ? null : trip.id,
                            )
                          }
                        >
                          {activeTripId === trip.id
                            ? 'Hide details'
                            : 'View details'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </Card>
        </section>

        {activeTrip && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold">Trip details</h2>
            <Card className="p-4 text-xs space-y-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">
                    {new Date(activeTrip.scheduledFor).toLocaleString()}
                  </p>
                  {activeTrip.checkOutAt && activeTrip.status !== 'COMPLETED' && (
                    <p className="text-[11px] text-amber-700">
                      This visit has been reopened for rework.
                    </p>
                  )}
                  {activeTrip.reworkReason && (
                    <p className="text-[11px] text-muted-foreground">
                      Reason: {activeTrip.reworkReason}
                    </p>
                  )}
                  {activeTrip.notes && (
                    <p className="text-[11px] text-muted-foreground">
                      {activeTrip.notes}
                    </p>
                  )}
                  <div className="flex flex-col md:flex-row md:items-center gap-2 mt-1">
                    <label className="text-[11px] text-muted-foreground md:w-40">
                      Reschedule visit
                    </label>
                    <input
                      type="datetime-local"
                      className="border rounded px-2 py-1 text-[11px] flex-1"
                      value={
                        rescheduleInputs[activeTrip.id] ??
                        (() => {
                          const date = new Date(activeTrip.scheduledFor);
                          const pad = (value: number) =>
                            value.toString().padStart(2, '0');
                          const local = `${date.getFullYear()}-${pad(
                            date.getMonth() + 1,
                          )}-${pad(date.getDate())}T${pad(
                            date.getHours(),
                          )}:${pad(date.getMinutes())}`;
                          return local;
                        })()
                      }
                      onChange={(event) =>
                        setRescheduleInputs((previous) => ({
                          ...previous,
                          [activeTrip.id]: event.target.value,
                        }))
                      }
                    />
                    <Button
                      size="sm"
                      className="text-[11px] h-7"
                      disabled={reschedulingTripId === activeTrip.id}
                      onClick={async () => {
                        const value = rescheduleInputs[activeTrip.id];
                        if (!value) {
                          toast.error('Please pick a new date and time first.');
                          return;
                        }
                        const nextDate = new Date(value);
                        if (Number.isNaN(nextDate.getTime())) {
                          toast.error('Reschedule date is not valid.');
                          return;
                        }
                        try {
                          setReschedulingTripId(activeTrip.id);
                          const response = await fetch(
                            `/api/operations/trips/${activeTrip.id}/reschedule`,
                            {
                              method: 'PATCH',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({
                                scheduledFor: nextDate.toISOString(),
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
                                  'Unable to reschedule this trip.';
                            toast.error(message);
                            return;
                          }

                          toast.success('Visit rescheduled.');
                          await loadTrips(user.id);
                        } catch (error) {
                          const message =
                            error instanceof Error
                              ? error.message
                              : 'Unable to reschedule. Please try again.';
                          toast.error(message);
                        } finally {
                          setReschedulingTripId(null);
                        }
                      }}
                    >
                      {reschedulingTripId === activeTrip.id
                        ? 'Updating...'
                        : 'Update'}
                    </Button>
                  </div>
                </div>
                <div className="text-[11px] text-muted-foreground md:text-right">
                  {activeTrip.checkInAt && (
                    <p>
                      Checked in:{' '}
                      {new Date(activeTrip.checkInAt).toLocaleString()}
                    </p>
                  )}
                  {activeTrip.checkOutAt && (
                    <p>
                      Checked out:{' '}
                      {new Date(activeTrip.checkOutAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              {Array.isArray(activeTrip.tasks) &&
                activeTrip.tasks.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold text-foreground">
                      Tasks for this visit
                    </p>
                    <div className="space-y-1">
                      {activeTrip.tasks
                        .slice()
                        .sort((a, b) => a.sequence - b.sequence)
                        .map((task) => (
                          <label
                            key={task.id}
                            className="flex items-center gap-2 text-[11px]"
                          >
                            <input
                              type="checkbox"
                              className="h-3 w-3"
                              checked={task.isDone}
                              disabled={updatingTaskId === task.id}
                              onChange={async (event) => {
                                const next = event.target.checked;
                                try {
                                  setUpdatingTaskId(task.id);
                                  const response = await fetch(
                                    `/api/operations/trips/${activeTrip.id}/tasks/${task.id}`,
                                    {
                                      method: 'PATCH',
                                      headers: {
                                        'Content-Type': 'application/json',
                                      },
                                      body: JSON.stringify({
                                        isDone: next,
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
                                          'Unable to update task.';
                                    toast.error(message);
                                    return;
                                  }

                                  await loadTrips(user.id);
                                } catch (error) {
                                  const message =
                                    error instanceof Error
                                      ? error.message
                                      : 'Unable to update task. Please try again.';
                                  toast.error(message);
                                } finally {
                                  setUpdatingTaskId(null);
                                }
                              }}
                            />
                            <span
                              className={
                                task.isDone
                                  ? 'line-through text-muted-foreground'
                                  : 'text-foreground'
                              }
                            >
                              {task.label}
                            </span>
                          </label>
                        ))}
                    </div>
                  </div>
                )}

              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-foreground">
                  Photos from site
                </p>
                {Array.isArray(activeTrip.photos) &&
                activeTrip.photos.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {activeTrip.photos.map((photo) => (
                      <a
                        key={photo.id}
                        href={photo.url}
                        target="_blank"
                        rel="noreferrer"
                        className="border rounded-md overflow-hidden w-20 h-16 bg-muted flex items-center justify-center"
                      >
                        <img
                          src={photo.url}
                          alt={photo.caption ?? 'Trip photo'}
                          className="object-cover w-full h-full"
                        />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    No photos captured yet for this visit.
                  </p>
                )}

                {(() => {
                  const input = photoInputs[activeTrip.id] ?? {
                    url: '',
                    caption: '',
                  };
                  return (
                    <div className="flex flex-col md:flex-row md:items-center gap-2 mt-1">
                      <input
                        type="text"
                        placeholder="Photo URL"
                        className="flex-1 border rounded px-2 py-1 text-[11px]"
                        value={input.url}
                        onChange={(event) =>
                          setPhotoInputs((previous) => ({
                            ...previous,
                            [activeTrip.id]: {
                              ...input,
                              url: event.target.value,
                            },
                          }))
                        }
                      />
                      <input
                        type="text"
                        placeholder="Caption (optional)"
                        className="flex-1 border rounded px-2 py-1 text-[11px]"
                        value={input.caption}
                        onChange={(event) =>
                          setPhotoInputs((previous) => ({
                            ...previous,
                            [activeTrip.id]: {
                              ...input,
                              caption: event.target.value,
                            },
                          }))
                        }
                      />
                      <Button
                        size="sm"
                        className="text-[11px] h-7"
                        disabled={
                          !input.url.trim() ||
                          savingPhotoForTripId === activeTrip.id
                        }
                        onClick={async () => {
                          if (!input.url.trim()) return;
                          try {
                            setSavingPhotoForTripId(activeTrip.id);
                            const response = await fetch(
                              `/api/operations/trips/${activeTrip.id}/photos`,
                              {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                  url: input.url.trim(),
                                  caption: input.caption.trim() || null,
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
                                  : body?.message ?? 'Unable to add photo.';
                              toast.error(message);
                              return;
                            }

                            toast.success('Photo saved for this trip.');
                            setPhotoInputs((previous) => ({
                              ...previous,
                              [activeTrip.id]: { url: '', caption: '' },
                            }));
                            await loadTrips(user.id);
                          } catch (error) {
                            const message =
                              error instanceof Error
                                ? error.message
                                : 'Unable to add photo. Please try again.';
                            toast.error(message);
                          } finally {
                            setSavingPhotoForTripId(null);
                          }
                        }}
                      >
                        {savingPhotoForTripId === activeTrip.id
                          ? 'Saving...'
                          : 'Add photo'}
                      </Button>
                    </div>
                  );
                })()}
              </div>
            </Card>
          </section>
        )}
      </main>
    </div>
  );
}
