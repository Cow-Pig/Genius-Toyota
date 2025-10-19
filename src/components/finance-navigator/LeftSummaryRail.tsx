'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useScenario } from '@/hooks/use-scenario';
import {
  BarChart,
  Car,
  CircleDollarSign,
  Gauge,
  MapPin,
  Percent,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Button } from '../ui/button';

export function LeftSummaryRail() {
  const { scenario, setOnboardingOpen } = useScenario();

  return (
    <aside className="col-span-1 lg:col-span-2">
      <div className="sticky top-24 space-y-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">Your Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="size-4" /> ZIP Code
              </span>
              <span className="font-medium">{scenario.zipCode}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Gauge className="size-4" /> Credit Tier
              </span>
              <span className="font-medium">{scenario.creditScoreTier}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <CircleDollarSign className="size-4" /> Down Payment
              </span>
              <span className="font-medium">
                {formatCurrency(scenario.downPayment)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Car className="size-4" /> Trade-in Value
              </span>
              <span className="font-medium">
                {formatCurrency(scenario.tradeInValue)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <BarChart className="size-4" /> Finance Term
              </span>
              <span className="font-medium">{scenario.financeTerm} mos</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Percent className="size-4" /> Lease Term
              </span>
              <span className="font-medium">{scenario.leaseTerm} mos</span>
            </div>
          </CardContent>
        </Card>
        <Button variant="outline" className="w-full" onClick={() => setOnboardingOpen(true)}>Edit Profile</Button>
      </div>
    </aside>
  );
}
