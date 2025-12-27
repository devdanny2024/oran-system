import { Card } from '../../../components/ui/card';
import { Building, Construction, CheckCircle } from 'lucide-react';
import { OnboardingData } from '../OnboardingFlow';

interface Props {
  data: OnboardingData;
  updateData: (data: Partial<OnboardingData>) => void;
}

export default function ProjectStatus({ data, updateData }: Props) {
  const options = [
    {
      id: 'new',
      title: 'New Project',
      description: 'Starting from scratch',
      icon: Building
    },
    {
      id: 'ongoing',
      title: 'Ongoing Project',
      description: 'Already in construction',
      icon: Construction
    },
    {
      id: 'finished',
      title: 'Finished Project',
      description: 'Ready to automate',
      icon: CheckCircle
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">What type of project is this?</h1>
        <p className="text-muted-foreground">Help us understand your project status</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mt-8">
        {options.map((option) => {
          const Icon = option.icon;
          const isSelected = data.projectStatus === option.id;

          return (
            <Card
              key={option.id}
              className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
                isSelected ? 'border-primary border-2 bg-primary/5' : ''
              }`}
              onClick={() => updateData({ projectStatus: option.id })}
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className={`p-4 rounded-full ${isSelected ? 'bg-primary' : 'bg-muted'}`}>
                  <Icon className={`h-8 w-8 ${isSelected ? 'text-white' : 'text-foreground'}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">{option.title}</h3>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
                {isSelected && (
                  <div className="flex items-center text-primary text-sm font-medium">
                    <CheckCircle className="h-4 w-4 mr-1" />
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
