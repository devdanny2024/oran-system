'use client';

import { useEffect, useState } from 'react';
import { Card } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { OnboardingData } from '../OnboardingFlow';

interface Props {
  data: OnboardingData;
  updateData: (data: Partial<OnboardingData>) => void;
}

type EstimateResponse = {
  resolvedAddress: string | null;
  distanceKm: number | null;
  tier: 'LAGOS' | 'WEST_NEAR' | 'OTHER' | null;
  logisticsEstimate: number | null;
  inspectionEstimate: number | null;
  warning?: string;
};

export default function SiteDetails({ data, updateData }: Props) {
  const [estimate, setEstimate] = useState<EstimateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const address = (data.siteAddress ?? '').trim();
    if (!address) {
      setEstimate(null);
      setError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/pricing/estimate-site', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address }),
        });
        const body = (await res.json()) as EstimateResponse & { message?: string };
        if (!res.ok) {
          setError(body?.message ?? 'Unable to calculate site estimate.');
          setEstimate(null);
        } else {
          setEstimate(body);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unable to calculate site estimate.');
        setEstimate(null);
      } finally {
        setLoading(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [data.siteAddress]);

  const mapsPreviewUrl = data.siteAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.siteAddress)}`
    : null;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">
          Where will we be installing ORAN?
        </h1>
        <p className="text-muted-foreground">
          Share the project address and the best phone number to reach you on
          installation days.
        </p>
      </div>

      <Card className="p-6 space-y-4 max-w-2xl mx-auto">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Site address
          </label>
          <p className="text-xs text-muted-foreground">
            Address is linked to Google Maps for logistics/inspection estimates.
          </p>
          <Textarea
            rows={3}
            placeholder="Example: 12 Admiralty Way, Lekki Phase 1, Lagos"
            value={data.siteAddress ?? ''}
            onChange={(e) => updateData({ siteAddress: e.target.value })}
          />
        </div>

        {mapsPreviewUrl && (
          <div className="rounded-md border p-3 text-xs space-y-1">
            <a href={mapsPreviewUrl} target="_blank" className="text-primary underline" rel="noreferrer">
              Open address in Google Maps
            </a>
            {loading && <p className="text-muted-foreground">Calculating live distance and cost...</p>}
            {error && <p className="text-red-500">{error}</p>}
            {estimate?.warning && <p className="text-amber-600">{estimate.warning}</p>}
            <p className="text-muted-foreground">
              Resolved address: {estimate?.resolvedAddress || '—'}
            </p>
            <p className="text-muted-foreground">
              Distance from ORAN base: {estimate?.distanceKm ? `~${estimate.distanceKm} km` : '—'}
            </p>
            <p className="text-muted-foreground">
              Pricing tier: {estimate?.tier || '—'}
            </p>
            <p className="text-muted-foreground">
              Estimated logistics cost: {estimate?.logisticsEstimate ? `₦${estimate.logisticsEstimate.toLocaleString()}` : '—'}
            </p>
            <p className="text-muted-foreground">
              Estimated inspection cost: {estimate?.inspectionEstimate ? `₦${estimate.inspectionEstimate.toLocaleString()}` : '—'}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Contact phone number on site
          </label>
          <p className="text-xs text-muted-foreground">
            We&apos;ll use this to coordinate technicians and deliveries.
          </p>
          <Input
            type="tel"
            placeholder="Example: +234 801 234 5678"
            value={data.contactPhone ?? ''}
            onChange={(e) => updateData({ contactPhone: e.target.value })}
          />
        </div>
      </Card>
    </div>
  );
}
