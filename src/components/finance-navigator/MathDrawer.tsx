'use client';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useScenario } from '@/hooks/use-scenario';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { getRatesForTier, vehicleData } from '@/lib/data';
import { Separator } from '../ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { HelpCircle } from 'lucide-react';

export function MathDrawer() {
  const { drawerState, setDrawerState, scenario, activeVehicle, updateScenario } = useScenario();

  const handleClose = () => setDrawerState({ open: false, type: null });

  if (!drawerState.open || !activeVehicle) {
    return null;
  }
  
  const rates = getRatesForTier(scenario.creditScoreTier);

  const isFinance = drawerState.type === 'finance';
  const title = isFinance ? 'Finance Breakdown' : 'Lease Breakdown';
  const term = isFinance ? scenario.financeTerm : scenario.leaseTerm;
  
  const renderRow = (label: string, value: string | number, isCurrency = true, subtext?: string, tooltip?: string) => (
    <div className="flex justify-between items-center py-2">
      <div className='flex items-center gap-2'>
        <p className="font-medium">{label}</p>
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="size-4 text-muted-foreground cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
      </div>
      <p className="font-mono">{isCurrency ? formatCurrency(value as number) : value}</p>
    </div>
  );

  return (
    <Sheet open={drawerState.open} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-headline text-2xl">{title}</SheetTitle>
          <SheetDescription>
            Here’s how we estimate your payment for the {activeVehicle.modelName}.
          </SheetDescription>
        </SheetHeader>
        <div className="py-6 space-y-4">
            {renderRow("MSRP", activeVehicle.msrp)}
            {renderRow("Down Payment", -scenario.downPayment)}
            {renderRow("Trade-in Value", -scenario.tradeInValue)}
            <Separator />
            {renderRow("Amount to be Financed", activeVehicle.msrp - scenario.downPayment - scenario.tradeInValue)}
            <Separator />
            {isFinance ? (
                <>
                    {renderRow("APR", `${formatPercent(rates.financeApr, 2)}`, false, `Based on ${scenario.creditScoreTier} credit`, 'Annual Percentage Rate (APR) is the yearly interest you pay on a loan, including fees.')}
                    {renderRow("Term", `${term} months`, false)}
                </>
            ) : (
                <>
                    {renderRow("Residual Value", `${formatPercent(activeVehicle.residualValue)}`, false, `After ${term} months`, "The car's estimated value at the end of the lease. You pay for the depreciation between the MSRP and this value.")}
                    {renderRow("Money Factor", rates.moneyFactor.toFixed(5), false, `Approx. ${formatPercent(rates.moneyFactor * 2400, 2)} APR`, "The interest rate for a lease. Multiply by 2400 to get an approximate APR equivalent.")}
                    {renderRow("Term", `${term} months`, false)}
                </>
            )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
