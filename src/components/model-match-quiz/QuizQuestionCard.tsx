'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface QuizQuestionCardProps {
  question: string;
  options: string[];
  isMultiSelect: boolean;
  selectedOptions: string[] | string;
  onAnswer: (value: string) => void;
  onMultiSelectAnswer: (value: string) => void;
}

export function QuizQuestionCard({
  question,
  options,
  isMultiSelect,
  selectedOptions,
  onAnswer,
  onMultiSelectAnswer,
}: QuizQuestionCardProps) {
  return (
    <Card className="w-full shadow-xl border-t-4 border-primary">
      <CardHeader>
        <CardTitle className="text-xl md:text-2xl text-center font-headline">{question}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {options.map((option) => {
            const isSelected = isMultiSelect
              ? (selectedOptions as string[]).includes(option)
              : selectedOptions === option;

            return (
              <Button
                key={option}
                variant="outline"
                className={cn(
                  'h-auto py-4 text-base whitespace-normal justify-start',
                  isSelected && 'ring-2 ring-primary bg-primary/10'
                )}
                onClick={() => (isMultiSelect ? onMultiSelectAnswer(option) : onAnswer(option))}
              >
                {isMultiSelect && <div className={cn("mr-2 h-5 w-5 rounded-sm border border-primary flex items-center justify-center", isSelected && 'bg-primary text-white')}>
                   {isSelected && <Check className="h-4 w-4"/>}
                </div>}
                {option}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
