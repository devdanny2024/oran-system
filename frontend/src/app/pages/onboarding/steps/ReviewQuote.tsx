import { Card } from '../../../components/ui/card';
import { Separator } from '../../../components/ui/separator';
import { Badge } from '../../../components/ui/badge';
import { CheckCircle, Loader2 } from 'lucide-react';
import { OnboardingData } from '../OnboardingFlow';
import { useEffect, useState } from 'react';

interface Props {
  data: OnboardingData;
  updateData: (data: Partial<OnboardingData>) => void;
}

export default function ReviewQuote({ data }: Props) {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate quote generation
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setLoading(false);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    return () => clearInterval(interval);
  }, []);

  const mockQuote = {
    products: 2850000,
    installation: 450000,
    serviceFee: 150000,
    vat: 258750,
    total: 3708750,
    items: 42,
    timeline: '6-8 weeks'
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Review Your Requirements</h1>
        <p className="text-muted-foreground">Here's what we gathered from your selections</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-8">
        {/* Requirements Summary */}
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">Project Summary</h3>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-muted-foreground">Project Type:</span>
              <p className="font-medium capitalize">{data.projectStatus || 'Not specified'}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Building Type:</span>
              <p className="font-medium capitalize">{data.buildingType || 'Not specified'}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Rooms:</span>
              <p className="font-medium">{data.roomCount} rooms</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Selected Features:</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {data.selectedFeatures && data.selectedFeatures.length > 0 ? (
                  data.selectedFeatures.map(feature => (
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
                <h3 className="font-semibold text-lg">Generating your custom quote...</h3>
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
                <div className={progress > 50 ? 'flex items-center space-x-2' : 'flex items-center space-x-2 opacity-50'}>
                  <CheckCircle className="h-4 w-4 text-accent" />
                  <span>Optimizing installation costs</span>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="font-semibold text-lg mb-4">Your Quote</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Products:</span>
                  <span className="font-medium">₦{mockQuote.products.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Installation:</span>
                  <span className="font-medium">₦{mockQuote.installation.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service Fee:</span>
                  <span className="font-medium">₦{mockQuote.serviceFee.toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">
                    ₦{(mockQuote.products + mockQuote.installation + mockQuote.serviceFee).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VAT (7.5%):</span>
                  <span className="font-medium">₦{mockQuote.vat.toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-primary">₦{mockQuote.total.toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Items:</span>
                  <span>{mockQuote.items} products</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Timeline:</span>
                  <span>{mockQuote.timeline}</span>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
