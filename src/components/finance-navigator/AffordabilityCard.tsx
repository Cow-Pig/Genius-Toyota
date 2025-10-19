'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useScenario } from '@/hooks/use-scenario';
import { formatCurrency } from '@/lib/utils';
import { Wallet } from 'lucide-react';
import { DonutChart } from './DonutChart';
import AnimatedNumber from './AnimatedNumber';
import { useState, useEffect } from 'react';
import { useDebouncedCallback } from 'use-debounce';

export function AffordabilityCard() {
  const { scenario, updateScenario } = useScenario();
  const [localBudget, setLocalBudget] = useState(scenario.monthlyBudget);

  useEffect(() => {
    setLocalBudget(scenario.monthlyBudget);
  }, [scenario.monthlyBudget]);

  const debouncedUpdateScenario = useDebouncedCallback((value: number) => {
    updateScenario({ monthlyBudget: value });
  }, 300);

  const handleSliderChange = (value: number[]) => {
    setLocalBudget(value[0]);
    debouncedUpdateScenario(value[0]);
  };

  const chartData = [
    { name: 'Principal & Interest', value: localBudget * 0.7, fill: 'hsl(var(--primary))' },
    { name: 'Taxes & Fees', value: localBudget * 0.2, fill: 'hsl(var(--chart-2))' },
    { name: 'Insurance (est.)', value: localBudget * 0.1, fill: 'hsl(var(--chart-3))' },
  ];

  return (
    <Card className="overflow-hidden shadow-lg">
      <CardHeader className="bg-muted/30">
        <CardTitle className="flex items-center gap-3 text-xl font-headline">
          <Wallet className="size-6 text-primary" />
          My Plan
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="md:col-span-2">
            <Label htmlFor="monthly-budget" className="text-base">
              Monthly Budget
            </Label>
            <div className="mt-4 flex items-center gap-4">
              <span className="text-4xl font-bold text-primary font-headline tracking-tight">
                <span className="inline-block min-w-[7ch] tabular-nums">
                  <AnimatedNumber value={localBudget} formatter={(val) => formatCurrency(val)} />
                </span>
              </span>
              <Slider
                id="monthly-budget"
                min={200}
                max={2000}
                step={25}
                value={[localBudget]}
                onValueChange={handleSliderChange}
                className="flex-1"
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2">Adjust the slider to see how your budget impacts your options.</p>
          </div>
          <div className="flex flex-col items-center justify-center">
            <h3 className="text-center font-semibold mb-2">Estimated Breakdown</h3>
            <DonutChart data={chartData} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
