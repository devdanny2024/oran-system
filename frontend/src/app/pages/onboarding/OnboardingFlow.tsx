import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Progress } from '../../components/ui/progress';
import { Button } from '../../components/ui/button';
import ProjectStatus from './steps/ProjectStatus';
import BuildingType from './steps/BuildingType';
import RoomCount from './steps/RoomCount';
import FeatureSelection from './steps/FeatureSelection';
import ReviewQuote from './steps/ReviewQuote';

export interface OnboardingData {
  projectStatus: string;
  constructionStage?: string;
  needsInspection?: boolean;
  buildingType: string;
  roomCount: number;
  selectedFeatures: string[];
  stairSteps?: number;
}

export default function OnboardingFlow() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;
  const [data, setData] = useState<OnboardingData>({
    projectStatus: '',
    buildingType: '',
    roomCount: 5,
    selectedFeatures: []
  });

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      router.push('/dashboard');
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
          <Button onClick={handleNext}>
            {currentStep === totalSteps ? 'View Dashboard' : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
}
