'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Progress } from '../../components/ui/progress';
import { Button } from '../../components/ui/button';
import ProjectStatus from './steps/ProjectStatus';
import BuildingType from './steps/BuildingType';
import RoomCount from './steps/RoomCount';
import FeatureSelection from './steps/FeatureSelection';
import SiteDetails from './steps/SiteDetails';
import ReviewQuote from './steps/ReviewQuote';
import { postJson } from '../../lib/api';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';

type EstimateResponse = {
  resolvedAddress: string | null;
  distanceKm: number | null;
  tier: 'LAGOS' | 'WEST_NEAR' | 'OTHER' | null;
  logisticsEstimate: number | null;
  inspectionEstimate: number | null;
  warning?: string;
};

export interface OnboardingData {
  projectStatus: string;
  constructionStage?: string;
  needsInspection?: boolean;
  buildingType: string;
  roomCount: number;
  selectedFeatures: string[];
  stairSteps?: number;
  siteAddress?: string;
  contactPhone?: string;
}

export default function OnboardingFlow() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 6;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userDisplayName, setUserDisplayName] = useState<string>('');
  const [data, setData] = useState<OnboardingData>({
    projectStatus: '',
    buildingType: '',
    roomCount: 5,
    selectedFeatures: []
  });
  const [inspectionOpen, setInspectionOpen] = useState(false);
  const [inspectionAddress, setInspectionAddress] = useState('');
  const [inspectionPhone, setInspectionPhone] = useState('');
  const [inspectionEstimate, setInspectionEstimate] = useState<EstimateResponse | null>(null);
  const [inspectionEstimateLoading, setInspectionEstimateLoading] = useState(false);
  const [inspectionEstimateError, setInspectionEstimateError] = useState<string | null>(null);
  const [submittingInspection, setSubmittingInspection] = useState(false);

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
    } catch {
      // ignore parse errors
    }
  }, []);

  const finalizeOnboarding = async () => {
    if (!userId) {
      toast.error('Please log in again to finish onboarding.');
      router.push('/login');
      return;
    }

    setIsSubmitting(true);

    try {
      let currentProjectId = projectId;

      if (!currentProjectId) {
        const displayName = userDisplayName?.trim();
        const projectName = displayName
          ? `${displayName}'s ORAN Smart Home Project`
          : 'My ORAN Smart Home Project';

        const projectResult = await postJson<
          { id: string },
          {
            name: string;
            userId: string;
            buildingType?: string;
            roomsCount?: number;
          }
        >('/projects', {
          name: projectName,
          userId,
          buildingType: data.buildingType,
          roomsCount: data.roomCount,
        });

        if (!projectResult.ok) {
          toast.error(projectResult.error);
          setIsSubmitting(false);
          return;
        }

        currentProjectId = projectResult.data.id;
        setProjectId(currentProjectId);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(
            'oran_last_project_id',
            projectResult.data.id,
          );
        }
      }

      const onboardingResult = await postJson<
        unknown,
        {
          projectId: string;
          projectStatus: string;
          constructionStage?: string;
          needsInspection?: boolean;
          selectedFeatures?: string[];
          stairSteps?: number;
          siteAddress?: string;
          contactPhone?: string;
        }
      >('/onboarding', {
        projectId: currentProjectId,
        projectStatus: data.projectStatus,
        constructionStage: data.constructionStage,
        needsInspection: data.needsInspection ?? false,
        selectedFeatures: data.selectedFeatures,
        stairSteps: data.stairSteps,
        siteAddress: data.siteAddress,
        contactPhone: data.contactPhone,
      });

      if (!onboardingResult.ok) {
        toast.error(onboardingResult.error);
        setIsSubmitting(false);
        return;
      }

      // Generate AI-backed quotes for this project.
      const quotesResult = await postJson<
        { items: unknown[] },
        { projectId: string }
      >('/quotes/generate', {
        projectId: currentProjectId,
      });

      if (!quotesResult.ok) {
        toast.error(
          quotesResult.error ||
            'We captured your project, but could not generate quotes yet.',
        );
      } else {
        toast.success('Your project has been captured and quotes generated.');
      }

      if (currentProjectId) {
        router.push(`/dashboard/projects/${currentProjectId}`);
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to complete onboarding. Please try again.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!inspectionOpen) return;

    const address = inspectionAddress.trim();
    if (!address) {
      setInspectionEstimate(null);
      setInspectionEstimateError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setInspectionEstimateLoading(true);
      setInspectionEstimateError(null);
      try {
        const res = await fetch('/api/pricing/estimate-site', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address }),
        });

        const body = (await res.json()) as EstimateResponse & { message?: string };
        if (!res.ok) {
          setInspectionEstimate(null);
          setInspectionEstimateError(body?.message ?? 'Unable to calculate inspection fee.');
        } else {
          setInspectionEstimate(body);
        }
      } catch (error) {
        setInspectionEstimate(null);
        setInspectionEstimateError(
          error instanceof Error ? error.message : 'Unable to calculate inspection fee.',
        );
      } finally {
        setInspectionEstimateLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [inspectionOpen, inspectionAddress]);

  const openTechnicianRequest = () => {
    setInspectionAddress(data.siteAddress ?? '');
    setInspectionPhone(data.contactPhone ?? '');
    setInspectionEstimate(null);
    setInspectionEstimateError(null);
    setInspectionOpen(true);
  };

  const submitTechnicianRequest = async () => {
    if (!userId) {
      toast.error('Please log in again to request an inspection.');
      router.push('/login');
      return;
    }

    const address = inspectionAddress.trim();
    const phone = inspectionPhone.trim();

    if (!address || !phone) {
      toast.error('Please provide both site address and phone number.');
      return;
    }

    setSubmittingInspection(true);
    try {
      let currentProjectId = projectId;

      if (!currentProjectId) {
        const displayName = userDisplayName?.trim();
        const projectName = displayName
          ? `${displayName}'s ORAN Smart Home Project`
          : 'My ORAN Smart Home Project';

        const projectResult = await postJson<
          { id: string },
          {
            name: string;
            userId: string;
            buildingType?: string;
            roomsCount?: number;
          }
        >('/projects', {
          name: projectName,
          userId,
          buildingType: data.buildingType,
          roomsCount: data.roomCount,
        });

        if (!projectResult.ok) {
          toast.error(projectResult.error);
          return;
        }

        currentProjectId = projectResult.data.id;
        setProjectId(currentProjectId);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('oran_last_project_id', currentProjectId);
        }
      }

      const res = await fetch(`/api/projects/${encodeURIComponent(currentProjectId)}/request-inspection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteAddress: address,
          contactPhone: phone,
        }),
      });

      const body = (await res.json()) as {
        message?: string;
        inspectionFee?: number;
        inferredRegion?: string;
        authorizationUrl?: string;
      };

      if (!res.ok) {
        toast.error(body?.message ?? 'Unable to request inspection.');
        return;
      }

      updateData({ siteAddress: address, contactPhone: phone });

      const fee = Number(body?.inspectionFee ?? 0);
      toast.success(`Inspection requested. Fee: ₦${fee.toLocaleString()}.`);

      if (body?.authorizationUrl) {
        window.location.href = body.authorizationUrl;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to request inspection.');
    } finally {
      setSubmittingInspection(false);
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else if (!isSubmitting) {
      void finalizeOnboarding();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateData = (newData: Partial<OnboardingData>) => {
    setData({ ...data, ...newData });
  };

  const progressValue = (currentStep / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-white sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">O</span>
              </div>
              <span className="ml-2 text-2xl font-semibold text-foreground">ORAN</span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={openTechnicianRequest}
              >
                Or request a Technician
              </Button>
              <span className="text-sm text-muted-foreground">Step {currentStep} of {totalSteps}</span>
            </div>
          </div>
          <Progress value={progressValue} className="h-2" />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="min-h-[60vh]">
          {currentStep === 1 && <ProjectStatus data={data} updateData={updateData} />}
          {currentStep === 2 && <BuildingType data={data} updateData={updateData} />}
          {currentStep === 3 && <RoomCount data={data} updateData={updateData} />}
          {currentStep === 4 && <FeatureSelection data={data} updateData={updateData} />}
          {currentStep === 5 && <SiteDetails data={data} updateData={updateData} />}
          {currentStep === 6 && <ReviewQuote data={data} updateData={updateData} />}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8 pb-8">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            Back
          </Button>
          <Button onClick={handleNext} disabled={isSubmitting}>
            {currentStep === totalSteps
              ? isSubmitting
                ? 'Saving your project...'
                : 'Finish and go to dashboard'
              : 'Continue'}
          </Button>
        </div>
      </div>

      <Dialog open={inspectionOpen} onOpenChange={setInspectionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a site inspection</DialogTitle>
            <DialogDescription>
              Enter site address and phone number. Inspection fee is calculated with Google Maps distance logic.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-muted-foreground">Site address</span>
              <Input
                placeholder="Street, area, city and state"
                value={inspectionAddress}
                onChange={(event) => setInspectionAddress(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-muted-foreground">Representative phone number</span>
              <Input
                placeholder="Phone number we should call"
                value={inspectionPhone}
                onChange={(event) => setInspectionPhone(event.target.value)}
              />
            </div>

            <div className="rounded-md border p-3 text-xs space-y-1">
              {inspectionEstimateLoading && (
                <p className="text-muted-foreground">Calculating live inspection fee...</p>
              )}
              {inspectionEstimateError && <p className="text-red-500">{inspectionEstimateError}</p>}
              {inspectionEstimate?.warning && (
                <p className="text-amber-600">{inspectionEstimate.warning}</p>
              )}
              <p className="text-muted-foreground">
                Resolved address: {inspectionEstimate?.resolvedAddress || '—'}
              </p>
              <p className="text-muted-foreground">
                Distance from ORAN base: {inspectionEstimate?.distanceKm != null ? `~${inspectionEstimate.distanceKm} km` : '—'}
              </p>
              <p className="text-muted-foreground">Pricing tier: {inspectionEstimate?.tier || '—'}</p>
              <p className="font-medium text-foreground">
                Estimated inspection fee:{' '}
                {inspectionEstimate?.inspectionEstimate
                  ? `₦${inspectionEstimate.inspectionEstimate.toLocaleString()}`
                  : '—'}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setInspectionOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" disabled={submittingInspection} onClick={submitTechnicianRequest}>
              {submittingInspection ? 'Submitting...' : 'Continue to payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
