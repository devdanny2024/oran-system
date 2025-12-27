import { Card } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Slider } from '../../../components/ui/slider';
import { Minus, Plus, Info } from 'lucide-react';
import { OnboardingData } from '../OnboardingFlow';
import { Alert, AlertDescription } from '../../../components/ui/alert';

interface Props {
  data: OnboardingData;
  updateData: (data: Partial<OnboardingData>) => void;
}

export default function RoomCount({ data, updateData }: Props) {
  const handleIncrement = () => {
    if (data.roomCount < 50) {
      updateData({ roomCount: data.roomCount + 1 });
    }
  };

  const handleDecrement = () => {
    if (data.roomCount > 1) {
      updateData({ roomCount: data.roomCount - 1 });
    }
  };

  const handleSliderChange = (value: number[]) => {
    updateData({ roomCount: value[0] });
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">How many rooms do you want to automate?</h1>
        <p className="text-muted-foreground">Include all spaces like bedrooms, living areas, and offices</p>
      </div>

      <Card className="p-8 max-w-2xl mx-auto mt-8">
        <div className="space-y-8">
          {/* Number Display and Controls */}
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={handleDecrement}
              className="h-12 w-12 rounded-lg border-2 border-border hover:border-primary hover:bg-primary/10 transition-colors flex items-center justify-center"
              disabled={data.roomCount <= 1}
            >
              <Minus className="h-5 w-5" />
            </button>
            
            <div className="text-center">
              <Input
                type="number"
                value={data.roomCount}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 1;
                  if (value >= 1 && value <= 50) {
                    updateData({ roomCount: value });
                  }
                }}
                className="text-4xl font-bold text-center w-32 h-16 border-2"
                min={1}
                max={50}
              />
              <p className="text-sm text-muted-foreground mt-2">Rooms</p>
            </div>

            <button
              onClick={handleIncrement}
              className="h-12 w-12 rounded-lg border-2 border-border hover:border-primary hover:bg-primary/10 transition-colors flex items-center justify-center"
              disabled={data.roomCount >= 50}
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          {/* Slider */}
          <div className="space-y-2">
            <Slider
              value={[data.roomCount]}
              onValueChange={handleSliderChange}
              min={1}
              max={50}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1 room</span>
              <span>50+ rooms</span>
            </div>
          </div>
        </div>
      </Card>

      <Alert className="max-w-2xl mx-auto">
        <Info className="h-4 w-4" />
        <AlertDescription>
          Include all spaces you want automated: bedrooms, living areas, offices, bathrooms, etc.
        </AlertDescription>
      </Alert>
    </div>
  );
}
