'use client';

import { useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

export const prequalSchema = z
  .object({
    firstName: z.string().min(1, 'Required'),
    lastName: z.string().min(1, 'Required'),
    email: z.string().email('Enter a valid email'),
    phone: z
      .string()
      .min(10, 'Enter a phone number')
      .regex(/^[0-9\-+()\s]+$/, 'Only digits and phone characters are allowed'),
    street: z.string().min(1, 'Required'),
    city: z.string().min(1, 'Required'),
    state: z.string().length(2, 'Use 2-letter code').transform((value) => value.toUpperCase()),
    zip: z.string().regex(/^\d{5}$/, '5 digit ZIP'),
    dob: z.string().min(1, 'Required'),
    ssnLast4: z.string().regex(/^\d{4}$/, 'Enter last 4 digits'),
    monthlyIncome: z.string().min(1, 'Required'),
    housingPayment: z.string().min(1, 'Required'),
    employmentStatus: z.string().min(1, 'Required'),
    notes: z.string().optional(),
    consent: z
      .boolean()
      .refine((value) => value, {
        message: 'You must acknowledge credit pull consent.',
      }),
  });

export type PrequalFormValues = z.infer<typeof prequalSchema>;

export const defaultPrequalValues: PrequalFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  street: '',
  city: '',
  state: 'CA',
  zip: '',
  dob: '',
  ssnLast4: '',
  monthlyIncome: '',
  housingPayment: '',
  employmentStatus: 'Full-time',
  notes: '',
  consent: false,
};

interface PrequalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: PrequalFormValues) => Promise<void> | void;
  isSubmitting?: boolean;
  initialValues?: PrequalFormValues;
}

export function PrequalDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
  initialValues,
}: PrequalDialogProps) {
  const values = useMemo(() => initialValues ?? defaultPrequalValues, [initialValues]);

  const form = useForm<PrequalFormValues>({
    resolver: zodResolver(prequalSchema),
    defaultValues: defaultPrequalValues,
    values,
  });

  const handleSubmit = async (data: PrequalFormValues) => {
    await onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden p-0">
        <div className="flex h-full flex-col">
          <DialogHeader className="space-y-2 px-6 pt-6">
            <DialogTitle>Get prequalified</DialogTitle>
            <DialogDescription>
              Provide a few details so we can tee up a personalized credit pre-qualification. This will initiate a soft pull only.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              className="flex flex-1 flex-col gap-4 px-6 pb-6"
              onSubmit={form.handleSubmit(handleSubmit)}
              noValidate
            >
              <ScrollArea className="flex-1 -mr-4 pr-4">
                <div className="space-y-6 pb-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First name</FormLabel>
                        <FormControl>
                          <Input {...field} autoComplete="given-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last name</FormLabel>
                        <FormControl>
                          <Input {...field} autoComplete="family-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" autoComplete="email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input {...field} autoComplete="tel" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dob"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of birth</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ssnLast4"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SSN (last 4)</FormLabel>
                        <FormControl>
                          <Input {...field} inputMode="numeric" autoComplete="off" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="street"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Street address</FormLabel>
                        <FormControl>
                          <Input {...field} autoComplete="address-line1" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input {...field} autoComplete="address-level2" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input {...field} maxLength={2} autoComplete="address-level1" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="zip"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP</FormLabel>
                        <FormControl>
                          <Input {...field} inputMode="numeric" autoComplete="postal-code" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="employmentStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employment status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Full-time">Full-time</SelectItem>
                            <SelectItem value="Part-time">Part-time</SelectItem>
                            <SelectItem value="Self-employed">Self-employed</SelectItem>
                            <SelectItem value="Contractor">Contractor</SelectItem>
                            <SelectItem value="Retired">Retired</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="monthlyIncome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly gross income</FormLabel>
                        <FormControl>
                          <Input {...field} inputMode="decimal" placeholder="$7,500" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="housingPayment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly housing payment</FormLabel>
                        <FormControl>
                          <Input {...field} inputMode="decimal" placeholder="$2,100" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Notes for the dealer (optional)</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} placeholder="Share any context about your credit or employment." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="consent"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-start space-x-2">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="text-sm font-normal">
                          I authorize the dealer to obtain my credit report for pre-qualification purposes.
                        </FormLabel>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              </ScrollArea>

              <p className="text-xs text-muted-foreground leading-relaxed">
                By submitting this form you acknowledge that we will acquire your credit report for pre-qualification.
              </p>

              <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-end sm:gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="sm:min-w-[120px]"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="sm:min-w-[180px]">
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
                    </span>
                  ) : (
                    'Submit and run soft pull'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
