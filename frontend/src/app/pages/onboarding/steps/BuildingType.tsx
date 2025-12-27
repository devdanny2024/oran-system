import { Card } from '../../../components/ui/card';
import { Building2, Home, CheckCircle } from 'lucide-react';
import { OnboardingData } from '../OnboardingFlow';

interface Props {
  data: OnboardingData;
  updateData: (data: Partial<OnboardingData>) => void;
}

export default function BuildingType({ data, updateData }: Props) {
  const options = [
    {
      id: 'corporate',
      title: 'Corporate',
      description: 'Office spaces, commercial buildings',
      icon: Building2
    },
    {
      id: 'residential',
      title: 'Residential',
      description: 'Homes, villas, apartments',
      icon: Home
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">What type of building is this?</h1>
        <p className="text-muted-foreground">This helps us recommend the right solutions</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-8 max-w-3xl mx-auto">
        {options.map((option) => {
          const Icon = option.icon;
          const isSelected = data.buildingType === option.id;

          return (
            <Card
              key={option.id}
              className={`p-8 cursor-pointer transition-all hover:shadow-lg ${
                isSelected ? 'border-primary border-2 bg-primary/5' : ''
              }`}
              onClick={() => updateData({ buildingType: option.id })}
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className={`p-6 rounded-full ${isSelected ? 'bg-primary' : 'bg-muted'}`}>
                  <Icon className={`h-12 w-12 ${isSelected ? 'text-white' : 'text-foreground'}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-xl mb-2">{option.title}</h3>
                  <p className="text-muted-foreground">{option.description}</p>
                </div>
                {isSelected && (
                  <div className="flex items-center text-primary font-medium">
                    <CheckCircle className="h-5 w-5 mr-1" />
                    Selected
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
