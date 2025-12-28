'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Separator } from '../../../components/ui/separator';
import { toast } from 'sonner';

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
  status: ProjectStatus;
  buildingType: string | null;
  roomsCount: number | null;
  createdAt: string;
  onboarding?: Onboarding | null;
};

type Quote = {
  id: string;
  tier: 'ECONOMY' | 'STANDARD' | 'LUXURY';
  title?: string | null;
  subtotal: number;
  total: number;
  currency: string;
  isSelected: boolean;
  items: { id: string }[];
};

const statusLabel = (status: ProjectStatus) =>
  status.toLowerCase().replace(/_/g, ' ');

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const projectId = params?.id;

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(false);

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
          router.push('/dashboard/projects');
          return;
        }

        setProject(body as Project);

        // Load any quotes that have been generated for this project.
        setQuotesLoading(true);
        try {
          const resQuotes = await fetch(`/api/quotes/project/${projectId}`);
          const isJsonQuotes =
            resQuotes.headers
              .get('content-type')
              ?.toLowerCase()
              .includes('application/json') ?? false;
          const bodyQuotes = isJsonQuotes
            ? await resQuotes.json()
            : await resQuotes.text();
          if (resQuotes.ok) {
            setQuotes((bodyQuotes?.items ?? []) as Quote[]);
          }
        } finally {
          setQuotesLoading(false);
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to load project. Please try again.';
        toast.error(message);
        router.push('/dashboard/projects');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [projectId, router]);

  if (loading || !project) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading project…</p>
      </div>
    );
  }

  const createdDate = new Date(project.createdAt).toLocaleString();
  const onboarding = project.onboarding ?? undefined;
  const features =
    (onboarding?.selectedFeatures as string[] | undefined) ?? undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {project.name}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Created {createdDate}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge>
            {statusLabel(project.status)}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/dashboard/projects')}
          >
            Back to projects
          </Button>
        </div>
      </div>

      <Card className="p-4 space-y-3">
        <h2 className="text-sm font-semibold">Project details</h2>
        <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
          <div>
            <p className="font-medium text-foreground">Building type</p>
            <p>{project.buildingType || 'Not specified yet'}</p>
          </div>
          <div>
            <p className="font-medium text-foreground">Rooms</p>
            <p>{project.roomsCount ?? 'Not specified yet'}</p>
          </div>
        </div>
      </Card>

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
            Onboarding details have not been captured yet.
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
            No feature selections recorded for this project yet.
          </p>
        )}
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Quotes for this project</h2>
          <span className="text-xs text-muted-foreground">
            {quotesLoading
              ? 'Loading quotes...'
              : quotes.length === 0
                ? 'No quotes yet'
                : `${quotes.length} quote${quotes.length > 1 ? 's' : ''}`}
          </span>
        </div>
        {quotesLoading ? (
          <p className="text-xs text-muted-foreground">
            Fetching Economy, Standard and Luxury options...
          </p>
        ) : quotes.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Once your onboarding is complete, ORAN will generate quote options
            using our automation product catalog. You&apos;ll be able to open a
            quote, edit items and choose the package that works best for you.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {quotes.map((quote) => (
              <div
                key={quote.id}
                className="border rounded-md p-3 text-xs flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground text-sm">
                    {quote.title || `${quote.tier.toLowerCase()} package`}
                  </span>
                  <Badge variant="outline" className="uppercase text-[10px]">
                    {quote.tier.toLowerCase()}
                  </Badge>
                </div>
                <Separator className="my-1" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">
                    ₦{quote.subtotal.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-semibold">
                  <span>Total (incl. fees & tax)</span>
                  <span className="text-primary">
                    ₦{quote.total.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>
                    {quote.items.length} items · installation, integration,
                    logistics, misc & tax included
                  </span>
                  {quote.isSelected && <span>Selected</span>}
                </div>
                <Button
                  size="sm"
                  className="mt-1"
                  variant="outline"
                  onClick={() =>
                    router.push(`/dashboard/quotes/${quote.id}`)
                  }
                >
                  View & edit quote
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
