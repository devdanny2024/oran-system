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

const ALLOWED_ROLES = ['ADMIN', 'TECHNICIAN'];

export default function AdminProjectDetail() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const projectId = params?.id;

  const [checking, setChecking] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

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

    const load = async () => {
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

    void load();
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

        <section>
          <p className="text-xs text-muted-foreground">
            We can later extend this view with AI quotes, payment plans, site
            visits and technician notes for this project.
          </p>
        </section>
      </main>
    </div>
  );
}

