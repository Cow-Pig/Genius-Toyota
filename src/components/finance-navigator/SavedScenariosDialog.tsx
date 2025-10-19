'use client';

import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/utils';
import { useScenario } from '@/hooks/use-scenario';
import { useToast } from '@/hooks/use-toast';
import { CalendarClock, BookmarkCheck, BookmarkX } from 'lucide-react';

interface SavedScenariosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SavedScenariosDialog({ open, onOpenChange }: SavedScenariosDialogProps) {
  const { savedScenarios, applySavedScenario, removeSavedScenario } = useScenario();
  const { toast } = useToast();

  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [],
  );

  const sortedScenarios = useMemo(
    () =>
      [...savedScenarios].sort(
        (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
      ),
    [savedScenarios],
  );

  const handleApply = (id: string) => {
    const applied = applySavedScenario(id);
    if (!applied) {
      toast({
        title: 'Scenario unavailable',
        description: 'We could not locate that saved scenario. Please try another one.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: `${applied.planType === 'finance' ? 'Finance' : 'Lease'} scenario loaded`,
      description: `${applied.vehicle.modelName} • ${formatCurrency(applied.monthlyPayment)}/mo for ${applied.termMonths} months`,
    });
    onOpenChange(false);
  };

  const handleRemove = (id: string) => {
    removeSavedScenario(id);
    toast({
      title: 'Scenario removed',
      description: 'The saved scenario has been cleared from your list.',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Saved Scenarios</DialogTitle>
          <DialogDescription>
            Revisit quotes you&apos;ve bookmarked. Load one to update the navigator instantly or curate a new comparison.
          </DialogDescription>
        </DialogHeader>
        {sortedScenarios.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center text-sm text-muted-foreground">
            <BookmarkCheck className="h-10 w-10 text-muted-foreground/70" />
            <p>No saved scenarios yet.</p>
            <p className="max-w-xs">
              Compare finance and lease options, then use the save actions to capture the details for quick recall.
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh] pr-2">
            <div className="space-y-4">
              {sortedScenarios.map((item) => (
                <Card key={item.id} className="shadow-sm">
                  <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant={item.planType === 'finance' ? 'default' : 'secondary'} className="uppercase tracking-wide">
                          {item.planType === 'finance' ? 'Finance Plan' : 'Lease Plan'}
                        </Badge>
                        <span className="inline-flex items-center gap-1">
                          <CalendarClock className="h-3.5 w-3.5" />
                          {formatter.format(new Date(item.savedAt))}
                        </span>
                      </div>
                      <CardTitle className="text-xl font-headline">{item.vehicle.modelName}</CardTitle>
                      <CardDescription className="text-base">
                        {formatCurrency(item.monthlyPayment)}/mo for {item.termMonths} months • Due today {formatCurrency(item.dueAtSigning)}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleRemove(item.id)} aria-label="Remove scenario">
                        <BookmarkX className="h-4 w-4" />
                      </Button>
                      <Button onClick={() => handleApply(item.id)} className="font-medium">
                        Load Scenario
                      </Button>
                    </div>
                  </CardHeader>
                  <Separator />
                  <CardContent className="grid gap-4 pt-4 text-sm sm:grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Vehicle MSRP</p>
                      <p className="font-medium">{formatCurrency(item.vehicle.msrp)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Total Paid</p>
                      <p className="font-medium">{formatCurrency(item.totalCost)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Down + Trade Equity</p>
                      <p className="font-medium">{formatCurrency(item.scenario.downPayment + item.scenario.tradeInValue)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Credit Tier</p>
                      <p className="font-medium">{item.scenario.creditScoreTier}</p>
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <p className="text-muted-foreground">Snapshot</p>
                      <p>
                        {item.vehicle.keySpecs}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
