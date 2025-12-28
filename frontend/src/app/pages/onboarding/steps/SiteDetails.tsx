import { Card } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { OnboardingData } from '../OnboardingFlow';

interface Props {
  data: OnboardingData;
  updateData: (data: Partial<OnboardingData>) => void;
}

export default function SiteDetails({ data, updateData }: Props) {
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
            Include state and city. This helps us estimate logistics correctly
            (Lagos vs nearby states vs the rest of Nigeria).
          </p>
          <Textarea
            rows={3}
            placeholder="Example: 12 Admiralty Way, Lekki Phase 1, Lagos"
            value={data.siteAddress ?? ''}
            onChange={(e) => updateData({ siteAddress: e.target.value })}
          />
        </div>

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

