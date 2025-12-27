import { Card } from '../../../components/ui/card';
import { Checkbox } from '../../../components/ui/checkbox';
import { Badge } from '../../../components/ui/badge';
import { Lightbulb, Thermometer, Lock, Camera, DoorOpen, Lamp } from 'lucide-react';
import { OnboardingData } from '../OnboardingFlow';

interface Props {
  data: OnboardingData;
  updateData: (data: Partial<OnboardingData>) => void;
}

export default function FeatureSelection({ data, updateData }: Props) {
  const features = [
    {
      id: 'lighting',
      title: 'Lighting Automation',
      description: 'Control all lights remotely, set schedules, voice control',
      icon: Lightbulb,
      color: 'text-yellow-500'
    },
    {
      id: 'climate',
      title: 'Climate Control',
      description: 'Smart AC, heating, and ventilation control',
      icon: Thermometer,
      color: 'text-blue-500'
    },
    {
      id: 'access',
      title: 'Access Control',
      description: 'Smart locks, biometric access, keyless entry',
      icon: Lock,
      color: 'text-green-500'
    },
    {
      id: 'surveillance',
      title: 'Surveillance System',
      description: 'IP cameras, motion detection, cloud recording',
      icon: Camera,
      color: 'text-red-500'
    },
    {
      id: 'gate',
      title: 'Gate Automation',
      description: 'Automated gate with remote control and sensors',
      icon: DoorOpen,
      color: 'text-purple-500'
    },
    {
      id: 'staircase',
      title: 'Staircase Lighting',
      description: 'Motion-activated sequential lighting',
      icon: Lamp,
      color: 'text-indigo-500'
    }
  ];

  const toggleFeature = (featureId: string) => {
    const currentFeatures = data.selectedFeatures || [];
    const newFeatures = currentFeatures.includes(featureId)
      ? currentFeatures.filter(id => id !== featureId)
      : [...currentFeatures, featureId];
    
    updateData({ selectedFeatures: newFeatures });
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Select the automation features you want</h1>
        <p className="text-muted-foreground">Choose all that apply - you can customize later</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mt-8">
        {features.map((feature) => {
          const Icon = feature.icon;
          const isSelected = data.selectedFeatures?.includes(feature.id);

          return (
            <Card
              key={feature.id}
              className={`p-6 cursor-pointer transition-all hover:shadow-md ${
                isSelected ? 'border-primary border-2 bg-primary/5' : ''
              }`}
              onClick={() => toggleFeature(feature.id)}
            >
              <div className="flex items-start space-x-4">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleFeature(feature.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <Icon className={`h-5 w-5 ${feature.color}`} />
                    <h3 className="font-semibold">{feature.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                  {/* Placeholder for video thumbnail */}
                  <div className="mt-4 h-32 bg-muted rounded-lg flex items-center justify-center">
                    <Icon className={`h-12 w-12 ${feature.color} opacity-30`} />
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center justify-between max-w-4xl mx-auto pt-4 border-t">
        <span className="text-sm text-muted-foreground">
          {data.selectedFeatures?.length || 0} feature(s) selected
        </span>
        {data.selectedFeatures && data.selectedFeatures.length > 0 && (
          <Badge variant="secondary" className="text-sm">
            Continue to review your quote
          </Badge>
        )}
      </div>
    </div>
  );
}
