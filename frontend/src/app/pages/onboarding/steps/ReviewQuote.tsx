import { Card } from '../../../components/ui/card';
import { Separator } from '../../../components/ui/separator';
import { Badge } from '../../../components/ui/badge';
import { CheckCircle, Loader2 } from 'lucide-react';
import { OnboardingData } from '../OnboardingFlow';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { postJson } from '../../../lib/api';

interface Props {
  data: OnboardingData;
  updateData: (data: Partial<OnboardingData>) => void;
}

type QuoteItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

type Quote = {
  id: string;
  tier: 'ECONOMY' | 'STANDARD' | 'LUXURY';
  title?: string | null;
  subtotal: number;
  total: number;
  currency: string;
  items: QuoteItem[];
};

export default function ReviewQuote({ data }: Props) {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const id = window.localStorage.getItem('oran_last_project_id');
    if (id) setProjectId(id);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadQuotes = async () => {
      if (!projectId) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/quotes/project/${projectId}`);
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
              : body?.message ?? 'Unable to load quotes yet.';
          toast.error(message);
        } else {
          setQuotes((body?.items ?? []) as Quote[]);
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unable to load quotes yet.';
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    void loadQuotes();
  }, [projectId]);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Review Your Requirements</h1>
        <p className="text-muted-foreground">
          Here&apos;s what we gathered from your selections
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-8">
        {/* Requirements Summary */}
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">Project Summary</h3>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-muted-foreground">Project Type:</span>
              <p className="font-medium capitalize">
                {data.projectStatus || 'Not specified'}
              </p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Building Type:</span>
              <p className="font-medium capitalize">
                {data.buildingType || 'Not specified'}
              </p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Rooms:</span>
              <p className="font-medium">{data.roomCount} rooms</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Selected Features:</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {data.selectedFeatures && data.selectedFeatures.length > 0 ? (
                  data.selectedFeatures.map((feature) => (
                    <Badge key={feature} variant="secondary" className="capitalize">
                      {feature}
                    </Badge>
                  ))
                ) : (
                  <p className="text-muted-foreground">No features selected</p>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Quote Generation */}
        <Card className="p-6">
          {loading ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <h3 className="font-semibold text-lg">
                  Generating your custom quote...
                </h3>
              </div>
              <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-accent" />
                  <span>Analyzing room specifications</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-accent" />
                  <span>Calculating product requirements</span>
                </div>
                <div className="flex items-center space-x-2 opacity-80">
                  <CheckCircle className="h-4 w-4 text-accent" />
                  <span>Optimizing installation costs</span>
                </div>
              </div>
            </div>
          ) : quotes.length === 0 ? (
            <div>
              <h3 className="font-semibold text-lg mb-4">Quotes will appear here</h3>
              <p className="text-sm text-muted-foreground">
                After you finish onboarding, ORAN will generate Economy, Standard and
                Luxury quote options using our automation product catalog.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Your AI-generated quote options</h3>
              <p className="text-xs text-muted-foreground">
                Pick a starting point now. You can still open the quote afterwards to
                adjust quantities, remove items or add extra products before we finalize.
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                {quotes.map((quote) => (
                  <div
                    key={quote.id}
                    className="border rounded-lg p-4 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">
                        {quote.title || `${quote.tier.toLowerCase()} package`}
                      </span>
                      <Badge variant="outline" className="uppercase text-[10px]">
                        {quote.tier.toLowerCase()}
                      </Badge>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">
                        ₦{quote.subtotal.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-bold">
                      <span>Total</span>
                      <span className="text-primary">
                        ₦{quote.total.toLocaleString()}
                      </span>
                    </div>
                    <Separator className="my-2" />
                    <div className="text-[11px] text-muted-foreground flex justify-between">
                      <span>{quote.items.length} line items</span>
                      <span>Fully editable after you continue</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
