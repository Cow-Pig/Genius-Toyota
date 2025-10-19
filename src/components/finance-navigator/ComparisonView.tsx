'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useScenario } from '@/hooks/use-scenario';
import { calculateLoanPayment, calculateLeasePayment } from '@/lib/calculations';
import { getRatesForTier } from '@/lib/data';
import { ArrowRight, CheckCircle, TrendingUp } from 'lucide-react';
import AnimatedNumber from './AnimatedNumber';
import { formatCurrency } from '@/lib/utils';
import { useMemo } from 'react';

export function ComparisonView() {
  const { scenario, activeVehicle, setDrawerState } = useScenario();

  const rates = getRatesForTier(scenario.creditScoreTier);

  const { financePayment, leasePayment, financeTotal, leaseTotal, dueAtSigning } = useMemo(() => {
    if (!activeVehicle) return { financePayment: 0, leasePayment: 0, financeTotal: 0, leaseTotal: 0, dueAtSigning: 0 };
    
    const financePrincipal = activeVehicle.msrp - scenario.downPayment - scenario.tradeInValue;
    const financePayment = calculateLoanPayment(
      financePrincipal,
      rates.financeApr,
      scenario.financeTerm
    );

    const leasePayment = calculateLeasePayment(
      activeVehicle.msrp,
      activeVehicle.residualValue,
      scenario.leaseTerm,
      rates.moneyFactor
    );
    
    const financeTotal = financePayment * scenario.financeTerm + scenario.downPayment + scenario.tradeInValue;
    const leaseTotal = leasePayment * scenario.leaseTerm + scenario.downPayment + scenario.tradeInValue;
    const dueAtSigning = scenario.downPayment + scenario.tradeInValue + (leasePayment); // First month's payment

    return { financePayment, leasePayment, financeTotal, leaseTotal, dueAtSigning };
  }, [activeVehicle, scenario, rates]);


  if (!activeVehicle) {
    return (
      <Card className="text-center shadow-lg">
        <CardHeader>
          <CardTitle>Select a Vehicle</CardTitle>
          <CardDescription>
            Choose a model from the right to compare finance and lease options.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl flex items-center gap-3">
          <TrendingUp className="size-6 text-primary" />
          Finance vs. Lease: {activeVehicle.modelName}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Finance Tile */}
        <div className="border rounded-lg p-6 flex flex-col justify-between hover:border-primary/80 hover:shadow-md transition-all">
          <div>
            <h3 className="text-lg font-bold font-headline">Finance</h3>
            <p className="text-sm text-muted-foreground mb-4">Own your vehicle over time.</p>
            <div className="text-4xl font-bold text-primary mb-2">
              <AnimatedNumber value={financePayment} formatter={(v) => formatCurrency(v)} />
              <span className="text-base font-normal">/mo</span>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex justify-between">Due at signing: <span>{formatCurrency(dueAtSigning)}</span></li>
              <li className="flex justify-between">Total cost ({scenario.financeTerm} mos): <span>{formatCurrency(financeTotal)}</span></li>
            </ul>
          </div>
          <div className="mt-6">
            <p className="text-sm flex items-start gap-2 mb-4"><CheckCircle className="size-4 text-green-600 shrink-0 mt-0.5" /> Ideal for long-term ownership and unlimited mileage.</p>
            <Button variant="outline" className="w-full" onClick={() => setDrawerState({ open: true, type: 'finance' })}>
              See the Math <ArrowRight className="ml-2" />
            </Button>
          </div>
        </div>

        {/* Lease Tile */}
        <div className="border rounded-lg p-6 flex flex-col justify-between hover:border-primary/80 hover:shadow-md transition-all">
          <div>
            <h3 className="text-lg font-bold font-headline">Lease</h3>
            <p className="text-sm text-muted-foreground mb-4">Lower payments, new car more often.</p>
            <div className="text-4xl font-bold text-primary mb-2">
              <AnimatedNumber value={leasePayment} formatter={(v) => formatCurrency(v)} />
              <span className="text-base font-normal">/mo</span>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex justify-between">Due at signing: <span>{formatCurrency(dueAtSigning)}</span></li>
              <li className="flex justify-between">Total cost ({scenario.leaseTerm} mos): <span>{formatCurrency(leaseTotal)}</span></li>
            </ul>
          </div>
          <div className="mt-6">
            <p className="text-sm flex items-start gap-2 mb-4"><CheckCircle className="size-4 text-green-600 shrink-0 mt-0.5" /> Great for enjoying the latest models with warranty coverage.</p>
            <Button variant="outline" className="w-full" onClick={() => setDrawerState({ open: true, type: 'lease' })}>
              See the Math <ArrowRight className="ml-2" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
