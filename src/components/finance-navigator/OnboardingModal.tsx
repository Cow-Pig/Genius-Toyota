'use client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useScenario } from '@/hooks/use-scenario';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { creditTiers } from '@/lib/data';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Slider } from '../ui/slider';
import { formatCurrency } from '@/lib/utils';
import { useEffect } from 'react';

const onboardingSchema = z.object({
  zipCode: z.string().min(5, 'Must be 5 digits').max(5, 'Must be 5 digits'),
  creditScoreTier: z.string(),
  downPayment: z.number().min(0),
  tradeInValue: z.number().min(0),
  monthlyBudget: z.number().min(100).max(5000),
});

export function OnboardingModal() {
  const { scenario, updateScenario, isOnboarded, setOnboardingOpen } =
    useScenario();

  const form = useForm<z.infer<typeof onboardingSchema>>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: scenario,
  });

  useEffect(() => {
    form.reset(scenario);
  }, [scenario, form]);

  function onSubmit(values: z.infer<typeof onboardingSchema>) {
    updateScenario(values);
    setOnboardingOpen(false);
  }

  return (
    <Dialog open={!isOnboarded} onOpenChange={setOnboardingOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-headline">
            Welcome to the Toyota Finance Navigator
          </DialogTitle>
          <DialogDescription>
            Answer a few questions to get a personalized financial plan.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4"
          >
            <FormField
              control={form.control}
              name="zipCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ZIP Code</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 90210" {...field} />
                  </FormControl>
                  <FormDescription>
                    Used to calculate local taxes and fees.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="creditScoreTier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Credit Score</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your credit score range" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {creditTiers.map((tier) => (
                        <SelectItem key={tier.tier} value={tier.tier}>
                          {tier.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Helps estimate your interest rates.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="downPayment"
              render={({ field: { onChange, value, ...rest } }) => (
                <FormItem>
                  <FormLabel>Down Payment</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="e.g., 5000"
                      value={value}
                      onChange={(e) =>
                        onChange(parseInt(e.target.value, 10) || 0)
                      }
                      {...rest}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tradeInValue"
              render={({ field: { onChange, value, ...rest } }) => (
                <FormItem>
                  <FormLabel>Trade-in Value (optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="e.g., 2500"
                      value={value}
                      onChange={(e) =>
                        onChange(parseInt(e.target.value, 10) || 0)
                      }
                      {...rest}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="md:col-span-2">
              <FormField
                control={form.control}
                name="monthlyBudget"
                render={({ field: { value, onChange } }) => (
                  <FormItem>
                    <FormLabel>Target Monthly Budget</FormLabel>
                    <div className="flex items-center gap-4">
                        <FormControl>
                            <Slider
                                min={200}
                                max={2000}
                                step={25}
                                value={[value]}
                                onValueChange={(vals) => onChange(vals[0])}
                                className="flex-1"
                            />
                        </FormControl>
                        <Input
                            type="text"
                            value={formatCurrency(value)}
                            readOnly
                            className="w-28 text-center font-mono"
                        />
                    </div>
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="md:col-span-2 mt-4">
              <Button type="submit" className="w-full md:w-auto">
                Let's Go!
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
