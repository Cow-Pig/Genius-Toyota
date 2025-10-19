'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
import { useDoc, useFirebase, useMemoFirebase, useCollection } from '@/firebase';
import {
  collection,
  doc,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { FinancialOffer, OfferStatus, OfferType } from '@/types';
import { vehicleData } from '@/lib/data';
import { Header } from '@/components/dealer/Header';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Loader2 } from 'lucide-react';
import { calculateLeasePayment, calculateLoanPayment } from '@/lib/calculations';
import { formatCurrency, formatPercent } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

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
  validityHours: z.coerce.number().int().min(1).max(168),
  shopperEmail: z
    .string()
    .email('Enter a valid email or leave blank.')
    .optional()
    .or(z.literal('')),
});

type OfferFormValues = z.infer<typeof offerSchema>;

function computePreview(values: OfferFormValues) {
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
    return { payment: 0, narrative: 'Complete pricing inputs to preview the monthly payment.' };
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
      narrative: `Using ${formatPercent(normalizedResidual / 100)} residual and ${normalizedMileage.toLocaleString()} mi/year.`,
    };
  }

  const normalizedApr = toNumber(apr, 6);
  const principal = Math.max(normalizedMsrp + normalizedFees - normalizedIncentives - normalizedDueAtSigning, 0);
  const payment = calculateLoanPayment(principal, normalizedApr / 100, normalizedTerm || 1);
  return {
    payment,
    narrative: `Includes ${normalizedApr.toFixed(2)}% APR after ${formatCurrency(normalizedDueAtSigning)} due at signing.`,
  };
}

function formatHistoryDate(value: unknown) {
  if (value instanceof Timestamp) {
    return value.toDate().toLocaleString();
  }
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    const seconds = (value as { seconds: number }).seconds;
    return new Date(seconds * 1000).toLocaleString();
  }
  return '—';
}

export default function EditOfferPage() {
  const { firestore, user } = useFirebase();
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const { toast } = useToast();
  const [isPushOpen, setIsPushOpen] = useState(false);
  const [pushEmail, setPushEmail] = useState('');
  const [pushValidity, setPushValidity] = useState(24);

  const offerRef = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    return doc(firestore, 'financialOffers', id as string);
  }, [firestore, id]);

  const historyQuery = useMemoFirebase(() => {
    if (!offerRef) return null;
    return query(collection(offerRef, 'history'), orderBy('changedAt', 'desc'));
  }, [offerRef]);

  const { data: offer, isLoading: isOfferLoading } = useDoc<FinancialOffer>(offerRef);
  const { data: history } = useCollection<{ action: string; changedAt?: any; summary: string; status: string; changedBy?: string }>(historyQuery);

  const form = useForm<OfferFormValues>({
    resolver: zodResolver(offerSchema),
    defaultValues: {
      vehicleId: '',
      offerType: 'loan',
      status: 'draft',
      msrp: 0,
      termMonths: 36,
      incentives: 0,
      fees: 0,
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

  useEffect(() => {
    if (offer) {
      if (offer.dealerId !== user?.uid) {
        toast({ variant: 'destructive', title: 'Permission denied' });
        router.replace('/dealer/dashboard');
        return;
      }

      const resolveTimestamp = (value: FinancialOffer['validUntil']) => {
        if (!value) return undefined;
        if (value instanceof Date) return value;
        if (value instanceof Timestamp) return value.toDate();
        if (
          typeof value === 'object' &&
          value !== null &&
          'toDate' in value &&
          typeof (value as { toDate?: unknown }).toDate === 'function'
        ) {
          return (value as Timestamp).toDate();
        }
        if (typeof value === 'object' && value !== null && 'seconds' in value) {
          return new Date((value as { seconds: number }).seconds * 1000);
        }
        return undefined;
      };

      const validUntilDate = resolveTimestamp(offer.validUntil) ?? new Date(Date.now() + 48 * 60 * 60 * 1000);
      const hoursRemaining = Math.max(
        Math.round((validUntilDate.getTime() - Date.now()) / (60 * 60 * 1000)),
        1,
      );

      const normalizedOfferType = offer.offerType === 'lease' ? 'lease' : 'loan';
      const normalizedStatus = offer.status === 'published' ? 'published' : 'draft';

      form.reset({
        vehicleId: offer.vehicleId ?? '',
        offerType: normalizedOfferType,
        status: normalizedStatus,
        msrp: offer.msrp,
        incentives: offer.incentives ?? 0,
        termMonths: offer.termMonths,
        fees: offer.fees ?? 0,
        dueAtSigning: offer.dueAtSigning ?? 2000,
        apr: offer.apr ?? 5.99,
        moneyFactor: offer.moneyFactor ?? 0.0025,
        residualPercentage: offer.residualPercentage ?? 60,
        mileageAllowance: offer.mileageAllowance ?? 12000,
        offerDetails: offer.offerDetails ?? '',
        validityHours: hoursRemaining,
        shopperEmail: offer.shopperEmail ?? '',
      });
      setPushEmail(offer.shopperEmail ?? '');
      setPushValidity(hoursRemaining);
    }
  }, [offer, form, router, toast, user?.uid]);

  const watchValues = form.watch();
  const preview = useMemo(() => computePreview(watchValues as OfferFormValues), [watchValues]);

  const onSubmit = async (data: OfferFormValues) => {
    if (!user || !firestore || !offerRef) {
      toast({ variant: 'destructive', title: 'Not authenticated or offer not found' });
      return;
    }

    const selectedVehicle = vehicleData.find((v) => v.id === data.vehicleId);
    if (!selectedVehicle) {
      toast({ variant: 'destructive', title: 'Invalid vehicle' });
      return;
    }

    const validUntil = Timestamp.fromDate(new Date(Date.now() + data.validityHours * 60 * 60 * 1000));

    const offerUpdates: Partial<FinancialOffer> = {
      vehicleId: data.vehicleId,
      vehicleModelName: selectedVehicle.modelName,
      offerType: data.offerType as OfferType,
      status: data.status as OfferStatus,
      msrp: data.msrp,
      incentives: data.incentives,
      termMonths: data.termMonths,
      fees: data.fees,
      dueAtSigning: data.dueAtSigning,
      shopperEmail: data.shopperEmail || undefined,
      offerDetails: data.offerDetails,
      validUntil,
      lastRevisedDate: serverTimestamp(),
      ...(data.offerType === 'loan'
        ? { apr: data.apr, moneyFactor: undefined, residualPercentage: undefined, mileageAllowance: undefined }
        : {
            moneyFactor: data.moneyFactor,
            residualPercentage: data.residualPercentage,
            mileageAllowance: data.mileageAllowance,
            apr: undefined,
          }),
    };

    updateDocumentNonBlocking(offerRef, offerUpdates);

    const changedFields: string[] = [];
    if (offer) {
      const comparisons: Array<[keyof OfferFormValues, string]> = [
        ['msrp', 'MSRP'],
        ['termMonths', 'term'],
        ['incentives', 'incentives'],
        ['fees', 'fees'],
        ['dueAtSigning', 'due at signing'],
        ['validityHours', 'validity window'],
      ];
      comparisons.forEach(([field, label]) => {
        if ((offer as any)[field] !== (data as any)[field]) {
          changedFields.push(label);
        }
      });
    }

    addDocumentNonBlocking(collection(offerRef, 'history'), {
      action: 'update',
      changedBy: user.uid,
      changedAt: serverTimestamp(),
      status: data.status,
      summary:
        changedFields.length > 0
          ? `Updated ${changedFields.join(', ')} and set status to ${data.status}.`
          : `Status confirmed as ${data.status}.`,
    });

    toast({
      title: 'Offer update queued',
      description: 'Revisions are being synced to the shopper experience.',
    });
    router.push('/dealer/dashboard');
  };

  const handlePushToShopper = () => {
    if (!firestore || !offerRef || !user || !id) return;
    const targetEmail = pushEmail || form.getValues('shopperEmail') || '';
    if (!targetEmail) {
      toast({ variant: 'destructive', title: 'Add an email before pushing the offer.' });
      return;
    }
    const validUntil = Timestamp.fromDate(new Date(Date.now() + pushValidity * 60 * 60 * 1000));

    addDocumentNonBlocking(collection(firestore, 'offerDeliveries'), {
      financialOfferId: id,
      dealerId: user.uid,
      shopperEmail: targetEmail,
      status: 'pending',
      createdAt: serverTimestamp(),
      validUntil,
    });
    updateDocumentNonBlocking(offerRef, {
      shopperEmail: targetEmail,
      validUntil,
      status: 'published',
      lastRevisedDate: serverTimestamp(),
    });
    addDocumentNonBlocking(collection(offerRef, 'history'), {
      action: 'push',
      changedBy: user.uid,
      changedAt: serverTimestamp(),
      status: 'published',
      summary: `Shared with ${targetEmail} (valid ${pushValidity}h).`,
    });
    toast({ title: 'Offer sent', description: `Shared with ${targetEmail}.` });
    setIsPushOpen(false);
  };

  if (isOfferLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="flex h-screen w-full flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <p>Offer not found.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Edit Financial Offer</CardTitle>
            <CardDescription>
              Adjust pricing, term, and validity. All revisions are tracked in the history log below.
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
                        <Input type="number" {...field} />
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
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchValues.offerType === 'loan' ? (
                  <FormField
                    name="apr"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>APR (%)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
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
                            <Input type="number" step="1" {...field} />
                          </FormControl>
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
                            <Input type="number" step="0.00001" {...field} />
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
                            <Input type="number" step="500" {...field} />
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
                        <Input type="number" {...field} />
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
                        <Input type="number" {...field} />
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
                        <Input type="number" {...field} />
                      </FormControl>
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
                        <Input type="number" {...field} />
                      </FormControl>
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
                        <Input type="email" {...field} />
                      </FormControl>
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
                          <Textarea rows={4} {...field} />
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
                      <CardDescription>Live payment and expiration snapshot shared with shoppers.</CardDescription>
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
                          <p>{watchValues.termMonths} months</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase text-muted-foreground">Due at signing</p>
                          <p>{formatCurrency(watchValues.dueAtSigning ?? 0)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase text-muted-foreground">Offer expires</p>
                          <p>In {watchValues.validityHours} hours</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="md:col-span-2 flex flex-wrap justify-end gap-4">
                  <Button type="button" variant="outline" onClick={() => setIsPushOpen(true)}>
                    Push to Shopper
                  </Button>
                  <Button type="submit" onClick={() => form.setValue('status', 'draft')} variant="outline">
                    Save as Draft
                  </Button>
                  <Button type="submit" onClick={() => form.setValue('status', 'published')}>
                    Publish Updates
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change History</CardTitle>
            <CardDescription>Everything logged for compliance—timestamps, actors, and summaries.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {history && history.length > 0 ? (
              history.map((entry, index) => (
                <div key={`${entry.summary}-${index}`} className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatHistoryDate(entry.changedAt)}</span>
                    <Badge variant={entry.status === 'published' ? 'default' : 'secondary'}>{entry.status}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-foreground">{entry.summary}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No history yet. Updates will appear here automatically.</p>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={isPushOpen} onOpenChange={setIsPushOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Push Offer to Shopper</DialogTitle>
            <DialogDescription>
              We'll send the latest quote to the shopper inbox and refresh the expiration window.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="push-email">Shopper email</Label>
              <Input
                id="push-email"
                type="email"
                value={pushEmail}
                onChange={(event) => setPushEmail(event.target.value)}
                placeholder="jamie@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="push-validity">Validity (hours)</Label>
              <Input
                id="push-validity"
                type="number"
                min={1}
                max={168}
                value={pushValidity}
                onChange={(event) => setPushValidity(Number(event.target.value))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPushOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePushToShopper}>Send Offer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
