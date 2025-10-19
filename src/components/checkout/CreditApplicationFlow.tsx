'use client';

import { useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useMockDataProvider } from '@/lib/mock-data-provider';
import type { MockCreditReport, VerificationStatus } from '@/types';
import { Loader2, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

const statusVariants: Record<VerificationStatus, 'default' | 'secondary' | 'destructive'> = {
  Pending: 'secondary',
  Verified: 'default',
  'Needs Attention': 'destructive',
};

function StatusBadge({ status }: { status: VerificationStatus }) {
  return <Badge variant={statusVariants[status]}>{status}</Badge>;
}

function formatReportDate(date: string) {
  try {
    return format(new Date(date), 'PP');
  } catch (error) {
    return date;
  }
}

const prequalSchema = z
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
    state: z.string().length(2, 'Use 2-letter code').toUpperCase(),
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
  })
  .transform((values) => ({
    ...values,
    state: values.state.toUpperCase(),
  }));

type PrequalFormValues = z.infer<typeof prequalSchema>;

export function CreditApplicationFlow() {
  const { fetchCreditReport } = useMockDataProvider();
  const [status, setStatus] = useState<VerificationStatus>('Pending');
  const [isPulling, setIsPulling] = useState(false);
  const [report, setReport] = useState<MockCreditReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPrequalOpen, setIsPrequalOpen] = useState(false);
  const [isSubmittingPrequal, setIsSubmittingPrequal] = useState(false);
  const [prequalSubmission, setPrequalSubmission] = useState<PrequalFormValues | null>(null);

  const form = useForm<PrequalFormValues>({
    resolver: zodResolver(prequalSchema),
    defaultValues: {
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
    },
  });

  const runSoftPull = async () => {
    setIsPulling(true);
    setError(null);

    try {
      const result = await fetchCreditReport();
      setReport(result);
      const needsAttention = result.score < 660 || result.scoreBand === 'Needs Attention';
      setStatus(needsAttention ? 'Needs Attention' : 'Verified');
      if (needsAttention) {
        setError('Score falls outside our preferred band. Flagged for dealer follow-up.');
      }
    } catch (err) {
      setReport(null);
      setStatus('Needs Attention');
      setError(err instanceof Error ? err.message : 'Unable to complete mock credit pull.');
    } finally {
      setIsPulling(false);
    }
  };

  const handleSoftPull = async () => {
    await runSoftPull();
  };

  const handlePrequalSubmit = async (values: PrequalFormValues) => {
    setIsSubmittingPrequal(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      setPrequalSubmission(values);
      setIsPrequalOpen(false);
      await runSoftPull();
    } finally {
      setIsSubmittingPrequal(false);
    }
  };

  const tradelines = useMemo(() => report?.tradelines ?? [], [report]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Credit Application</CardTitle>
            <CardDescription>
              Run a soft pull across our mock bureaus to pre-qualify without impacting the shopper's score.
            </CardDescription>
          </div>
          <StatusBadge status={status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>We never store credentials. Shopper can revoke access anytime.</p>
            <div className="flex items-center gap-2 text-xs">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>Soft pull only • masked PII • instant delete available</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => setIsPrequalOpen(true)} className="w-full sm:w-auto">
              Get prequalified
            </Button>
            <Button onClick={handleSoftPull} disabled={isPulling} variant="outline" className="w-full sm:w-auto">
              {isPulling ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running soft pull…
                </span>
              ) : (
                'Run mock soft pull'
              )}
            </Button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-amber-600">{error}</p>
        )}

        {prequalSubmission && (
          <div className="rounded-lg border bg-muted/40 p-4 text-sm">
            <p className="font-semibold">Pre-qualification submitted</p>
            <p className="text-muted-foreground">
              {prequalSubmission.firstName} {prequalSubmission.lastName} · {prequalSubmission.city}, {prequalSubmission.state}
            </p>
            <p className="text-xs text-muted-foreground">
              Monthly income {prequalSubmission.monthlyIncome} · Housing payment {prequalSubmission.housingPayment}
            </p>
          </div>
        )}

        {report && (
          <div className="space-y-4 rounded-lg border bg-muted/40 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">Applicant</p>
                <p className="text-lg font-semibold">{report.applicantName}</p>
                <p className="text-xs text-muted-foreground">Report date {formatReportDate(report.reportDate)}</p>
              </div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Credit Score</span>
                <span className="text-4xl font-bold text-primary">{report.score}</span>
                <Badge variant="outline">{report.scoreBand}</Badge>
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-sm font-semibold">Tradeline Snapshot</p>
              <ScrollArea className="max-h-60">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bureau</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Opened</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tradelines.map((line, index) => (
                      <TableRow key={`${line.bureau}-${line.accountType}-${index}`}>
                        <TableCell>{line.bureau}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{line.accountType}</span>
                            <span className="text-xs text-muted-foreground">Status: {line.paymentStatus}</span>
                          </div>
                        </TableCell>
                        <TableCell>{line.openedDate}</TableCell>
                        <TableCell className="text-right">${line.balance.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </div>
        )}
      </CardContent>

      <Dialog open={isPrequalOpen} onOpenChange={setIsPrequalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Get prequalified</DialogTitle>
            <DialogDescription>
              Provide a few details so we can tee up a personalized credit pre-qualification. This will initiate a soft pull only.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              className="space-y-6"
              onSubmit={form.handleSubmit(handlePrequalSubmit)}
            >
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

              <p className="text-xs text-muted-foreground">
                By submitting this form you acknowledge that we will acquire your credit report for pre-qualification.
              </p>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsPrequalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmittingPrequal}>
                  {isSubmittingPrequal ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
                    </span>
                  ) : (
                    'Submit and run soft pull'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
