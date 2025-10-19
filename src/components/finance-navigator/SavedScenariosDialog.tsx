'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { formatCurrency, cn } from '@/lib/utils';
import { useScenario } from '@/hooks/use-scenario';
import { useToast } from '@/hooks/use-toast';
import { CalendarClock, BookmarkCheck, BookmarkX } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface SavedScenariosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SavedScenariosDialog({ open, onOpenChange }: SavedScenariosDialogProps) {
  const { savedScenarios, applySavedScenario, removeSavedScenario } = useScenario();
  const { toast } = useToast();
  const [selectedScenarioIds, setSelectedScenarioIds] = useState<string[]>([]);

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

  useEffect(() => {
    setSelectedScenarioIds((prev) =>
      prev.filter((id) => savedScenarios.some((scenario) => scenario.id === id)),
    );
  }, [savedScenarios]);

  const selectedScenarios = useMemo(
    () =>
      selectedScenarioIds
        .map((id) => savedScenarios.find((scenario) => scenario.id === id))
        .filter((value): value is typeof savedScenarios[number] => Boolean(value)),
    [selectedScenarioIds, savedScenarios],
  );

  const toggleScenarioSelection = (id: string) => {
    setSelectedScenarioIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((existingId) => existingId !== id);
      }

      if (prev.length >= 3) {
        toast({
          title: 'Comparison limit reached',
          description: 'Select up to three scenarios to compare side-by-side.',
        });
        return prev;
      }

      return [...prev, id];
    });
  };

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
              {sortedScenarios.map((item) => {
                const isSelected = selectedScenarioIds.includes(item.id);
                return (
                  <Card
                    key={item.id}
                    className={cn(
                      'shadow-sm transition',
                      isSelected && 'ring-2 ring-primary/50',
                    )}
                  >
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
                      <Button
                        variant={isSelected ? 'secondary' : 'outline'}
                        onClick={() => toggleScenarioSelection(item.id)}
                        className="font-medium"
                      >
                        {isSelected ? 'Selected' : 'Compare'}
                      </Button>
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
                );
              })}
            </div>
          </ScrollArea>
        )}
        {selectedScenarios.length >= 2 && (
          <div className="mt-6 space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-headline text-xl">Compare selected scenarios</h3>
                <p className="text-sm text-muted-foreground">
                  Review the highlights of each option side-by-side before deciding which one to load.
                </p>
              </div>
              <Button variant="ghost" onClick={() => setSelectedScenarioIds([])} className="self-start sm:self-auto">
                Clear selection
              </Button>
            </div>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-40">Metric</TableHead>
                    {selectedScenarios.map((scenario) => (
                      <TableHead key={scenario.id} className="min-w-[160px]">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold">{scenario.vehicle.modelName}</span>
                          <Badge variant={scenario.planType === 'finance' ? 'default' : 'secondary'} className="w-max uppercase">
                            {scenario.planType === 'finance' ? 'Finance' : 'Lease'}
                          </Badge>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Monthly payment</TableCell>
                    {selectedScenarios.map((scenario) => (
                      <TableCell key={`${scenario.id}-monthly`} className="font-semibold">
                        {formatCurrency(scenario.monthlyPayment)}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Due at signing</TableCell>
                    {selectedScenarios.map((scenario) => (
                      <TableCell key={`${scenario.id}-due`}>
                        {formatCurrency(scenario.dueAtSigning)}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Term length</TableCell>
                    {selectedScenarios.map((scenario) => (
                      <TableCell key={`${scenario.id}-term`}>
                        {scenario.termMonths} months
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Total paid</TableCell>
                    {selectedScenarios.map((scenario) => (
                      <TableCell key={`${scenario.id}-total`}>
                        {formatCurrency(scenario.totalCost)}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Down + trade equity</TableCell>
                    {selectedScenarios.map((scenario) => (
                      <TableCell key={`${scenario.id}-down`}>
                        {formatCurrency(scenario.scenario.downPayment + scenario.scenario.tradeInValue)}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Credit tier</TableCell>
                    {selectedScenarios.map((scenario) => (
                      <TableCell key={`${scenario.id}-tier`}>
                        {scenario.scenario.creditScoreTier}
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Saved on</TableCell>
                    {selectedScenarios.map((scenario) => (
                      <TableCell key={`${scenario.id}-saved`}>
                        {formatter.format(new Date(scenario.savedAt))}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
