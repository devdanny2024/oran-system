'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Separator } from '../../../components/ui/separator';
import { toast } from 'sonner';

type OranUser = {
  id?: string;
  name?: string | null;
  email?: string;
};

type ProjectSummary = {
  id: string;
  userId: string;
  name: string;
  status: string;
  createdAt: string;
};

type Agreement = {
  id: string;
  type: 'MAINTENANCE' | 'SCOPE_OF_WORK' | 'PAYMENT_TERMS';
  title: string;
  acceptedAt?: string | null;
};

export default function DocumentsPage() {
  const router = useRouter();
  const [user, setUser] = useState<OranUser | null>(null);
  const [checking, setChecking] = useState(true);

  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = window.localStorage.getItem('oran_user');
    if (!stored) {
      router.replace('/login');
      return;
    }

    try {
      const parsed = JSON.parse(stored) as OranUser;
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
    if (!user?.id) return;

    const load = async () => {
      try {
        setLoading(true);

        // Try last project id from local storage first.
        let projectId: string | null = null;
        if (typeof window !== 'undefined') {
          projectId = window.localStorage.getItem('oran_last_project_id');
        }

        let selected: ProjectSummary | null = null;

        if (projectId) {
          const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}`);
          const isJson =
            res.headers
              .get('content-type')
              ?.toLowerCase()
              .includes('application/json') ?? false;
          const body = isJson ? await res.json() : await res.text();

          if (res.ok) {
            const ownerId = (body as any)?.userId as string | undefined;
            if (!ownerId || ownerId === user.id) {
              selected = {
                id: (body as any).id,
                userId: ownerId ?? user.id!,
                name: (body as any).name,
                status: (body as any).status,
                createdAt: (body as any).createdAt,
              };
            }
          }
        }

        if (!selected) {
          // Fallback: pick the newest project owned by this user.
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
          const owned = items.filter((p) => p.userId === user.id);
          owned.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() -
              new Date(a.createdAt).getTime(),
          );

          selected = owned[0] ?? null;
        }

        if (!selected) {
          setProject(null);
          setAgreements([]);
          return;
        }

        setProject(selected);

        const agreementsRes = await fetch(
          `/api/projects/${encodeURIComponent(selected.id)}/agreements`,
        );
        const agreementsIsJson =
          agreementsRes.headers
            .get('content-type')
            ?.toLowerCase()
            .includes('application/json') ?? false;
        const agreementsBody = agreementsIsJson
          ? await agreementsRes.json()
          : await agreementsRes.text();

        if (!agreementsRes.ok) {
          const message =
            typeof agreementsBody === 'string'
              ? agreementsBody
              : agreementsBody?.message ??
                'Unable to load your project documents.';
          toast.error(message);
          return;
        }

        const items = ((agreementsBody as any)?.items ?? []) as Agreement[];
        setAgreements(items);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to load your project documents. Please try again.';
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [user]);

  if (checking) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Loading your documents…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Project documents
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review and accept your installation, scope of work and payment terms
          documents for your most recent project.
        </p>
      </div>

      <Card className="p-4 space-y-3 text-sm">
        {loading ? (
          <p className="text-xs text-muted-foreground">
            Loading your documents…
          </p>
        ) : !project ? (
          <p className="text-xs text-muted-foreground">
            You don&apos;t have any projects yet. Once you start a project and
            choose a quote, we&apos;ll prepare documents for you to review here.
          </p>
        ) : agreements.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Once you choose a quote for{' '}
            <span className="font-semibold">{project.name}</span>, ORAN will
            prepare your installation, scope of work and payment terms
            documents as signed PDFs for you to review and accept here.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">
                  Project:{' '}
                  <span className="font-semibold text-foreground">
                    {project.name}
                  </span>
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Created{' '}
                  {new Date(project.createdAt).toLocaleDateString('en-NG', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <Badge variant="secondary" className="text-[11px]">
                {project.status.toLowerCase().replace(/_/g, ' ')}
              </Badge>
            </div>

            <Separator />

            <div className="space-y-2 text-xs">
              {agreements.map((agreement) => {
                const accepted = !!agreement.acceptedAt;
                return (
                  <div
                    key={agreement.id}
                    className="flex flex-wrap items-center justify-between gap-2 border rounded-md px-3 py-2"
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">
                        {agreement.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {accepted
                          ? `Accepted on ${new Date(
                              agreement.acceptedAt!,
                            ).toLocaleString()}`
                          : 'Pending your review and acceptance'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          router.push(
                            `/dashboard/projects/${project.id}#project-documents-section`,
                          )
                        }
                      >
                        Review on project
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

