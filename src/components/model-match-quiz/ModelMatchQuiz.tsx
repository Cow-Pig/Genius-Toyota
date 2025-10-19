'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  suggestModelsFromQuiz,
} from '@/ai/flows/suggest-models-from-quiz';
import type { SuggestModelsFromQuizInput, SuggestModelsFromQuizOutput } from '@/types/quiz';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useScenario } from '@/hooks/use-scenario';
import { vehicleData } from '@/lib/data';
import { ToyotaLogo } from '../icons/ToyotaLogo';
import { QuizQuestionCard } from './QuizQuestionCard';
import { QuizResults } from './QuizResults';

type QuizRequest = Omit<SuggestModelsFromQuizInput, 'availableVehicles'>;
type QuizAnswers = Partial<QuizRequest>;

const questions = [
  {
    step: 0,
    field: 'passengers',
    title: 'How many people will you typically be driving with?',
    options: ['Just me', '1-2', '3-4', '5+'],
  },
  {
    step: 1,
    field: 'primaryUse',
    title: 'What will be the primary use of your new vehicle?',
    options: ['Daily Commuting', 'Family Outings', 'Adventure & Outdoors', 'Work & Hauling'],
  },
  {
    step: 2,
    field: 'commute',
    title: 'How long is your average daily round-trip commute?',
    options: ['Under 20 miles', '20-50 miles', '50+ miles', 'Varies Greatly'],
  },
  {
    step: 3,
    field: 'fuelPreference',
    title: 'Are you interested in a Hybrid vehicle?',
    options: ['Yes, priority on MPG', 'Open to it', 'No, I prefer Gas'],
  },
  {
    step: 4,
    field: 'priorities',
    title: 'What matters most to you in a new car? (Select up to 2)',
    options: ['Latest Technology', 'Top-tier Safety', 'Towing & Performance', 'Cargo Space', 'Fuel Efficiency'],
    isMultiSelect: true,
    maxSelections: 2,
  },
];

export function ModelMatchQuiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SuggestModelsFromQuizOutput | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const { setActiveVehicle } = useScenario();

  const handleAnswer = (field: keyof QuizAnswers, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [field]: value }));
    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleMultiSelectAnswer = (field: keyof QuizAnswers, value: string) => {
    const currentValues = (answers[field] as string[] || []) as string[];
    const maxSelections = questions[step].maxSelections;
    let newValues;

    if (currentValues.includes(value)) {
      newValues = currentValues.filter((v) => v !== value);
    } else if (!maxSelections || currentValues.length < maxSelections) {
      newValues = [...currentValues, value];
    } else {
        toast({
            variant: 'destructive',
            title: `You can only select up to ${maxSelections} options.`,
        });
        return; // Do not update state if max selections reached
    }
    setAnswers((prev) => ({ ...prev, [field]: newValues }));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
        const finalAnswers: QuizRequest = {
            passengers: (answers.passengers as string) || '',
            primaryUse: (answers.primaryUse as string) || '',
            commute: (answers.commute as string) || '',
            fuelPreference: (answers.fuelPreference as string) || '',
            priorities: (answers.priorities as string[]) || [],
        };

      const res = await suggestModelsFromQuiz(finalAnswers);
      setResults(res);
    } catch (error) {
      console.error('Error getting suggestions:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not get recommendations. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectVehicle = (modelName: string) => {
    const vehicle = vehicleData.find(v => v.modelName.toLowerCase() === modelName.toLowerCase());
    if (vehicle) {
      setActiveVehicle(vehicle);
      toast({
        title: `${vehicle.modelName} selected!`,
        description: "We've sent you back to the Finance Navigator.",
      });
      router.push('/');
    }
  };

  const progress = (step / questions.length) * 100;
  const currentQuestion = questions[step];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <ToyotaLogo className="h-12 w-auto text-primary mb-4" />
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <h2 className="text-2xl font-headline text-center mb-2">Finding Your Perfect Match...</h2>
        <p className="text-muted-foreground text-center">Our AI is analyzing your preferences.</p>
      </div>
    );
  }

  if (results) {
    return <QuizResults results={results} onSelectVehicle={handleSelectVehicle} onRestart={() => { setResults(null); setStep(0); setAnswers({})}} />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-2xl">
        <header className="text-center mb-8">
            <ToyotaLogo className="h-8 w-auto text-primary mx-auto mb-4" />
            <h1 className="text-3xl font-bold font-headline mb-2">Model Match Quiz</h1>
            <p className="text-muted-foreground">Answer a few questions to find your perfect Toyota.</p>
        </header>

        <Progress value={progress} className="w-full mb-8 h-2" />
        
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <QuizQuestionCard
              question={currentQuestion.title}
              options={currentQuestion.options}
              isMultiSelect={currentQuestion.isMultiSelect || false}
              selectedOptions={answers[currentQuestion.field as keyof QuizAnswers] as string[] | string || []}
              onAnswer={(value) => handleAnswer(currentQuestion.field as keyof QuizAnswers, value)}
              onMultiSelectAnswer={(value) => handleMultiSelectAnswer(currentQuestion.field as keyof QuizAnswers, value)}
            />
          </motion.div>
        </AnimatePresence>

        <footer className="mt-8 flex justify-between items-center">
            <Button
                variant="ghost"
                onClick={() => setStep(Math.max(0, step - 1))}
                disabled={step === 0}
            >
                Back
            </Button>
            {currentQuestion.isMultiSelect && (
                 <Button onClick={handleSubmit} disabled={(answers.priorities as string[] || []).length === 0}>
                    Finish & See Results
                </Button>
            )}
        </footer>
      </div>
    </div>
  );
}
