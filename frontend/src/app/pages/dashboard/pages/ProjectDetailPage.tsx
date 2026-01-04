'use client';
import { useEffect, useRef, useState } from 'react';
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
  const [agreements, setAgreements] = useState<
    {
      id: string;
      type: 'MAINTENANCE' | 'SCOPE_OF_WORK' | 'PAYMENT_TERMS';
      title: string;
      acceptedAt?: string | null;
    }[]
  >([]);
  const [paymentPlan, setPaymentPlan] = useState<{
    id?: string;
    type?: 'MILESTONE_3' | 'EIGHTY_TEN_TEN';
  } | null>(null);
  const [paymentPlanSelection, setPaymentPlanSelection] = useState<
    'MILESTONE_3' | 'EIGHTY_TEN_TEN' | ''
  >('');
  const [savingPaymentPlan, setSavingPaymentPlan] = useState(false);
  const [milestones, setMilestones] = useState<
    {
      id: string;
      index: number;
      title: string;
      description?: string | null;
      percentage: number;
      amount: number;
      status: 'PENDING' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';
    }[]
  >([]);
  const [trips, setTrips] = useState<
    {
      id: string;
      status: string;
      scheduledFor: string;
      checkInAt?: string | null;
      checkOutAt?: string | null;
      notes?: string | null;
      reworkReason?: string | null;
      technician?: {
        id: string;
        name: string | null;
        email: string;
      } | null;
      tasks?: {
        id: string;
        label: string;
        sequence: number;
        isDone: boolean;
      }[];
      photos?: {
        id: string;
        url: string;
        caption?: string | null;
      }[];
    }[]
  >([]);

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

        // Load project agreements (documents).
        try {
          const resAgreements = await fetch(
            `/api/projects/${projectId}/agreements`,
          );
          const isJsonAgreements =
            resAgreements.headers
              .get('content-type')
              ?.toLowerCase()
              .includes('application/json') ?? false;
          const bodyAgreements = isJsonAgreements
            ? await resAgreements.json()
            : await resAgreements.text();
          if (resAgreements.ok) {
            const items =
              ((bodyAgreements as any)?.items ?? []) as {
                id: string;
                type: 'MAINTENANCE' | 'SCOPE_OF_WORK' | 'PAYMENT_TERMS';
                title: string;
                acceptedAt?: string | null;
              }[];
            if (
              items.length === 0 &&
              (body as any)?.status === 'DOCUMENTS_PENDING'
            ) {
              // Fallback: explicitly ask backend to create agreements
              // in case they were not generated when the quote was selected.
              const resEnsure = await fetch(
                `/api/projects/${projectId}/agreements/ensure`,
                { method: 'POST' },
              );
              const isJsonEnsure =
                resEnsure.headers
                  .get('content-type')
                  ?.toLowerCase()
                  .includes('application/json') ?? false;
              const bodyEnsure = isJsonEnsure
                ? await resEnsure.json()
                : await resEnsure.text();
              if (resEnsure.ok) {
                setAgreements(
                  ((bodyEnsure as any)?.items ?? []) as any[],
                );
              } else {
                setAgreements(items);
              }
            } else {
              setAgreements(items);
            }
          }
        } catch {
          // best effort; ignore if not yet available
        }

        // Load any saved payment plan for this project.
        try {
          const resPlan = await fetch(
            `/api/projects/${projectId}/payment-plan`,
          );
          const isJsonPlan =
            resPlan.headers
              .get('content-type')
              ?.toLowerCase()
              .includes('application/json') ?? false;
          const bodyPlan = isJsonPlan ? await resPlan.json() : await resPlan.text();
          if (resPlan.ok && bodyPlan && typeof bodyPlan === 'object') {
            setPaymentPlan(bodyPlan as any);
            if ((bodyPlan as any).type) {
              setPaymentPlanSelection((bodyPlan as any).type);
            }
          }
        } catch {
          // best effort; ignore failures here
        }

        // Load milestones (if any) for this project.
        try {
          const resMilestones = await fetch(
            `/api/projects/${projectId}/milestones`,
          );
          const isJsonMilestones =
            resMilestones.headers
              .get('content-type')
              ?.toLowerCase()
              .includes('application/json') ?? false;
          const bodyMilestones = isJsonMilestones
            ? await resMilestones.json()
            : await resMilestones.text();
          if (resMilestones.ok) {
            setMilestones(
              ((bodyMilestones as any)?.items ?? []).map((m: any) => ({
                id: m.id as string,
                index: m.index as number,
                title: m.title as string,
                description: (m.description as string) ?? null,
                percentage: m.percentage as number,
                amount: Number(m.amount ?? 0),
                status: m.status as any,
              })),
            );
          }
        } catch {
          // ignore
        }

        // Load trips for this project to give a simple
        // operations view alongside milestones.
        try {
          const resTrips = await fetch(
            `/api/operations/trips?projectId=${projectId}`,
          );
          const isJsonTrips =
            resTrips.headers
              .get('content-type')
              ?.toLowerCase()
              .includes('application/json') ?? false;
          const bodyTrips = isJsonTrips
            ? await resTrips.json()
            : await resTrips.text();
          if (resTrips.ok) {
            setTrips(
              ((bodyTrips as any)?.items ?? []).map((t: any) => ({
                id: t.id as string,
                status: t.status as string,
                scheduledFor: t.scheduledFor as string,
                checkInAt: (t.checkInAt as string) ?? null,
                checkOutAt: (t.checkOutAt as string) ?? null,
                notes: (t.notes as string) ?? null,
              })),
            );
          }
        } catch {
          // ignore
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

  const onboardingFlowToastShownRef = useRef(false);

  useEffect(() => {
    if (!project || onboardingFlowToastShownRef.current) return;

    const selectedQuote = quotes.find((q) => q.isSelected) ?? null;

    type NextStep = {
      label: string;
      cta: string;
      action: () => void;
    };

    let step: NextStep | null = null;

    const scrollToQuotes = () => {
      const el =
        typeof document !== 'undefined'
          ? document.getElementById('project-quotes-section')
          : null;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    if (!project.onboarding || project.status === 'ONBOARDING') {
      step = {
        label:
          'Finish your onboarding so ORAN can generate tailored quotes for this project.',
        cta: 'Continue onboarding',
        action: () => {
          router.push('/onboarding');
        },
      };
    } else if (!selectedQuote && project.status === 'QUOTES_GENERATED') {
      if (quotes.length > 0) {
        step = {
          label:
            'Open a quote to review Economy, Standard or Luxury options and pick a starting point.',
          cta: 'Review quote options',
          action: scrollToQuotes,
        };
      }
    } else {
      const documentsAccepted =
        agreements.length > 0 && agreements.every((a) => !!a.acceptedAt);
      const nextMilestone =
        milestones.find((m) => m.status === 'PENDING') ?? null;
      const effectiveSelection =
        (paymentPlanSelection || paymentPlan?.type || '') as
          | 'MILESTONE_3'
          | 'EIGHTY_TEN_TEN'
          | '';

      if (!documentsAccepted) {
        step = {
          label:
            'Review and accept your installation, scope of work and payment terms documents.',
          cta: 'Review documents',
          action: () => {
            const el =
              typeof document !== 'undefined'
                ? document.getElementById('project-documents-section')
                : null;
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          },
        };
      } else if (!effectiveSelection) {
        step = {
          label:
            'Choose your payment style so ORAN knows how to structure milestones and invoices.',
          cta: 'Choose payment plan',
          action: () => {
            const el =
              typeof document !== 'undefined'
                ? document.getElementById('payment-plan-section')
                : null;
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          },
        };
      } else if (nextMilestone) {
        step = {
          label: `Pay milestone ${nextMilestone.index} to move this project into live operations.`,
          cta: 'Pay next milestone',
          action: async () => {
            try {
              const res = await fetch(
                `/api/projects/${project.id}/milestones/${nextMilestone.id}/paystack/initialize`,
                { method: 'POST' },
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
                    : body?.message ??
                      'Unable to start payment. Please try again.';
                toast.error(message);
                return;
              }

              const authorizationUrl = (body as any)
                ?.authorizationUrl as string | undefined;
              if (!authorizationUrl) {
                toast.error(
                  'Payment initialised but no authorization URL was returned.',
                );
                return;
              }

              window.location.href = authorizationUrl;
            } catch (error) {
              const message =
                error instanceof Error
                  ? error.message
                  : 'Unable to start payment. Please try again.';
              toast.error(message);
            }
          },
        };
      }
    }

    if (!step) return;

    onboardingFlowToastShownRef.current = true;

    toast.custom(
      (id) => (
        <div className="rounded-md border bg-background px-4 py-3 shadow-lg text-xs md:text-sm max-w-sm flex items-start gap-3">
          <div className="flex-1">
            <p className="font-semibold text-foreground">Next step</p>
            <p className="text-muted-foreground mt-1">{step!.label}</p>
          </div>
          <div className="flex flex-col gap-1">
            <Button
              size="sm"
              className="whitespace-nowrap"
              onClick={() => {
                toast.dismiss(id);
                step!.action();
              }}
            >
              {step!.cta}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-muted-foreground"
              onClick={() => toast.dismiss(id)}
            >
              Ã—
            </Button>
          </div>
        </div>
      ),
      { duration: 12000 },
    );
  }, [
    project,
    quotes,
    agreements,
    paymentPlan,
    paymentPlanSelection,
    milestones,
    router,
  ]);

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
  const allDocumentsAccepted =
    agreements.length > 0 && agreements.every((a) => !!a.acceptedAt);
  const nextPayableMilestone =
    milestones.find((m) => m.status === 'PENDING') ?? null;
  const effectivePaymentPlanSelection =
    (paymentPlanSelection || paymentPlan?.type || '') as
      | 'MILESTONE_3'
      | 'EIGHTY_TEN_TEN'
      | '';

  const nextStepForCard:
    | {
        label: string;
        cta: string;
        action: () => void;
      }
    | null = (() => {
    let step: {
      label: string;
      cta: string;
      action: () => void;
    } | null = null;

    const selectedQuote = quotes.find((q) => q.isSelected) ?? null;

    const scrollToQuotes = () => {
      const el =
        typeof document !== 'undefined'
          ? document.getElementById('project-quotes-section')
          : null;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    if (!onboarding || project.status === 'ONBOARDING') {
      step = {
        label:
          'Finish your onboarding so ORAN can generate tailored quotes for this project.',
        cta: 'Continue onboarding',
        action: () => {
          router.push('/onboarding');
        },
      };
    } else if (!selectedQuote && project.status === 'QUOTES_GENERATED') {
      if (quotes.length > 0) {
        step = {
          label:
            'Open a quote to review Economy, Standard or Luxury options and pick a starting point.',
          cta: 'Review quote options',
          action: scrollToQuotes,
        };
      }
    } else if (!allDocumentsAccepted) {
      step = {
        label:
          'Review and accept your installation, scope of work and payment terms documents.',
        cta: 'Review documents',
        action: () => {
          const el =
            typeof document !== 'undefined'
              ? document.getElementById('project-documents-section')
              : null;
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        },
      };
    } else if (!effectivePaymentPlanSelection) {
      step = {
        label:
          'Choose your payment style so ORAN knows how to structure milestones and invoices.',
        cta: 'Choose payment plan',
        action: () => {
          const el =
            typeof document !== 'undefined'
              ? document.getElementById('payment-plan-section')
              : null;
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        },
      };
    } else if (nextPayableMilestone) {
      step = {
        label: `Pay milestone ${nextPayableMilestone.index} to move this project into live operations.`,
        cta: 'Pay next milestone',
        action: async () => {
          try {
            const res = await fetch(
              `/api/projects/${project.id}/milestones/${nextPayableMilestone.id}/paystack/initialize`,
              { method: 'POST' },
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
                  : body?.message ??
                    'Unable to start payment. Please try again.';
              toast.error(message);
              return;
            }

            const authorizationUrl = (body as any)
              ?.authorizationUrl as string | undefined;
            if (!authorizationUrl) {
              toast.error(
                'Payment initialised but no authorization URL was returned.',
              );
              return;
            }

            window.location.href = authorizationUrl;
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : 'Unable to start payment. Please try again.';
            toast.error(message);
          }
        },
      };
    }

    return step;
  })();

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

      {nextStepForCard && (
        <Card className="border-primary bg-primary/5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Next step
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {nextStepForCard.label}
              </p>
            </div>
            <Button
              onClick={nextStepForCard.action}
              className="self-start md:self-auto"
            >
              {nextStepForCard.cta}
            </Button>
          </div>
        </Card>
      )}

      <Card
        id="payment-plan-section"
        className="p-4 space-y-3"
      >
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

      {milestones.length > 0 && (
        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-semibold">Milestone breakdown</h2>
          <p className="text-xs text-muted-foreground">
            ORAN has broken your project into three milestones with their own
            amounts. As you move into operations, we&apos;ll track each
            milestone&apos;s progress here.
          </p>
          <div className="space-y-2 text-xs">
            {milestones.map((m) => (
              <div
                key={m.id}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border rounded-md px-3 py-2"
              >
                <div>
                  <p className="font-medium text-foreground">
                    Milestone {m.index}: {m.title}
                  </p>
                  {m.description && (
                    <p className="text-[11px] text-muted-foreground">
                      {m.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4 text-[11px] md:text-xs">
                  <span className="text-muted-foreground">
                    {m.percentage}% of project
                  </span>
                  <span className="font-semibold text-primary">
                    ₦{m.amount.toLocaleString()}
                  </span>
                  <span className="text-muted-foreground capitalize">
                    Status: {m.status.toLowerCase().replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {milestones.length > 0 && (
        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-semibold">Project summary & payment</h2>
          <p className="text-xs text-muted-foreground">
            Review your overall project cost and the next milestone payment.
            When you click &quot;Make payment now&quot; you&apos;ll be redirected
            to Paystack&apos;s secure checkout using your selected payment plan.
          </p>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-xs">
            <div className="space-y-1">
              <p className="font-medium text-foreground">Selected quote total</p>
              {quotes.length > 0 ? (
                <p>
                  ₦
                  {(
                    quotes.find((q) => q.isSelected)?.total ?? quotes[0].total
                  ).toLocaleString()}
                </p>
              ) : (
                <p className="text-muted-foreground">No quote selected yet.</p>
              )}
              {paymentPlanSelection && (
                <p className="text-[11px] text-muted-foreground">
                  Payment plan:{' '}
                  {paymentPlanSelection === 'MILESTONE_3'
                    ? '3 milestone payments'
                    : '80 / 10 / 10 plan'}
                </p>
              )}
            </div>
            {nextPayableMilestone ? (
              <div className="flex flex-col md:items-end gap-1 text-xs">
                <p className="font-medium text-foreground">
                  Next payment: Milestone {nextPayableMilestone.index}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {nextPayableMilestone.title} ·{' '}
                  {nextPayableMilestone.percentage}% of project
                </p>
                <p className="font-semibold text-primary">
                  ₦{nextPayableMilestone.amount.toLocaleString()}
                </p>
                <Button
                  size="sm"
                  className="mt-1"
                  onClick={async () => {
                    try {
                      const res = await fetch(
                        `/api/projects/${project.id}/milestones/${nextPayableMilestone.id}/paystack/initialize`,
                        { method: 'POST' },
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
                            : body?.message ??
                              'Unable to start payment. Please try again.';
                        toast.error(message);
                        return;
                      }

                      const authorizationUrl = (body as any)
                        ?.authorizationUrl as string | undefined;
                      if (!authorizationUrl) {
                        toast.error(
                          'Payment initialised but no authorization URL was returned.',
                        );
                        return;
                      }

                      window.location.href = authorizationUrl;
                    } catch (error) {
                      const message =
                        error instanceof Error
                          ? error.message
                          : 'Unable to start payment. Please try again.';
                      toast.error(message);
                    }
                  }}
                >
                  Make payment now
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                All milestones have been marked as completed for this project.
              </p>
            )}
          </div>
        </Card>
      )}

      {trips.length > 0 && (
        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-semibold">Field operations</h2>
          <p className="text-xs text-muted-foreground">
            Upcoming and completed technician visits for this project. In the
            future these will be linked directly to milestones.
          </p>
          <div className="space-y-2 text-xs">
            {trips.map((trip) => {
              const tasks = Array.isArray(trip.tasks) ? trip.tasks : [];
              const totalTasks = tasks.length;
              const completedTasks = tasks.filter((t) => t.isDone).length;
              const photos = Array.isArray(trip.photos) ? trip.photos : [];

              return (
                <div
                  key={trip.id}
                  className="flex flex-col gap-2 border rounded-md px-3 py-2"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">
                        Visit on{' '}
                        {new Date(trip.scheduledFor).toLocaleString()}
                      </p>
                      {trip.notes && (
                        <p className="text-[11px] text-muted-foreground">
                          {trip.notes}
                        </p>
                      )}
                      {trip.technician?.name && (
                        <p className="text-[11px] text-muted-foreground">
                          Technician: {trip.technician.name}
                        </p>
                      )}
                      {trip.checkOutAt && trip.status !== 'COMPLETED' && (
                        <p className="text-[11px] text-amber-700">
                          This visit has been reopened for follow-up work.
                        </p>
                      )}
                      {trip.reworkReason && (
                        <p className="text-[11px] text-muted-foreground">
                          Reason: {trip.reworkReason}
                        </p>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground md:text-right space-y-1">
                      <p>
                        Status:{' '}
                        {trip.status.toLowerCase().replace(/_/g, ' ')}
                      </p>
                      {totalTasks > 0 && (
                        <p>
                          Tasks: {completedTasks}/{totalTasks} complete
                        </p>
                      )}
                      {trip.checkInAt && (
                        <p>
                          Checked in:{' '}
                          {new Date(trip.checkInAt).toLocaleString()}
                        </p>
                      )}
                      {trip.checkOutAt && (
                        <p>
                          Checked out:{' '}
                          {new Date(trip.checkOutAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  {photos.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {photos.slice(0, 4).map((photo) => (
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
        </Card>
      )}

      <Card
        id="project-documents-section"
        className="p-4 space-y-3"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Project documents</h2>
          <span className="text-xs text-muted-foreground">
            {project.status === 'DOCUMENTS_SIGNED'
              ? 'All agreements accepted'
              : project.status === 'DOCUMENTS_PENDING'
                ? 'Awaiting your acceptance'
                : 'Generated after you choose a quote'}
          </span>
        </div>
        {agreements.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Once you choose a quote, ORAN will prepare your installation,
            scope of work and payment terms documents as signed PDFs for you
            to review and accept here.
          </p>
        ) : (
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
                      onClick={() => {
                        const directUrl = `http://ec2-51-20-60-80.eu-north-1.compute.amazonaws.com:4000/projects/${project.id}/agreements/${agreement.id}/pdf`;
                        window.open(directUrl, '_blank');
                      }}
                    >
                      {accepted ? 'View signed copy' : 'View PDF'}
                    </Button>
                    <Button
                      size="sm"
                      disabled={accepted}
                      onClick={async () => {
                        try {
                          const stored =
                            typeof window !== 'undefined'
                              ? window.localStorage.getItem('oran_user')
                              : null;
                          const user =
                            stored && JSON.parse(stored as string);
                          const userId = user?.id as string | undefined;
                          if (!userId) {
                            toast.error(
                              'Please log in again to accept documents.',
                            );
                            return;
                          }

                          const res = await fetch(
                            `/api/projects/${project.id}/agreements/${agreement.id}/accept`,
                            {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ userId }),
                            },
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
                                : body?.message ??
                                  'Unable to accept document.';
                            toast.error(message);
                            return;
                          }

                          toast.success('Document accepted.');
                          // Mark this agreement as accepted locally so the
                          // UI updates immediately without clearing the card.
                          setAgreements((prev) => {
                            const updated = prev.map((a) =>
                              a.id === agreement.id
                                ? { ...a, acceptedAt: new Date().toISOString() }
                                : a,
                            );

                            const allAccepted = updated.every(
                              (a) => !!a.acceptedAt,
                            );

                            if (
                              allAccepted &&
                              project.status !== 'DOCUMENTS_SIGNED'
                            ) {
                              setProject({
                                ...project,
                                status: 'DOCUMENTS_SIGNED',
                              });
                            }

                            return updated;
                          });
                        } catch (error) {
                          const message =
                            error instanceof Error
                              ? error.message
                              : 'Unable to accept document. Please try again.';
                          toast.error(message);
                        }
                      }}
                    >
                      {accepted ? 'Accepted' : 'I agree'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card
        id="project-quotes-section"
        className="p-4 space-y-3"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Payment plan</h2>
          <span className="text-xs text-muted-foreground">
            {project.status === 'PAYMENT_PLAN_SELECTED'
              ? 'Payment plan selected (you can still change it)'
              : allDocumentsAccepted || project.status === 'DOCUMENTS_SIGNED'
                ? 'Choose your preferred payment style'
                : 'Available after you accept all documents'}
          </span>
        </div>

        {!allDocumentsAccepted &&
        project.status !== 'DOCUMENTS_SIGNED' &&
        project.status !== 'PAYMENT_PLAN_SELECTED' ? (
          <p className="text-xs text-muted-foreground">
            Once you have reviewed and accepted your project documents, you&apos;ll
            be able to choose the payment style that works best for you here.
          </p>
        ) : (
          <>
            <div className="space-y-2 text-xs">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  className="mt-[3px]"
                  name="payment-plan"
                  value="MILESTONE_3"
                  disabled={
                    !allDocumentsAccepted &&
                    project.status !== 'DOCUMENTS_SIGNED' &&
                    project.status !== 'PAYMENT_PLAN_SELECTED'
                  }
                  checked={effectivePaymentPlanSelection === 'MILESTONE_3'}
                  onChange={() => setPaymentPlanSelection('MILESTONE_3')}
                />
                <div>
                  <p className="font-medium text-foreground">
                    3 milestone payments
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Split your payment into three agreed milestones (for example:
                    mobilisation, installation and final handover). Exact
                    percentages can be customised later.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  className="mt-[3px]"
                  name="payment-plan"
                  value="EIGHTY_TEN_TEN"
                  disabled={
                    !allDocumentsAccepted &&
                    project.status !== 'DOCUMENTS_SIGNED' &&
                    project.status !== 'PAYMENT_PLAN_SELECTED'
                  }
                  checked={effectivePaymentPlanSelection === 'EIGHTY_TEN_TEN'}
                  onChange={() => setPaymentPlanSelection('EIGHTY_TEN_TEN')}
                />
                <div>
                  <p className="font-medium text-foreground">
                    80 / 10 / 10 plan
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    80% on agreement, 10% during installation and 10% on
                    completion. A good fit when you want most of the cost locked
                    in up front but still keep some tied to delivery.
                  </p>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-[11px] text-muted-foreground">
                By clicking &quot;I agree to this payment plan&quot; you confirm that
                this payment style will govern how ORAN invoices you for this
                project.
              </p>
              <Button
                size="sm"
                disabled={
                  savingPaymentPlan || !effectivePaymentPlanSelection
                }
                onClick={async () => {
                  const selection =
                    paymentPlanSelection || paymentPlan?.type || '';
                  if (!selection) {
                    toast.error('Please select a payment style first.');
                    return;
                  }
                  try {
                    setSavingPaymentPlan(true);
                    const res = await fetch(
                      `/api/projects/${project.id}/payment-plan`,
                      {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type: selection }),
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
                          : body?.message ??
                            'Unable to save payment plan. Please try again.';
                      toast.error(message);
                      return;
                    }

                    toast.success('Payment plan saved.');
                    setPaymentPlan(body as any);
                    if ((body as any)?.type) {
                      setPaymentPlanSelection((body as any).type);
                    }
                    setProject({
                      ...project,
                      status: 'PAYMENT_PLAN_SELECTED',
                    });

                    // Refresh milestones so the next payable milestone
                    // matches the newly saved payment plan.
                    try {
                      const resMilestones = await fetch(
                        `/api/projects/${project.id}/milestones`,
                      );
                      const isJsonMilestones =
                        resMilestones.headers
                          .get('content-type')
                          ?.toLowerCase()
                          .includes('application/json') ?? false;
                      const bodyMilestones = isJsonMilestones
                        ? await resMilestones.json()
                        : await resMilestones.text();
                      if (resMilestones.ok) {
                        setMilestones(
                          ((bodyMilestones as any)?.items ?? []).map(
                            (m: any) => ({
                              id: m.id as string,
                              index: m.index as number,
                              title: m.title as string,
                              description: (m.description as string) ?? null,
                              percentage: m.percentage as number,
                              amount: Number(m.amount ?? 0),
                              status: m.status as any,
                            }),
                          ),
                        );
                      }
                    } catch {
                      // best effort; if this fails, the user can refresh
                      // the page to see updated milestones.
                    }
                  } catch (error) {
                    const message =
                      error instanceof Error
                        ? error.message
                        : 'Unable to save payment plan. Please try again.';
                    toast.error(message);
                  } finally {
                    setSavingPaymentPlan(false);
                  }
                }}
              >
                {savingPaymentPlan
                  ? 'Saving...'
                  : project.status === 'PAYMENT_PLAN_SELECTED'
                    ? 'Update payment plan'
                    : 'I agree to this payment plan'}
              </Button>
            </div>
          </>
        )}
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

