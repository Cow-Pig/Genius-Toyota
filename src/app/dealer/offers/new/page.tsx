'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useFirebase } from '@/firebase';
import { collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { FinancialOffer, OfferStatus, OfferType } from '@/types';
import { vehicleData } from '@/lib/data';
import { Header } from '@/components/dealer/Header';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { calculateLeasePayment, calculateLoanPayment } from '@/lib/calculations';
import { formatCurrency, formatPercent } from '@/lib/utils';

const offerSchema = z.object({
  vehicleId: z.string().min(1, { message: 'Please select a vehicle.' }),
  offerType: z.enum(['loan', 'lease']),
  status: z.enum(['draft', 'published']),
  msrp: z.coerce.number().positive('MSRP must be positive.'),
  incentives: z.coerce.number().min(0, 'Incentives cannot be negative.'),
  termMonths: z.coerce.number().int().positive('Term must be a positive number of months.'),
  fees: z.coerce.number().min(0, 'Fees cannot be negative.'),
  dueAtSigning: z.coerce.number().min(0, 'Due at signing cannot be negative.'),
  apr: z.coerce.number().optional(),
  moneyFactor: z.coerce.number().optional(),
  residualPercentage: z.coerce.number().optional(),
  mileageAllowance: z.coerce.number().optional(),
  offerDetails: z.string().optional(),
  validityHours: z.coerce.number().int().min(1, 'At least 1 hour').max(168, 'Keep offers under one week for demos.'),
  shopperEmail: z
    .string()
    .email('Enter a valid email or leave blank.')
    .optional()
    .or(z.literal('')),
});

type OfferFormValues = z.infer<typeof offerSchema>;

function useQuotePreview(values: OfferFormValues) {
  return useMemo(() => {
    const { offerType, msrp, incentives, fees, termMonths, dueAtSigning, apr, moneyFactor, residualPercentage, mileageAllowance } =
      values;

    const toNumber = (input: unknown, fallback: number) => {
      if (typeof input === 'number' && Number.isFinite(input)) {
        return input;
      }
      if (typeof input === 'string' && input.trim().length === 0) {
        return fallback;
      }
      const parsed = Number(input);
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    const normalizedMsrp = toNumber(msrp, 0);
    const normalizedIncentives = toNumber(incentives, 0);
    const normalizedFees = toNumber(fees, 0);
    const normalizedDueAtSigning = toNumber(dueAtSigning, 0);
    const normalizedTerm = Math.max(Math.round(toNumber(termMonths, 0)), 0);

    if (!normalizedMsrp || normalizedTerm <= 0) {
      return { payment: 0, narrative: 'Add pricing details to preview a payment.' };
    }

    if (offerType === 'lease') {
      const normalizedResidual = toNumber(residualPercentage, 60);
      const normalizedMoneyFactor = toNumber(moneyFactor, 0.0025);
      const normalizedMileage = Math.max(Math.round(toNumber(mileageAllowance, 12000)), 0);

      const payment = calculateLeasePayment(
        normalizedMsrp,
        normalizedResidual / 100,
        normalizedTerm,
        normalizedMoneyFactor,
      );
      const total = payment + normalizedFees / Math.max(normalizedTerm, 1);
      return {
        payment: total,
        narrative: `Assumes ${formatPercent(normalizedResidual / 100)} residual and ${normalizedMileage.toLocaleString()} mi/year.`,
      };
    }

    const normalizedApr = toNumber(apr, 6);
    const principal = Math.max(normalizedMsrp + normalizedFees - normalizedIncentives - normalizedDueAtSigning, 0);
    const payment = calculateLoanPayment(principal, normalizedApr / 100, normalizedTerm || 1);
    return {
      payment,
      narrative: `Payment reflects ${normalizedApr.toFixed(2)}% APR after ${formatCurrency(normalizedDueAtSigning)} due at signing.`,
    };
  }, [values]);
}

export default function NewOfferPage() {
  const { firestore, user } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<OfferFormValues>({
    resolver: zodResolver(offerSchema),
    defaultValues: {
      vehicleId: '',
      offerType: 'loan',
      status: 'draft',
      msrp: 0,
      termMonths: 36,
      incentives: 0,
      fees: 595,
      dueAtSigning: 2000,
      apr: 5.99,
      moneyFactor: 0.0025,
      residualPercentage: 60,
      mileageAllowance: 12000,
      offerDetails: '',
      validityHours: 48,
      shopperEmail: '',
    },
  });

  const watchAll = form.watch();
  const offerType = watchAll.offerType;
  const preview = useQuotePreview(watchAll as OfferFormValues);

  const onSubmit = async (data: OfferFormValues) => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Not authenticated' });
      return;
    }

    const selectedVehicle = vehicleData.find((v) => v.id === data.vehicleId);
    if (!selectedVehicle) {
      toast({ variant: 'destructive', title: 'Invalid vehicle' });
      return;
    }

    const validUntil = Timestamp.fromDate(new Date(Date.now() + data.validityHours * 60 * 60 * 1000));

    const offerToSave: Omit<FinancialOffer, 'id'> = {
      dealerId: user.uid,
      vehicleId: data.vehicleId,
      vehicleModelName: selectedVehicle.modelName,
      offerType: data.offerType as OfferType,
      status: data.status as OfferStatus,
      msrp: data.msrp,
      incentives: data.incentives,
      termMonths: data.termMonths,
      fees: data.fees,
      taxRate: 0.08,
      dueAtSigning: data.dueAtSigning,
      createdDate: serverTimestamp(),
      lastRevisedDate: serverTimestamp(),
      validUntil,
      shopperEmail: data.shopperEmail || undefined,
      offerDetails: data.offerDetails,
      ...(data.offerType === 'loan' && { apr: data.apr }),
      ...(data.offerType === 'lease' && {
        moneyFactor: data.moneyFactor,
        residualPercentage: data.residualPercentage,
        mileageAllowance: data.mileageAllowance ?? 12000,
      }),
    };

    const newDocPromise = addDocumentNonBlocking(collection(firestore, 'financialOffers'), offerToSave);
    if (newDocPromise) {
      newDocPromise.then((docRef) => {
        if (!docRef) return;
        addDocumentNonBlocking(collection(docRef, 'history'), {
          action: 'create',
          changedBy: user.uid,
          changedAt: serverTimestamp(),
          status: offerToSave.status,
          summary: `Offer created as ${offerToSave.status}`,
          snapshot: {
            msrp: offerToSave.msrp,
            termMonths: offerToSave.termMonths,
            dueAtSigning: offerToSave.dueAtSigning,
          },
        });
      });
    }

    toast({
      title: 'Offer creation queued',
      description: 'We saved the template and started the change log.',
    });
    router.push('/dealer/dashboard');
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Create New Financial Offer</CardTitle>
            <CardDescription>
              Configure term, pricing, and validity so this offer is demo-ready the moment it goes live.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="vehicleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a vehicle" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {vehicleData.map((v) => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.modelName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="offerType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Offer Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="loan">Loan</SelectItem>
                          <SelectItem value="lease">Lease</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="msrp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>MSRP</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="35000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="termMonths"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Term (Months)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="36" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {offerType === 'loan' ? (
                  <FormField
                    name="apr"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>APR (%)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="5.99" {...field} />
                        </FormControl>
                        <FormDescription>Enter as a percentage, e.g., 5.99.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <>
                    <FormField
                      name="residualPercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Residual Value (%)</FormLabel>
                          <FormControl>
                            <Input type="number" step="1" placeholder="60" {...field} />
                          </FormControl>
                          <FormDescription>Whole number (e.g., 60 for 60%).</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      name="moneyFactor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Money Factor</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.00001" placeholder="0.00250" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      name="mileageAllowance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Annual Mileage Allowance</FormLabel>
                          <FormControl>
                            <Input type="number" step="500" placeholder="12000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <FormField
                  name="incentives"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Incentives / Rebates</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="1000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="fees"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fees</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="595" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="dueAtSigning"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due at Signing</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="2000" {...field} />
                      </FormControl>
                      <FormDescription>Include down payment and first payment.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="validityHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Validity Window (hours)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="48" {...field} />
                      </FormControl>
                      <FormDescription>Controls when the offer auto-expires in the shopper portal.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="shopperEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Optional Shopper Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="jamie@example.com" {...field} />
                      </FormControl>
                      <FormDescription>We pre-fill this when you push to the shopper inbox later.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="md:col-span-2">
                  <FormField
                    name="offerDetails"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Offer Details (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="e.g., Limited-time loyalty rebate included for well-qualified customers."
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="md:col-span-2">
                  <Card className="bg-muted/40">
                    <CardHeader>
                      <CardTitle className="text-lg">Customer Preview</CardTitle>
                      <CardDescription>
                        This is the snapshot the shopper will see when you share the quote.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                      <p className="text-3xl font-semibold">
                        {formatCurrency(Number(preview.payment.toFixed(2)))}
                        <span className="text-base font-normal text-muted-foreground"> / month</span>
                      </p>
                      <p className="text-sm text-muted-foreground">{preview.narrative}</p>
                      <div className="grid gap-2 text-sm md:grid-cols-3">
                        <div>
                          <p className="text-xs uppercase text-muted-foreground">Term</p>
                          <p>{watchAll.termMonths} months</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase text-muted-foreground">Due at signing</p>
                          <p>{formatCurrency(watchAll.dueAtSigning ?? 0)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase text-muted-foreground">Offer expires</p>
                          <p>In {watchAll.validityHours} hours</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="md:col-span-2 flex flex-wrap justify-end gap-4">
                  <Button type="submit" onClick={() => form.setValue('status', 'draft')} variant="outline">
                    Save as Draft
                  </Button>
                  <Button type="submit" onClick={() => form.setValue('status', 'published')}>
                    Publish Offer
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
