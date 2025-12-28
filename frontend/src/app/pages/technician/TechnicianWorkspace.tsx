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

const ALLOWED_ROLES = ['TECHNICIAN', 'ADMIN'];

type TripStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

type Trip = {
  id: string;
  status: TripStatus;
  scheduledFor: string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  notes?: string | null;
  projectId: string;
};

export default function TechnicianWorkspace() {
  const router = useRouter();
  const [user, setUser] = useState<OranUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [updatingTripId, setUpdatingTripId] = useState<string | null>(null);

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
      const res = await fetch(
        `/api/operations/trips?technicianId=${encodeURIComponent(
          technicianId,
        )}`,
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
    const d = new Date(iso);
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  };

  const assignedTrips = trips.filter(
    (t) => t.status === 'SCHEDULED' || t.status === 'IN_PROGRESS',
  );
  const inProgressTrips = trips.filter((t) => t.status === 'IN_PROGRESS');
  const completedTodayTrips = trips.filter(
    (t) => t.status === 'COMPLETED' && isSameDay(t.checkOutAt ?? t.checkInAt),
  );

  const upcomingTrips = trips
    .filter((t) => t.status === 'SCHEDULED' || t.status === 'IN_PROGRESS')
    .sort(
      (a, b) =>
        new Date(a.scheduledFor).getTime() -
        new Date(b.scheduledFor).getTime(),
    )
    .slice(0, 5);

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
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">O</span>
            </div>
            <div>
              <p className="font-semibold text-foreground">ORAN Technician Workspace</p>
              <p className="text-xs text-muted-foreground">
                For technicians (and admins) managing site visits and work updates.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/dashboard')}
          >
            Back to dashboard
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Today&apos;s work
          </h1>
          <p className="text-sm text-muted-foreground">
            See trips assigned to you and keep track of check-ins and check-outs.
          </p>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <Card className="p-4 space-y-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Assigned trips
            </p>
            <p className="text-2xl font-bold text-foreground">
              {loadingTrips ? '…' : assignedTrips.length}
            </p>
            <p className="text-xs text-muted-foreground">
              Number of upcoming visits assigned to you.
            </p>
          </Card>

          <Card className="p-4 space-y-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              In-progress
            </p>
            <p className="text-2xl font-bold text-foreground">
              {loadingTrips ? '…' : inProgressTrips.length}
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
              {loadingTrips ? '…' : completedTodayTrips.length}
            </p>
            <p className="text-xs text-muted-foreground">
              We&apos;ll pull this from operations data later.
            </p>
          </Card>
        </section>

        <Separator />

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">
            Upcoming visits
          </h2>
          <Card className="p-4 text-xs text-muted-foreground space-y-2">
            {upcomingTrips.length === 0 && !loadingTrips ? (
              <p>No upcoming visits yet.</p>
            ) : (
              <>
                {upcomingTrips.map((trip) => (
                  <div
                    key={trip.id}
                    className="flex items-center justify-between gap-3 py-2 border-b last:border-b-0 border-border/40"
                  >
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
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        {trip.status.toLowerCase().replace(/_/g, ' ')}
                      </span>
                      {trip.status === 'SCHEDULED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[11px] h-7"
                          disabled={updatingTripId === trip.id}
                          onClick={async () => {
                            try {
                              setUpdatingTripId(trip.id);
                              const res = await fetch(
                                `/api/operations/trips/${trip.id}/check-in`,
                                { method: 'PATCH' },
                              );
                              const isJson =
                                res.headers
                                  .get('content-type')
                                  ?.toLowerCase()
                                  .includes('application/json') ?? false;
                              const body = isJson
                                ? await res.json()
                                : await res.text();

                              if (!res.ok) {
                                const message =
                                  typeof body === 'string'
                                    ? body
                                    : body?.message ?? 'Unable to check in.';
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
                          {updatingTripId === trip.id ? 'Checking in…' : 'Check in'}
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
                              const res = await fetch(
                                `/api/operations/trips/${trip.id}/check-out`,
                                { method: 'PATCH' },
                              );
                              const isJson =
                                res.headers
                                  .get('content-type')
                                  ?.toLowerCase()
                                  .includes('application/json') ?? false;
                              const body = isJson
                                ? await res.json()
                                : await res.text();

                              if (!res.ok) {
                                const message =
                                  typeof body === 'string'
                                    ? body
                                    : body?.message ?? 'Unable to check out.';
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
                            ? 'Checking out…'
                            : 'Check out'}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </Card>
        </section>
      </main>
    </div>
  );
}
