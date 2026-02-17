'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';

type EstimateResponse = {
  resolvedAddress: string | null;
  distanceKm: number | null;
  tier: 'LAGOS' | 'WEST_NEAR' | 'OTHER' | null;
  logisticsEstimate: number | null;
  inspectionEstimate: number | null;
  warning?: string;
};

export default function BookInspectionPage() {
  const [step, setStep] = useState(1);
  const [loadingEstimate, setLoadingEstimate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [buildingType, setBuildingType] = useState('RESIDENTIAL');
  const [roomsCount, setRoomsCount] = useState('5');

  const [estimate, setEstimate] = useState<EstimateResponse | null>(null);
  const [estimateError, setEstimateError] = useState<string | null>(null);

  useEffect(() => {
    if (step !== 2) return;
    const address = siteAddress.trim();
    if (!address) {
      setEstimate(null);
      setEstimateError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingEstimate(true);
      setEstimateError(null);
      try {
        const res = await fetch('/api/pricing/estimate-site', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address }),
        });
        const body = (await res.json()) as EstimateResponse & { message?: string };
        if (!res.ok) {
          setEstimate(null);
          setEstimateError(body?.message ?? 'Unable to estimate inspection fee.');
        } else {
          setEstimate(body);
        }
      } catch (error) {
        setEstimate(null);
        setEstimateError(error instanceof Error ? error.message : 'Unable to estimate inspection fee.');
      } finally {
        setLoadingEstimate(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [step, siteAddress]);

  const canContinue = useMemo(() => {
    return Boolean(fullName.trim() && email.trim() && phone.trim() && siteAddress.trim());
  }, [fullName, email, phone, siteAddress]);

  const submitBooking = async () => {
    if (!canContinue) {
      toast.error('Please complete all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/projects/public/book-inspection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          contactPhone: phone.trim(),
          siteAddress: siteAddress.trim(),
          buildingType,
          roomsCount: Number(roomsCount) || 5,
        }),
      });

      const body = (await res.json()) as {
        message?: string;
        inspectionFee?: number;
        authorizationUrl?: string;
      };

      if (!res.ok) {
        toast.error(body?.message ?? 'Unable to book inspection.');
        return;
      }

      if (!body.authorizationUrl) {
        toast.error('Unable to start payment right now. Please try again.');
        return;
      }

      toast.success(
        `Inspection booking created. Fee: ₦${Number(body.inspectionFee ?? 0).toLocaleString()}`,
      );
      window.location.href = body.authorizationUrl;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to book inspection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image src="/logo.png" alt="ORAN" width={110} height={110} priority />
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/signup"><Button>Build a Package</Button></Link>
            <Link href="/login"><Button variant="outline">Login</Button></Link>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl font-bold text-foreground mb-2">Book Site Inspection</h1>
        <p className="text-muted-foreground mb-2">
          No signup required. Complete details, review your fee, then proceed to payment.
        </p>
        <p className="text-xs text-muted-foreground mb-8">
          After successful payment, ORAN admin is notified and you receive confirmation by email.
        </p>

        <Card className="p-6 space-y-6">
          <div className="text-xs text-muted-foreground">Step {step} of 3</div>

          {step === 1 && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-xs text-muted-foreground">Full name</label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Email</label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Phone number</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="080..." />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-muted-foreground">Site address</label>
                <Input value={siteAddress} onChange={(e) => setSiteAddress(e.target.value)} placeholder="Street, area, city and state" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Building type</label>
                <Input value={buildingType} onChange={(e) => setBuildingType(e.target.value)} placeholder="RESIDENTIAL" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Rooms</label>
                <Input value={roomsCount} onChange={(e) => setRoomsCount(e.target.value)} placeholder="5" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-2 text-sm">
              {loadingEstimate && <p className="text-muted-foreground">Calculating fee...</p>}
              {estimateError && <p className="text-red-500">{estimateError}</p>}
              {estimate?.warning && <p className="text-amber-600">{estimate.warning}</p>}
              <p>Resolved address: <strong>{estimate?.resolvedAddress || '—'}</strong></p>
              <p>Distance from base: <strong>{estimate?.distanceKm != null ? `${estimate.distanceKm} km` : '—'}</strong></p>
              <p>Pricing tier: <strong>{estimate?.tier || '—'}</strong></p>
              <p>Estimated inspection fee: <strong>{estimate?.inspectionEstimate != null ? `₦${estimate.inspectionEstimate.toLocaleString()}` : '—'}</strong></p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-2 text-sm">
              <p>Please confirm and continue to payment.</p>
              <p>Name: <strong>{fullName}</strong></p>
              <p>Email: <strong>{email}</strong></p>
              <p>Phone: <strong>{phone}</strong></p>
              <p>Address: <strong>{siteAddress}</strong></p>
              <p>Estimated fee: <strong>{estimate?.inspectionEstimate != null ? `₦${estimate.inspectionEstimate.toLocaleString()}` : 'Will be computed at checkout'}</strong></p>
              <p className="text-xs text-muted-foreground">
                After successful payment, ORAN admin gets notified and your confirmation email is sent automatically.
              </p>
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="ghost" disabled={step === 1 || submitting} onClick={() => setStep((s) => Math.max(1, s - 1))}>Back</Button>
            {step < 3 ? (
              <Button disabled={(step === 1 && !canContinue) || submitting} onClick={() => setStep((s) => Math.min(3, s + 1))}>Continue</Button>
            ) : (
              <Button disabled={submitting} onClick={submitBooking}>{submitting ? 'Processing...' : 'Pay & Book Inspection'}</Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
