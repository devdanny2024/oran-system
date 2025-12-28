'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Progress } from '../../components/ui/progress';
import { Button } from '../../components/ui/button';
import ProjectStatus from './steps/ProjectStatus';
import BuildingType from './steps/BuildingType';
import RoomCount from './steps/RoomCount';
import FeatureSelection from './steps/FeatureSelection';
import ReviewQuote from './steps/ReviewQuote';
import { postJson } from '../../lib/api';
import { toast } from 'sonner';

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
  const totalSteps = 5;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [data, setData] = useState<OnboardingData>({
    projectStatus: '',
    buildingType: '',
    roomCount: 5,
    selectedFeatures: []
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = window.localStorage.getItem('oran_user');
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as { id?: string };
      if (parsed?.id) {
        setUserId(parsed.id);
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
        const projectResult = await postJson<
          { id: string },
          {
            name: string;
            userId: string;
            buildingType?: string;
            roomsCount?: number;
          }
        >('/projects', {
          name: 'My ORAN Smart Home Project',
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

      router.push('/dashboard');
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
            <span className="text-sm text-muted-foreground">Step {currentStep} of {totalSteps}</span>
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
          {currentStep === 5 && <ReviewQuote data={data} updateData={updateData} />}
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
    </div>
  );
}
