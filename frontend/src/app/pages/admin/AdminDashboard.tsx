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

type Project = {
  id: string;
  name: string;
  status: string;
  buildingType: string | null;
  roomsCount: number | null;
  createdAt: string;
};

type RevenueProject = {
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

const ALLOWED_ROLES = ['ADMIN'];

type HeardAboutUsEntry = {
  source: string;
  count: number;
};

type AdminNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  readAt?: string | null;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<OranUser | null>(null);
  const [checking, setChecking] = useState(true);

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [showCompletedOnly, setShowCompletedOnly] = useState(false);

  const [revenueLoading, setRevenueLoading] = useState(false);
  const [totalCollected, setTotalCollected] = useState(0);
  const [totalProjected, setTotalProjected] = useState(0);
  const [revenuePerProject, setRevenuePerProject] = useState<RevenueProject[]>([]);
  const [heardAboutUs, setHeardAboutUs] = useState<HeardAboutUsEntry[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);

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

  useEffect(() => {
    if (!user) return;

    const loadProjects = async () => {
      try {
        setProjectsLoading(true);
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

        const items = (body?.items ?? []) as Project[];
        setProjects(items);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to load projects. Please try again.';
        toast.error(message);
      } finally {
        setProjectsLoading(false);
      }
    };

    const loadRevenue = async () => {
      try {
        setRevenueLoading(true);
        const res = await fetch('/api/admin/revenue/overview');
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
              : body?.message ?? 'Unable to load revenue overview.';
          toast.error(message);
          return;
        }

        setTotalCollected(Number((body as any)?.totalCollected ?? 0));
        setTotalProjected(Number((body as any)?.totalProjected ?? 0));
        setRevenuePerProject(
          (((body as any)?.perProject ?? []) as RevenueProject[]).map((p) => ({
            ...p,
            totalAmount: Number(p.totalAmount ?? 0),
            collectedAmount: Number(p.collectedAmount ?? 0),
            devicesCost: Number((p as any).devicesCost ?? 0),
            technicianCostInstall: Number(
              (p as any).technicianCostInstall ?? 0,
            ),
            technicianCostIntegration: Number(
              (p as any).technicianCostIntegration ?? 0,
            ),
            taxAmount: Number((p as any).taxAmount ?? 0),
            grossRevenue: Number((p as any).grossRevenue ?? p.totalAmount ?? 0),
            profit: Number((p as any).profit ?? 0),
          })),
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to load revenue overview. Please try again.';
        toast.error(message);
      } finally {
        setRevenueLoading(false);
      }
    };

    const loadHeardAboutUs = async () => {
      try {
        const res = await fetch('/api/admin/analytics/heard-about-us');
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
              : body?.message ?? 'Unable to load acquisition sources.';
          toast.error(message);
          return;
        }

        const items = (body as any as HeardAboutUsEntry[]).map((e) => ({
          source: e.source || 'Unknown',
          count: Number(e.count ?? 0),
        }));
        items.sort((a, b) => b.count - a.count);
        setHeardAboutUs(items);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to load acquisition sources. Please try again.';
        toast.error(message);
      }
    };

    const loadNotifications = async () => {
      try {
        const res = await fetch('/api/admin/notifications');
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
              : body?.message ?? 'Unable to load admin notifications.';
          toast.error(message);
          return;
        }

        const items = (((body as any)?.items ?? []) as AdminNotification[]).map(
          (n) => ({
            ...n,
            createdAt: n.createdAt,
            readAt: n.readAt ?? null,
          }),
        );
        setNotifications(items);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to load admin notifications. Please try again.';
        toast.error(message);
      }
    };

    void loadProjects();
    void loadRevenue();
    void loadHeardAboutUs();
    void loadNotifications();
  }, [user]);

  const totalProjects = projects.length;
  const onboardingProjects = projects.filter(
    (p) => p.status === 'ONBOARDING',
  ).length;
  const completedProjects = projects.filter(
    (p) => p.status === 'COMPLETED',
  ).length;

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
                Admin view for projects, operations and revenue.
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

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Overview</h1>
            <p className="text-sm text-muted-foreground">
              Quick view of ORAN projects, operations and revenue.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/technician')}
          >
            Open technician workspace
          </Button>
        </div>

        {/* Top cards */}
        <section className="grid gap-4 md:grid-cols-4">
          <Card className="p-4 space-y-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Projects
            </p>
            <p className="text-2xl font-bold text-foreground">
              {projectsLoading ? '…' : totalProjects || '0'}
            </p>
            <p className="text-xs text-muted-foreground">
              Total customer projects captured via onboarding.
            </p>
          </Card>

          <Card className="p-4 space-y-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Onboarding
            </p>
            <p className="text-2xl font-bold text-foreground">
              {projectsLoading ? '…' : onboardingProjects || '0'}
            </p>
            <p className="text-xs text-muted-foreground">
              Projects currently in the onboarding phase.
            </p>
          </Card>

          <Card className="p-4 space-y-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              System status
            </p>
            <p className="text-sm font-medium text-emerald-600">Healthy</p>
            <p className="text-xs text-muted-foreground">
              Backend on EC2 + Postgres are online.
            </p>
          </Card>

          <Card className="p-4 space-y-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Revenue (collected / projected)
            </p>
            <p className="text-lg font-bold text-foreground">
              {revenueLoading
                ? '…'
                : `₦${totalCollected.toLocaleString()} / ₦${totalProjected.toLocaleString()}`}
            </p>
            <p className="text-xs text-muted-foreground">
              Sum of all completed milestone payments compared with total
              milestone values across projects.
            </p>
          </Card>
        </section>

        {/* Admin notifications */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Recent admin notifications</h2>
          <Card className="p-4 text-xs space-y-2">
            {notifications.length === 0 ? (
              <p className="text-muted-foreground">
                No notifications yet. Events like quote selection, documents
                signing, payment plan choice and milestone payments will appear
                here.
              </p>
            ) : (
              <div className="space-y-1">
                {notifications.slice(0, 10).map((n) => (
                  <div
                    key={n.id}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-1 border rounded-md px-3 py-2"
                  >
                    <div>
                      <p className="font-medium text-foreground">{n.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {n.message}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(n.createdAt).toLocaleString('en-NG', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {n.readAt ? (
                        <span className="text-[10px] text-muted-foreground">
                          Read
                        </span>
                      ) : (
                        <button
                          className="text-[10px] text-primary hover:underline"
                          onClick={async () => {
                            try {
                              const res = await fetch(
                                `/api/admin/notifications/${encodeURIComponent(
                                  n.id,
                                )}/read`,
                                { method: 'POST' },
                              );
                              if (!res.ok) return;
                              setNotifications((prev) =>
                                prev.map((x) =>
                                  x.id === n.id
                                    ? {
                                        ...x,
                                        readAt: new Date().toISOString(),
                                      }
                                    : x,
                                ),
                              );
                            } catch {
                              // ignore
                            }
                          }}
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>

        <Separator />

        {/* Recent projects + admin tools */}
        <section className="grid gap-4 md:grid-cols-2 items-start">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold mb-1">Recent projects</h2>
                <p className="text-xs text-muted-foreground">
                  Latest items from the projects API.
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {projectsLoading ? 'Loading…' : `${projects.length} total`}
              </span>
            </div>
            <div className="border rounded-md divide-y">
              {projects.length === 0 && !projectsLoading ? (
                <div className="p-3 text-xs text-muted-foreground">
                  No projects yet. Complete onboarding as a customer to see
                  them here.
                </div>
              ) : (
                projects.slice(0, 5).map((project) => (
                  <div
                    key={project.id}
                    className="p-3 text-xs flex flex-col md:flex-row md:items-center md:justify-between gap-2 cursor-pointer hover:bg-muted/60"
                    onClick={() => router.push(`/admin/projects/${project.id}`)}
                    role="button"
                    tabIndex={0}
                  >
                    <div>
                      <p className="font-medium text-foreground text-sm">
                        {project.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {project.buildingType || 'Unknown type'} ·{' '}
                        {project.roomsCount ?? 0} rooms
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {project.status.toLowerCase().replace(/_/g, ' ')}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(project.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-4 flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-semibold mb-1">Admin tools</h2>
              <p className="text-xs text-muted-foreground mb-3">
                Manage technicians, review projects and cross‑check revenue.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 mt-3 text-xs">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/admin/technicians')}
              >
                Manage technicians
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/admin/projects')}
              >
                All projects
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/dashboard')}
              >
                Customer dashboard
              </Button>
            </div>
          </Card>
        </section>

        {/* Acquisition sources */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">
            Where customers heard about ORAN
          </h2>
          <Card className="p-4 text-xs space-y-2">
            {heardAboutUs.length === 0 ? (
              <p className="text-muted-foreground">
                No acquisition data yet. New registrations that include
                &quot;Where did you hear about ORAN?&quot; will appear here.
              </p>
            ) : (
              <div className="space-y-1">
                {heardAboutUs.map((entry) => (
                  <div
                    key={entry.source}
                    className="flex items-center justify-between"
                  >
                    <span className="text-foreground font-medium">
                      {entry.source}
                    </span>
                    <span className="text-muted-foreground">
                      {entry.count} signup{entry.count === 1 ? '' : 's'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>

        {/* Revenue per project */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Revenue by project</h2>
          <Card className="p-4 text-xs">
            {revenueLoading ? (
              <p className="text-muted-foreground">Loading revenue…</p>
            ) : revenuePerProject.length === 0 ? (
              <p className="text-muted-foreground">
                No revenue data yet. Once customers start paying milestones,
                collections will appear here.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b text-[11px] text-muted-foreground">
                      <th className="text-left py-2 pr-3 font-medium">
                        Project
                      </th>
                      <th className="text-left py-2 pr-3 font-medium">
                        Plan
                      </th>
                      <th className="text-right py-2 pr-3 font-medium">
                        Collected
                      </th>
                      <th className="text-right py-2 pr-3 font-medium">
                        Projected
                      </th>
                      <th className="text-right py-2 font-medium">% Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenuePerProject.map((p) => {
                      const pct =
                        p.totalAmount > 0
                          ? Math.round(
                              (p.collectedAmount / p.totalAmount) * 100,
                            )
                          : 0;
                      return (
                        <tr
                          key={p.projectId}
                          className="border-b last:border-b-0 hover:bg-muted/40 cursor-pointer"
                          onClick={() =>
                            router.push(`/admin/projects/${p.projectId}`)
                          }
                        >
                          <td className="py-2 pr-3">
                            <span className="font-medium text-foreground">
                              {p.projectName}
                            </span>
                          </td>
                          <td className="py-2 pr-3 capitalize text-muted-foreground">
                            {p.planType === 'MILESTONE_3'
                              ? '3 milestones'
                              : '80 / 10 / 10'}
                          </td>
                          <td className="py-2 pr-3 text-right">
                            ₦{p.collectedAmount.toLocaleString()}
                          </td>
                          <td className="py-2 pr-3 text-right">
                            ₦{p.totalAmount.toLocaleString()}
                          </td>
                          <td className="py-2 text-right text-muted-foreground">
                            {pct}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </section>
      </main>
    </div>
  );
}
