'use client';
import { useEffect, useState } from 'react';
import {
  suggestModelsBasedOnAffordability,
  type SuggestModelsBasedOnAffordabilityOutput,
} from '@/ai/flows/suggest-models-based-on-affordability';
import { useScenario } from '@/hooks/use-scenario';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import Image from 'next/image';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { vehicleData } from '@/lib/data';
import { PlaceHolderImages } from '@/lib/placeholder-images';

function ModelCard({ model, onSelect }: { model: any, onSelect: () => void }) {
  const image = PlaceHolderImages.find(img => img.id === model.id);
  
  return (
    <Card className="overflow-hidden hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="p-0">
        <div className="relative h-40 w-full">
            <Image
                src={image?.imageUrl || `https://picsum.photos/seed/${model.id}/600/400`}
                alt={model.modelName}
                fill
                className="object-cover"
                data-ai-hint={image?.imageHint}
            />
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <h3 className="font-bold font-headline">{model.modelName}</h3>
        <p className="text-sm text-muted-foreground">{model.keySpecs}</p>
        <div className="flex flex-wrap gap-2 my-3">
          {model.badges.map((badge: string) => (
            <Badge key={badge} variant="secondary">{badge}</Badge>
          ))}
        </div>
        <div className="flex justify-between items-center mt-4">
            <div>
                <p className="text-sm text-muted-foreground">Starts at</p>
                <p className="font-bold text-lg">{formatCurrency(model.estimatedPayment)}<span className="text-sm font-normal">/mo</span></p>
            </div>
            <Button size="sm" onClick={onSelect}>Select</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
    return (
        <div className="space-y-4">
            {[1, 2, 3].map((i) => (
                <Card key={i}>
                    <Skeleton className="h-40 w-full" />
                    <CardContent className="p-4 space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <div className="flex justify-between items-center pt-2">
                            <Skeleton className="h-8 w-20" />
                            <Skeleton className="h-8 w-16" />
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

export function ModelSuggestions() {
  const { scenario, setActiveVehicle } = useScenario();
  const [suggestions, setSuggestions] =
    useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // This is a mock implementation that filters static data
    // The GenAI flow can be integrated here if needed
    setIsLoading(true);
    const getSuggestions = async () => {
        try {
            // Using static data for hackathon-realism and speed
            const affordableModels = vehicleData.filter(v => {
                const payment = calculateLoanPayment(v.msrp - scenario.downPayment, 0.05, 60);
                return payment <= scenario.monthlyBudget;
            }).map(v => ({
                ...v,
                modelName: v.modelName,
                keySpecs: v.keySpecs,
                estimatedPayment: calculateLoanPayment(v.msrp - scenario.downPayment, 0.05, 60),
                badges: v.badges,
            }));

            setSuggestions(affordableModels);

            // AI Implementation (can be swapped in)
            /*
            const result = await suggestModelsBasedOnAffordability({
              affordabilityCap: scenario.monthlyBudget,
            });
            setSuggestions(result.suggestedModels);
            */
        } catch (error) {
            console.error('Failed to get suggestions:', error);
            toast({
              variant: 'destructive',
              title: 'Error',
              description: 'Could not load vehicle suggestions.',
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    const debounce = setTimeout(getSuggestions, 500);
    return () => clearTimeout(debounce);

  }, [scenario.monthlyBudget, scenario.downPayment, toast]);

  const handleSelectVehicle = (model: any) => {
    const vehicleWithFullData = vehicleData.find(v => v.id === model.id);
    if(vehicleWithFullData) {
        setActiveVehicle(vehicleWithFullData);
        toast({
            title: `${vehicleWithFullData.modelName} selected!`,
            description: "Your finance vs. lease options have been updated."
        })
    }
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline">Vehicles in Your Budget</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 max-h-[70vh] overflow-y-auto">
        {isLoading && <LoadingSkeleton />}
        {!isLoading && suggestions && suggestions.length > 0 && (
          suggestions.map((model) => (
            <ModelCard key={model.id} model={model} onSelect={() => handleSelectVehicle(model)} />
          ))
        )}
        {!isLoading && (!suggestions || suggestions.length === 0) && (
            <p className="text-muted-foreground text-center py-8">No vehicles found for your budget. Try increasing your monthly budget.</p>
        )}
      </CardContent>
    </Card>
  );
}

// Dummy calculation function to be replaced with the one from lib
const calculateLoanPayment = (principal: number, apr: number, termMonths: number) => {
    if (principal <= 0) return 0;
    const monthlyRate = apr / 12;
    if (monthlyRate === 0) return principal / termMonths;
    return (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1);
}
