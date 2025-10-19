'use client';

import type { SuggestModelsFromQuizOutput } from '@/types/quiz';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { ToyotaLogo } from '../icons/ToyotaLogo';
import { ArrowRight, RefreshCw } from 'lucide-react';

interface QuizResultsProps {
  results: SuggestModelsFromQuizOutput;
  onSelectVehicle: (modelName: string) => void;
  onRestart: () => void;
}

export function QuizResults({ results, onSelectVehicle, onRestart }: QuizResultsProps) {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
        <header className="text-center mb-10">
            <ToyotaLogo className="h-8 w-auto text-primary mx-auto mb-4" />
            <h1 className="text-4xl font-bold font-headline mb-2">We Found Your Matches!</h1>
            <p className="text-lg text-muted-foreground">Based on your answers, here are the top recommendations for you.</p>
        </header>

      <div className="container mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {results.recommendedModels.map((model) => (
          <Card key={model.modelName} className="flex flex-col overflow-hidden hover:shadow-2xl transition-shadow duration-300 group">
            <CardHeader className="p-0">
                <div className='bg-primary/10 p-4'>
                    <p className="text-primary font-semibold text-center">{model.rationale}</p>
                </div>
              <div className="relative h-48 w-full">
                <Image
                  src={model.photoUrl}
                  alt={model.modelName}
                  fill
                  className="object-cover"
                />
              </div>
            </CardHeader>
            <CardContent className="p-6 flex-grow flex flex-col">
              <h3 className="text-2xl font-bold font-headline">{model.modelName}</h3>
              <p className="text-sm text-muted-foreground flex-grow">{model.keySpecs}</p>
              <div className="flex flex-wrap gap-2 my-4">
                {model.badges.map((badge) => (
                  <Badge key={badge} variant="secondary">
                    {badge}
                  </Badge>
                ))}
              </div>
              <div className="flex justify-between items-center mt-4">
                <div>
                  <p className="text-sm text-muted-foreground">Starts at</p>
                  <p className="font-bold text-xl">
                    {formatCurrency(model.estimatedPayment)}
                    <span className="text-sm font-normal">/mo</span>
                  </p>
                </div>
                <Button onClick={() => onSelectVehicle(model.modelName)} size="lg">
                  Use in Offer <ArrowRight className="ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <footer className="text-center mt-12">
            <Button onClick={onRestart} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Start Over
            </Button>
      </footer>
    </div>
  );
}
