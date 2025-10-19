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
import { formatCurrency, formatPercent } from '@/lib/utils';
import { memo, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const ComparisonView = memo(function ComparisonView() {
  const { scenario, activeVehicle, setDrawerState, saveScenarioOption } = useScenario();
  const { toast } = useToast();

  const rates = useMemo(() => getRatesForTier(scenario.creditScoreTier), [scenario.creditScoreTier]);

  const {
    financePayment,
    leasePayment,
    financeTotal,
    leaseTotal,
    financeDueAtSigning,
    leaseDueAtSigning,
  } = useMemo(() => {
    if (!activeVehicle)
      return {
        financePayment: 0,
        leasePayment: 0,
        financeTotal: 0,
        leaseTotal: 0,
        financeDueAtSigning: 0,
        leaseDueAtSigning: 0,
      };

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

    const financeDueAtSigning = scenario.downPayment + scenario.tradeInValue + financePayment;
    const leaseDueAtSigning = scenario.downPayment + scenario.tradeInValue + leasePayment;

    return {
      financePayment,
      leasePayment,
      financeTotal,
      leaseTotal,
      financeDueAtSigning,
      leaseDueAtSigning,
    };
  }, [activeVehicle, scenario, rates]);

  const comparisonRows = useMemo(() => {
    if (!activeVehicle) return [];

    const leaseAprEquivalent = (rates.moneyFactor * 2400) / 100;
    const leaseMileageAllowance = scenario.annualMileage
      ? `${scenario.annualMileage.toLocaleString()} mi/year`
      : 'Flexible mileage packages available';
    const leaseResidualEstimate = formatCurrency(activeVehicle.msrp * activeVehicle.residualValue);

    return [
      {
        label: 'Monthly payment',
        finance: `${formatCurrency(financePayment)} /mo`,
        lease: `${formatCurrency(leasePayment)} /mo`,
      },
      {
        label: 'Due at signing',
        finance: formatCurrency(financeDueAtSigning),
        lease: formatCurrency(leaseDueAtSigning),
      },
      {
        label: 'Total paid over term',
        finance: `${formatCurrency(financeTotal)} (${scenario.financeTerm} months)`,
        lease: `${formatCurrency(leaseTotal)} (${scenario.leaseTerm} months)`,
      },
      {
        label: 'Rate',
        finance: `${formatPercent(rates.financeApr, 2)} APR`,
        lease: `${rates.moneyFactor.toFixed(5)} MF (≈ ${formatPercent(leaseAprEquivalent, 2)})`,
      },
      {
        label: 'Mileage allowance',
        finance: 'Unlimited mileage',
        lease: leaseMileageAllowance,
      },
      {
        label: 'End of term',
        finance: 'Loan paid off — vehicle is yours.',
        lease: `Return, swap, or buy for about ${leaseResidualEstimate}.`,
      },
      {
        label: 'Ideal for',
        finance: 'Building equity and driving as much as you like.',
        lease: 'Lower payments, staying in warranty coverage.',
      },
    ];
  }, [
    activeVehicle,
    financeDueAtSigning,
    financePayment,
    financeTotal,
    leaseDueAtSigning,
    leasePayment,
    leaseTotal,
    rates.financeApr,
    rates.moneyFactor,
    scenario.financeTerm,
    scenario.annualMileage,
    scenario.leaseTerm,
  ]);


  const handleSaveScenario = useCallback(
    (option: 'finance' | 'lease') => {
      const saved = saveScenarioOption(option);
      if (saved) {
        toast({
          title: `${option === 'finance' ? 'Finance' : 'Lease'} scenario saved`,
          description: `${saved.vehicle.modelName} • ${formatCurrency(saved.monthlyPayment)}/mo for ${saved.termMonths} months`,
        });
      } else {
        toast({
          title: 'Select a vehicle to save',
          description: 'Choose a vehicle to capture its payment scenario before saving.',
          variant: 'destructive',
        });
      }
    },
    [saveScenarioOption, toast],
  );

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
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
                <li className="flex justify-between">Due at signing: <span>{formatCurrency(financeDueAtSigning)}</span></li>
                <li className="flex justify-between">Total cost ({scenario.financeTerm} mos): <span>{formatCurrency(financeTotal)}</span></li>
              </ul>
            </div>
            <div className="mt-6 space-y-2">
              <p className="text-sm flex items-start gap-2 mb-4"><CheckCircle className="size-4 text-green-600 shrink-0 mt-0.5" /> Ideal for long-term ownership and unlimited mileage.</p>
              <Button variant="outline" className="w-full" onClick={() => setDrawerState({ open: true, type: 'finance' })}>
                See the Math <ArrowRight className="ml-2" />
              </Button>
              <Button className="w-full" onClick={() => handleSaveScenario('finance')}>
                Save Finance Scenario
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
                <li className="flex justify-between">Due at signing: <span>{formatCurrency(leaseDueAtSigning)}</span></li>
                <li className="flex justify-between">Total cost ({scenario.leaseTerm} mos): <span>{formatCurrency(leaseTotal)}</span></li>
              </ul>
            </div>
            <div className="mt-6 space-y-2">
              <p className="text-sm flex items-start gap-2 mb-4"><CheckCircle className="size-4 text-green-600 shrink-0 mt-0.5" /> Great for enjoying the latest models with warranty coverage.</p>
              <Button variant="outline" className="w-full" onClick={() => setDrawerState({ open: true, type: 'lease' })}>
                See the Math <ArrowRight className="ml-2" />
              </Button>
              <Button className="w-full" onClick={() => handleSaveScenario('lease')}>
                Save Lease Scenario
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-lg border overflow-hidden">
          <div className="border-b bg-muted/40 px-6 py-4">
            <h3 className="font-headline text-lg">Compare the details</h3>
            <p className="text-sm text-muted-foreground">
              A line-by-line breakdown to help you decide which plan matches your driving style and budget.
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/3">What to compare</TableHead>
                <TableHead>Finance</TableHead>
                <TableHead>Lease</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparisonRows.map((row) => (
                <TableRow key={row.label}>
                  <TableCell className="font-medium">{row.label}</TableCell>
                  <TableCell className="text-muted-foreground">{row.finance}</TableCell>
                  <TableCell className="text-muted-foreground">{row.lease}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
});

ComparisonView.displayName = 'ComparisonView';
