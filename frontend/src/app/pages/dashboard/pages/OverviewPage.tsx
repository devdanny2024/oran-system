'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Progress } from '../../../components/ui/progress';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Separator } from '../../../components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Home, DollarSign, FolderKanban, ArrowRight, CheckCircle, Wrench } from 'lucide-react';
import Link from 'next/link';

type ProjectStatus =
  | 'ONBOARDING'
  | 'INSPECTION_REQUESTED'
  | 'INSPECTION_SCHEDULED'
  | 'INSPECTION_COMPLETED'
  | 'QUOTES_GENERATED'
  | 'QUOTE_SELECTED'
  | 'DOCUMENTS_PENDING'
  | 'DOCUMENTS_SIGNED'
  | 'PAYMENT_PLAN_SELECTED'
  | 'IN_PROGRESS'
  | 'COMPLETED';

type ProjectSummary = {
  id: string;
  userId: string;
  name: string;
  status: ProjectStatus | string;
  createdAt: string;
};

export default function OverviewPage() {
  const router = useRouter();
  const [requestingInspection, setRequestingInspection] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userDisplayName, setUserDisplayName] = useState<string>('');
  const [inspectionProjectId, setInspectionProjectId] = useState<string | null>(null);
  const [inspectionOpen, setInspectionOpen] = useState(false);
  const [inspectionAddress, setInspectionAddress] = useState('');
  const [inspectionPhone, setInspectionPhone] = useState('');
  const [submittingInspection, setSubmittingInspection] = useState(false);
  const [userProjects, setUserProjects] = useState<ProjectSummary[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = window.localStorage.getItem('oran_user');
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as {
        id?: string;
        name?: string | null;
        email?: string;
      };

      if (parsed?.id) {
        setUserId(parsed.id);
      }

      const displayName = (parsed.name || parsed.email || '').trim();
      if (displayName) {
        setUserDisplayName(displayName);
      }

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
                : body?.message ?? 'Unable to load your projects.';
            toast.error(message);
            return;
          }

          const items = ((body as any)?.items ?? []) as ProjectSummary[];
          const owned = parsed?.id
            ? items.filter((p) => p.userId === parsed.id)
            : items;

          owned.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() -
              new Date(a.createdAt).getTime(),
          );

          setUserProjects(owned);
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : 'Unable to load your projects. Please try again.';
          toast.error(message);
        } finally {
          setProjectsLoading(false);
        }
      };

      void loadProjects();
    } catch {
      // ignore parse errors
    }
  }, []);

  const handleOverviewInspection = async () => {
    if (!userId) {
      toast.error('Please log in again to request an inspection.');
      router.push('/login');
      return;
    }

    try {
      setRequestingInspection(true);

      const displayName = userDisplayName?.trim();
      const projectName = displayName
        ? `${displayName}'s ORAN Smart Home Project`
        : 'My ORAN Smart Home Project';

      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectName,
          userId,
        }),
      });

      const isJson =
        res.headers.get('content-type')?.toLowerCase().includes('application/json') ?? false;
      const body = isJson ? await res.json() : await res.text();

      if (!res.ok) {
        const message =
          typeof body === 'string'
            ? body
            : body?.message ?? 'Unable to create a project for inspection.';
        toast.error(message);
        return;
      }

      const created = body as any;
      const projectId = created?.id as string | undefined;

      if (!projectId) {
        toast.error('Unable to create a project for inspection.');
        return;
      }

      if (typeof window !== 'undefined') {
        window.localStorage.setItem('oran_last_project_id', projectId);
      }

      setInspectionProjectId(projectId);
      setInspectionAddress('');
      setInspectionPhone('');
      setInspectionOpen(true);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to start inspection request. Please try again.';
      toast.error(message);
    } finally {
      setRequestingInspection(false);
    }
  };

  const submitInspectionFromOverview = async () => {
    if (!inspectionProjectId) {
      toast.error('Unable to determine which project to use for inspection.');
      return;
    }

    const address = inspectionAddress.trim();
    const phone = inspectionPhone.trim();

    if (!address || !phone) {
      toast.error('Please provide both site address and a phone number for inspection.');
      return;
    }

    try {
      setSubmittingInspection(true);
      const res = await fetch(
        `/api/projects/${encodeURIComponent(inspectionProjectId)}/request-inspection`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            siteAddress: address,
            contactPhone: phone,
          }),
        },
      );

      const isJson =
        res.headers.get('content-type')?.toLowerCase().includes('application/json') ?? false;
      const body = isJson ? await res.json() : await res.text();

      if (!res.ok) {
        const message =
          typeof body === 'string'
            ? body
            : body?.message ?? 'Unable to request site inspection. Please try again.';
        toast.error(message);
        return;
      }

      const fee = Number((body as any)?.inspectionFee ?? 0);
      const region = (body as any)?.inferredRegion ?? 'your location';
      const authorizationUrl = (body as any)
        ?.authorizationUrl as string | undefined;

      toast.success(
        `Inspection requested. Fee: ₦${fee.toLocaleString()} for ${String(
          region,
        ).toLowerCase()}.`,
      );

      if (authorizationUrl) {
        window.location.href = authorizationUrl;
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to request site inspection. Please try again.';
      toast.error(message);
    } finally {
      setSubmittingInspection(false);
    }
  };

  const activeProject = userProjects[0] ?? null;
  const activeCount = userProjects.filter((p) => p.status !== 'COMPLETED').length;
  const completedCount = userProjects.filter((p) => p.status === 'COMPLETED').length;
  const inspectionCount = userProjects.filter((p) =>
    ['INSPECTION_REQUESTED', 'INSPECTION_SCHEDULED', 'INSPECTION_COMPLETED'].includes(
      p.status as ProjectStatus,
    ),
  ).length;

  const formatStatus = (status: string) =>
    status.toLowerCase().replace(/_/g, ' ');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard Overview</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back! Here&apos;s what&apos;s happening with your projects.
        </p>
      </div>

      {/* Team member / inspection CTA */}
      <Card className="border-primary bg-primary/5">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                You need a team member on your project
              </h2>
              <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                Request a site inspection so ORAN can assign a technician, confirm wiring and device
                needs and prepare an inspection-based quote for you.
              </p>
            </div>
            <Button
              size="sm"
              className="self-start md:self-auto"
              disabled={requestingInspection}
              onClick={handleOverviewInspection}
            >
              {requestingInspection ? 'Loading...' : 'Request site inspection'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={inspectionOpen} onOpenChange={setInspectionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a site inspection</DialogTitle>
            <DialogDescription>
              Enter the site address and a representative phone number. ORAN will assign a technician
              and redirect you to Paystack to pay the inspection fee.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <div className="grid gap-2 md:grid-cols-2">
              <p className="text-muted-foreground">
                Lagos sites:{' '}
                <span className="font-semibold text-foreground">₦15,000</span>
              </p>
              <p className="text-muted-foreground">
                South-West near Lagos (e.g. Ogun, Osun, Oyo, Ibadan, Ekiti, Ondo, Kwara):{' '}
                <span className="font-semibold text-foreground">₦30,000</span>
              </p>
              <p className="text-muted-foreground">
                Abuja sites:{' '}
                <span className="font-semibold text-foreground">₦15,000</span>
              </p>
              <p className="text-muted-foreground">
                Other locations:{' '}
                <span className="font-semibold text-foreground">₦100,000</span>
              </p>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-muted-foreground">Site address</span>
                <input
                  className="border rounded-md px-2 py-1 text-xs bg-background w-full"
                  placeholder="Street, area, city and state"
                  value={inspectionAddress}
                  onChange={(event) => setInspectionAddress(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-muted-foreground">
                  Representative phone number
                </span>
                <input
                  className="border rounded-md px-2 py-1 text-xs bg-background w-full"
                  placeholder="Phone number we should call"
                  value={inspectionPhone}
                  onChange={(event) => setInspectionPhone(event.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInspectionOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={submittingInspection}
              onClick={submitInspectionFromOverview}
            >
              {submittingInspection ? 'Submitting...' : 'Continue to payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Active Project Banner */}
      <Card className="border-primary bg-primary/5">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {activeProject ? (
                <>
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-xl font-semibold">{activeProject.name}</h3>
                    <Badge variant="secondary">
                      {formatStatus(activeProject.status)}
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">
                          Installation progress
                        </span>
                        <span className="text-sm font-medium">
                          {/* simple stage-based progress estimate */}
                          {activeProject.status === 'COMPLETED'
                            ? '100%'
                            : activeProject.status === 'IN_PROGRESS'
                              ? '75%'
                              : activeProject.status === 'DOCUMENTS_SIGNED' ||
                                  activeProject.status === 'PAYMENT_PLAN_SELECTED'
                                ? '60%'
                                : activeProject.status === 'QUOTE_SELECTED' ||
                                    activeProject.status === 'QUOTES_GENERATED'
                                  ? '40%'
                                  : activeProject.status.startsWith('INSPECTION')
                                    ? '30%'
                                    : '15%'}
                        </span>
                      </div>
                      <Progress
                        value={
                          activeProject.status === 'COMPLETED'
                            ? 100
                            : activeProject.status === 'IN_PROGRESS'
                              ? 75
                              : activeProject.status === 'DOCUMENTS_SIGNED' ||
                                  activeProject.status === 'PAYMENT_PLAN_SELECTED'
                                ? 60
                                : activeProject.status === 'QUOTE_SELECTED' ||
                                    activeProject.status === 'QUOTES_GENERATED'
                                  ? 40
                                  : activeProject.status.startsWith('INSPECTION')
                                    ? 30
                                    : 15
                        }
                        className="h-2"
                      />
                    </div>
                    <div className="flex items-center space-x-6 text-sm">
                      <div>
                        <span className="text-muted-foreground">Current stage:</span>
                        <span className="font-medium ml-2">
                          {formatStatus(activeProject.status)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Project ID:</span>
                        <span className="font-mono text-[10px] ml-2">
                          {activeProject.id.slice(0, 8)}…
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-2">
                    <p className="text-xs uppercase text-primary font-semibold">
                      Get started
                    </p>
                    <h3 className="text-xl font-semibold">Start your first ORAN project</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3 max-w-md">
                    Once you complete onboarding, your project and documents will appear here so you
                    can follow the full journey from inspection to operations.
                  </p>
                </>
              )}
            </div>
            <div className="flex flex-col items-end gap-3">
              <Link href="/dashboard/projects">
                <Button>
                  View Details <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Stats</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active projects</p>
                  <p className="text-3xl font-bold mt-2">{activeCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {projectsLoading
                      ? 'Loading your projects…'
                      : activeCount === 0
                        ? 'No active projects yet.'
                        : 'Projects currently in progress.'}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FolderKanban className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed projects</p>
                  <p className="text-3xl font-bold mt-2">{completedCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Projects that have reached handover.
                  </p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Site inspections</p>
                  <p className="text-3xl font-bold mt-2">{inspectionCount}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Projects that have an inspection in their journey.
                  </p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Home className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Activity & Projects */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-xs">
              {projectsLoading ? (
                <p className="text-muted-foreground">Loading recent activity…</p>
              ) : userProjects.length === 0 ? (
                <p className="text-muted-foreground">
                  Once you start a project, we&apos;ll show a history of key events here
                  (documents, inspections and payments).
                </p>
              ) : (
                userProjects.slice(0, 4).map((project, index) => {
                  const status = project.status as ProjectStatus;
                  const Icon =
                    status === 'COMPLETED'
                      ? CheckCircle
                      : status.startsWith('INSPECTION')
                        ? Wrench
                        : DollarSign;
                  const iconColor =
                    status === 'COMPLETED'
                      ? 'text-green-500'
                      : status.startsWith('INSPECTION')
                        ? 'text-primary'
                        : 'text-accent';

                  const description =
                    status === 'COMPLETED'
                      ? 'Project completed and handed over.'
                      : status.startsWith('INSPECTION')
                        ? 'Site inspection in progress for this project.'
                        : 'Project is moving through quotes, documents or payments.';

                  return (
                    <div key={project.id}>
                      <div className="flex items-start space-x-3">
                        <div className={`mt-0.5 ${iconColor}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{project.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {description}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            Created{' '}
                            {new Date(project.createdAt).toLocaleDateString(
                              'en-NG',
                              { year: 'numeric', month: 'short', day: 'numeric' },
                            )}
                          </p>
                        </div>
                      </div>
                      {index < Math.min(userProjects.length, 4) - 1 && (
                        <Separator className="my-4" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* All Projects */}
        <Card>
          <CardHeader>
            <CardTitle>All Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              {projectsLoading ? (
                <p className="text-xs text-muted-foreground">
                  Loading your projects…
                </p>
              ) : userProjects.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  You don&apos;t have any projects yet. Start one from the top bar to
                  see it here.
                </p>
              ) : (
                userProjects.map((project, index) => (
                  <div key={project.id}>
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">{project.name}</h4>
                            <Badge
                              variant={
                                project.status === 'COMPLETED'
                                  ? 'default'
                                  : 'secondary'
                              }
                              className={
                                project.status === 'COMPLETED' ? 'bg-accent' : ''
                              }
                            >
                              {formatStatus(project.status)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Started{' '}
                            {new Date(project.createdAt).toLocaleDateString(
                              'en-NG',
                              { year: 'numeric', month: 'short', day: 'numeric' },
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Link
                          href={`/dashboard/projects/${project.id}`}
                          className="flex-1"
                        >
                          <Button variant="outline" size="sm" className="w-full">
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                    {index < userProjects.length - 1 && (
                      <Separator className="my-4" />
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

