'use client';
import { useScenario } from '@/hooks/use-scenario';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { PlusCircle, Trash2, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@/components/ui/table"

export function ScenarioTray() {
    const { savedScenarios, saveCurrentScenario, removeScenario, activeVehicle } = useScenario();
    const [isOpen, setIsOpen] = useState(false);

    if (!isOpen && savedScenarios.length === 0) {
        return (
            <div className="fixed bottom-4 right-4 z-50">
                <Button onClick={saveCurrentScenario} disabled={!activeVehicle}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Save Scenario
                </Button>
            </div>
        )
    }

    if (!isOpen) {
        return (
            <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-50">
                 <Button onClick={() => setIsOpen(true)} className="rounded-b-none">
                    Compare {savedScenarios.length} {savedScenarios.length === 1 ? 'Scenario' : 'Scenarios'}
                </Button>
            </div>
        )
    }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/80 backdrop-blur-sm">
        <Card className="container mx-auto shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-headline">Scenario Comparison</CardTitle>
                <div className='flex items-center gap-2'>
                    <Button onClick={saveCurrentScenario} disabled={!activeVehicle || savedScenarios.length >= 3}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Save Current
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Metric</TableHead>
                            {savedScenarios.map((s, i) => (
                                <TableHead key={i} className="text-right">
                                    {s.vehicle?.modelName}
                                    <Button variant="ghost" size="sm" className="ml-2" onClick={() => removeScenario(i)}>
                                        <Trash2 className="size-3" />
                                    </Button>
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell>Monthly Payment</TableCell>
                            {savedScenarios.map((s, i) => <TableCell key={i} className="text-right font-mono">{formatCurrency(s.monthlyPayment)}</TableCell>)}
                        </TableRow>
                        <TableRow>
                            <TableCell>Down Payment</TableCell>
                            {savedScenarios.map((s, i) => <TableCell key={i} className="text-right font-mono">{formatCurrency(s.scenario.downPayment)}</TableCell>)}
                        </TableRow>
                        <TableRow>
                            <TableCell>Term</TableCell>
                            {savedScenarios.map((s, i) => <TableCell key={i} className="text-right font-mono">{s.scenario.financeTerm} mos</TableCell>)}
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  );
}
