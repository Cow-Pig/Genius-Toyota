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
import { Checkbox } from '@/components/ui/checkbox';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SavedScenariosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SavedScenariosDialog({ open, onOpenChange }: SavedScenariosDialogProps) {
  const { savedScenarios, applySavedScenario, removeSavedScenario } = useScenario();
  const { toast } = useToast();
  const [selectedScenarioIds, setSelectedScenarioIds] = useState<string[]>([]);
  const [isCompareMode, setIsCompareMode] = useState(false);

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

  const selectedScenarios = useMemo(
    () =>
      selectedScenarioIds
        .map((id) => savedScenarios.find((scenario) => scenario.id === id))
        .filter((value): value is typeof savedScenarios[number] => Boolean(value)),
    [selectedScenarioIds, savedScenarios],
  );

  useEffect(() => {
    setSelectedScenarioIds((prev) =>
      prev.filter((id) => savedScenarios.some((scenario) => scenario.id === id)),
    );
  }, [savedScenarios]);

  useEffect(() => {
    if (isCompareMode && selectedScenarios.length < 2) {
      setIsCompareMode(false);
    }
  }, [isCompareMode, selectedScenarios.length]);

  const handleDialogChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setIsCompareMode(false);
    }
    onOpenChange(nextOpen);
  };

  const bestValues = useMemo(() => {
    if (selectedScenarios.length === 0) {
      return {
        monthly: undefined,
        due: undefined,
        total: undefined,
        term: undefined,
        down: undefined,
        msrp: undefined,
      } as const;
    }

    const normalize = (value: number) => Number(value.toFixed(2));

    const monthlyValues = selectedScenarios.map((scenario) => normalize(scenario.monthlyPayment));
    const dueValues = selectedScenarios.map((scenario) => normalize(scenario.dueAtSigning));
    const totalValues = selectedScenarios.map((scenario) => normalize(scenario.totalCost));
    const downValues = selectedScenarios.map((scenario) =>
      normalize(scenario.scenario.downPayment + scenario.scenario.tradeInValue),
    );
    const msrpValues = selectedScenarios.map((scenario) => normalize(scenario.vehicle.msrp));

    return {
      monthly: Math.min(...monthlyValues),
      due: Math.min(...dueValues),
      total: Math.min(...totalValues),
      term: Math.max(...selectedScenarios.map((scenario) => scenario.termMonths)),
      down: Math.min(...downValues),
      msrp: Math.min(...msrpValues),
    } as const;
  }, [selectedScenarios]);

  const highlightClass = (value: number | undefined, best: number | undefined) => {
    if (value === undefined || best === undefined) return '';
    const normalizedValue = Number(value.toFixed(2));
    const normalizedBest = Number(best.toFixed(2));
    return Math.abs(normalizedValue - normalizedBest) < 0.01
      ? 'bg-emerald-50 text-emerald-700 font-semibold'
      : '';
  };

  const compareDisabled = selectedScenarioIds.length < 2;

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
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent
        className={cn(
          isCompareMode ? 'sm:max-w-5xl lg:max-w-6xl' : 'sm:max-w-3xl',
          'max-h-[85vh] overflow-hidden p-6',
        )}
      >
        <div className="flex h-full min-h-0 flex-col gap-4">
          {isCompareMode ? (
            <>
            <DialogHeader className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <DialogTitle className="font-headline text-2xl">Compare scenarios</DialogTitle>
                  <DialogDescription>
                    Stack your saved quotes across key cost, term, and vehicle metrics. Highlighted cells call out the leader.
                  </DialogDescription>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setIsCompareMode(false)}
                  className="self-start sm:self-auto"
                >
                  Back to saved scenarios
                </Button>
              </div>
            </DialogHeader>
            <ScrollArea className="flex-1 min-h-0 pr-2">
              <div className="space-y-4">
                <Tabs defaultValue="costs" className="space-y-4">
                  <TabsList className="grid gap-2 bg-muted/60 p-1 sm:max-w-md sm:grid-cols-3">
                    <TabsTrigger value="costs">Costs</TabsTrigger>
                    <TabsTrigger value="terms">Terms</TabsTrigger>
                    <TabsTrigger value="vehicle">Vehicle</TabsTrigger>
                  </TabsList>
                  <TabsContent value="costs" className="space-y-3">
                    <div className="overflow-x-auto rounded-lg border bg-background">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[220px]">Scenario</TableHead>
                            <TableHead>Monthly payment</TableHead>
                            <TableHead>Due at signing</TableHead>
                            <TableHead>Total paid</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedScenarios.map((scenario) => (
                            <TableRow key={scenario.id}>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="font-semibold">{scenario.vehicle.modelName}</span>
                              <Badge
                                variant={scenario.planType === 'finance' ? 'default' : 'secondary'}
                                className="w-max uppercase"
                              >
                                {scenario.planType === 'finance' ? 'Finance' : 'Lease'}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell
                            className={cn(
                              'font-semibold',
                              highlightClass(scenario.monthlyPayment, bestValues.monthly),
                            )}
                          >
                            {formatCurrency(scenario.monthlyPayment)}
                          </TableCell>
                          <TableCell className={highlightClass(scenario.dueAtSigning, bestValues.due)}>
                            {formatCurrency(scenario.dueAtSigning)}
                          </TableCell>
                          <TableCell className={highlightClass(scenario.totalCost, bestValues.total)}>
                            {formatCurrency(scenario.totalCost)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" onClick={() => handleApply(scenario.id)}>
                              Load scenario
                            </Button>
                          </TableCell>
                        </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                  <TabsContent value="terms" className="space-y-3">
                    <div className="overflow-x-auto rounded-lg border bg-background">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[220px]">Scenario</TableHead>
                            <TableHead>Plan type</TableHead>
                            <TableHead>Term length</TableHead>
                            <TableHead>Credit tier</TableHead>
                            <TableHead>Down + trade</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedScenarios.map((scenario) => {
                            const combinedDown = scenario.scenario.downPayment + scenario.scenario.tradeInValue;
                            return (
                              <TableRow key={`${scenario.id}-terms`}>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <span className="font-semibold">{scenario.vehicle.modelName}</span>
                                <span className="text-xs text-muted-foreground">
                                  Saved {formatter.format(new Date(scenario.savedAt))}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={scenario.planType === 'finance' ? 'default' : 'secondary'}
                                className="w-max uppercase"
                              >
                                {scenario.planType === 'finance' ? 'Finance' : 'Lease'}
                              </Badge>
                            </TableCell>
                            <TableCell className={highlightClass(scenario.termMonths, bestValues.term)}>
                              {scenario.termMonths} months
                            </TableCell>
                            <TableCell>{scenario.scenario.creditScoreTier}</TableCell>
                            <TableCell className={highlightClass(combinedDown, bestValues.down)}>
                              {formatCurrency(combinedDown)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" onClick={() => handleApply(scenario.id)}>
                                Load scenario
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                  <TabsContent value="vehicle" className="space-y-3">
                    <div className="overflow-x-auto rounded-lg border bg-background">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[220px]">Scenario</TableHead>
                            <TableHead>Vehicle MSRP</TableHead>
                            <TableHead>Vehicle highlights</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedScenarios.map((scenario) => (
                            <TableRow key={`${scenario.id}-vehicle`}>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="font-semibold">{scenario.vehicle.modelName}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatCurrency(scenario.monthlyPayment)}/mo • {scenario.termMonths} months
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className={highlightClass(scenario.vehicle.msrp, bestValues.msrp)}>
                            {formatCurrency(scenario.vehicle.msrp)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {scenario.vehicle.keySpecs}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" onClick={() => handleApply(scenario.id)}>
                              Load scenario
                            </Button>
                          </TableCell>
                        </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </ScrollArea>
          </>
        ) : (
          <>
            <DialogHeader className="space-y-3">
              <DialogTitle className="font-headline text-2xl">Saved Scenarios</DialogTitle>
              <DialogDescription>
                Revisit quotes you&apos;ve bookmarked. Load one instantly or choose up to three to compare.
              </DialogDescription>
            </DialogHeader>
            {sortedScenarios.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 py-10 text-center text-sm text-muted-foreground">
                <BookmarkCheck className="h-10 w-10 text-muted-foreground/70" />
                <p>No saved scenarios yet.</p>
                <p className="max-w-xs">
                  Compare finance and lease options, then use the save actions to capture the details for quick recall.
                </p>
              </div>
            ) : (
              <div className="flex flex-1 min-h-0 flex-col gap-4">
                <div className="flex flex-col gap-3 rounded-md border border-dashed border-muted-foreground/40 bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium">Select scenarios to compare</p>
                    <p className="text-xs text-muted-foreground">
                      Choose up to three saved scenarios. You currently have {selectedScenarioIds.length} selected.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                    <Button
                      variant="ghost"
                      disabled={selectedScenarioIds.length === 0}
                      onClick={() => setSelectedScenarioIds([])}
                    >
                      Clear selection
                    </Button>
                    <Button
                      onClick={() => setIsCompareMode(true)}
                      disabled={compareDisabled}
                      className="sm:min-w-[160px]"
                    >
                      Compare selected ({selectedScenarioIds.length || 0})
                    </Button>
                  </div>
                </div>
                <ScrollArea className="flex-1 min-h-0 pr-2">
                  <div className="space-y-3">
                    {sortedScenarios.map((item) => {
                      const isSelected = selectedScenarioIds.includes(item.id);
                      const downTotal = item.scenario.downPayment + item.scenario.tradeInValue;
                      return (
                        <Card
                          key={item.id}
                          className={cn(
                            'shadow-sm transition',
                            isSelected && 'ring-2 ring-inset ring-primary/60',
                          )}
                        >
                          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex w-full gap-3">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleScenarioSelection(item.id)}
                                aria-label={`Select ${item.vehicle.modelName} scenario`}
                                className="mt-1 shrink-0"
                              />
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  <Badge
                                    variant={item.planType === 'finance' ? 'default' : 'secondary'}
                                    className="uppercase tracking-wide"
                                  >
                                    {item.planType === 'finance' ? 'Finance Plan' : 'Lease Plan'}
                                  </Badge>
                                  <span className="inline-flex items-center gap-1">
                                    <CalendarClock className="h-3.5 w-3.5" />
                                    {formatter.format(new Date(item.savedAt))}
                                  </span>
                                </div>
                                <CardTitle className="text-xl font-headline">{item.vehicle.modelName}</CardTitle>
                                <CardDescription className="text-sm">
                                  {formatCurrency(item.monthlyPayment)}/mo · {item.termMonths} months · Due today {formatCurrency(item.dueAtSigning)}
                                </CardDescription>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant={isSelected ? 'default' : 'outline'}
                                onClick={() => toggleScenarioSelection(item.id)}
                                className="font-medium"
                              >
                                {isSelected ? 'Selected' : 'Compare'}
                              </Button>
                              <Button variant="outline" onClick={() => handleApply(item.id)} className="font-medium">
                                Load
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemove(item.id)}
                                aria-label="Remove scenario"
                              >
                                <BookmarkX className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardHeader>
                          <Separator />
                          <CardContent className="grid gap-3 bg-muted/20 p-4 text-xs sm:grid-cols-3">
                            <div className="space-y-1">
                              <p className="text-muted-foreground">Vehicle MSRP</p>
                              <p className="font-semibold">{formatCurrency(item.vehicle.msrp)}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-muted-foreground">Down + trade</p>
                              <p className="font-semibold">{formatCurrency(downTotal)}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-muted-foreground">Credit tier</p>
                              <p className="font-semibold">{item.scenario.creditScoreTier}</p>
                            </div>
                            <div className="sm:col-span-3 space-y-1">
                              <p className="text-muted-foreground">Snapshot</p>
                              <p className="text-sm leading-relaxed">{item.vehicle.keySpecs}</p>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}
          </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
