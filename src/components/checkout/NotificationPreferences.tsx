'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { JourneyPreferences } from '@/lib/journey-store';

const preferenceCopy: Record<keyof JourneyPreferences, { label: string; description: string }> = {
  prequalification_submitted: {
    label: 'We got your request',
    description: 'Instant confirmation that we logged your pre-qualification and shared it with the dealer.',
  },
  offer_received: {
    label: 'Offer received',
    description: 'Dealer drops a new offer or counter and we send you the PDF with highlights.',
  },
  income_verified: {
    label: 'Income verified',
    description: 'Plaid verification or document review clears your income and ownership checks.',
  },
  decision_ready: {
    label: 'Decision ready',
    description: 'Approval terms are finalized and ready for you to accept online.',
  },
  contract_available: {
    label: 'Contract package available',
    description: 'Digital paperwork is ready to sign, including all supplemental disclosures.',
  },
  pickup_scheduled: {
    label: 'Pickup scheduled',
    description: 'We locked in the handoff. You will get reminders ahead of your appointment.',
  },
};

export function NotificationPreferences({
  preferences,
  onChange,
  disabled = false,
}: {
  preferences: JourneyPreferences;
  onChange: (preferences: Partial<JourneyPreferences>) => void;
  disabled?: boolean;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Notification preferences</CardTitle>
        <p className="text-sm text-muted-foreground">
          Choose the updates you want in your inbox. We always show everything inside your account timeline.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(preferenceCopy).map(([key, copy]) => {
          const preferenceKey = key as keyof JourneyPreferences;
          return (
            <div key={key} className="flex items-start justify-between gap-4 rounded-md border bg-muted/30 p-3">
              <div className="space-y-1">
                <Label className="text-sm font-medium">{copy.label}</Label>
                <p className="text-xs text-muted-foreground">{copy.description}</p>
              </div>
              <Switch
                checked={Boolean(preferences[preferenceKey])}
                onCheckedChange={(checked) => onChange({ [preferenceKey]: checked })}
                disabled={disabled}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
