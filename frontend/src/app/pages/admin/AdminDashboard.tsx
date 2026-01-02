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
};

const ALLOWED_ROLES = ['ADMIN'];

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<OranUser | null>(null);
  const [checking, setChecking] = useState(true);

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  const [revenueLoading, setRevenueLoading] = useState(false);
  const [totalCollected, setTotalCollected] = useState(0);
  const [totalProjected, setTotalProjected] = useState(0);
  const [revenuePerProject, setRevenuePerProject] = useState<RevenueProject[]>([]);

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

    void loadProjects();
    void loadRevenue();
  }, [user]);

  const totalProjects = projects.length;
  const onboardingProjects = projects.filter(
    (p) => p.status === 'ONBOARDING',
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

