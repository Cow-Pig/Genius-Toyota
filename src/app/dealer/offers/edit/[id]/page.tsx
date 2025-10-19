'use client';

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
import { useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { FinancialOffer, OfferStatus, OfferType } from '@/types';
import { vehicleData } from '@/lib/data';
import { Header } from '@/components/dealer/Header';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const offerSchema = z.object({
  vehicleId: z.string().min(1, { message: 'Please select a vehicle.' }),
  offerType: z.enum(['loan', 'lease']),
  status: z.enum(['draft', 'published']),
  msrp: z.coerce.number().positive('MSRP must be positive.'),
  incentives: z.coerce.number().min(0, 'Incentives cannot be negative.'),
  termMonths: z.coerce.number().int().positive('Term must be a positive number of months.'),
  fees: z.coerce.number().min(0, 'Fees cannot be negative.'),
  apr: z.coerce.number().optional(),
  moneyFactor: z.coerce.number().optional(),
  residualPercentage: z.coerce.number().optional(),
  offerDetails: z.string().optional(),
});

type OfferFormValues = z.infer<typeof offerSchema>;

export default function EditOfferPage() {
  const { firestore, user } = useFirebase();
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const { toast } = useToast();

  const offerRef = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    return doc(firestore, 'financialOffers', id as string);
  }, [firestore, id]);

  const { data: offer, isLoading: isOfferLoading } = useDoc<FinancialOffer>(offerRef);

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
      apr: 0,
      moneyFactor: 0,
      residualPercentage: 0,
      offerDetails: '',
    },
  });

  useEffect(() => {
    if (offer) {
      // Ensure user has permission
      if (offer.dealerId !== user?.uid) {
        toast({ variant: 'destructive', title: 'Permission Denied' });
        router.replace('/dealer/dashboard');
        return;
      }
      form.reset({
        ...offer,
        apr: offer.apr || 0,
        moneyFactor: offer.moneyFactor || 0,
        residualPercentage: offer.residualPercentage || 0,
        offerDetails: offer.offerDetails || '',
      });
    }
  }, [offer, form, user, router, toast]);

  const offerType = form.watch('offerType');

  const onSubmit = async (data: OfferFormValues) => {
    if (!user || !firestore || !offerRef) {
      toast({ variant: 'destructive', title: 'Not authenticated or offer not found' });
      return;
    }

    const selectedVehicle = vehicleData.find(v => v.id === data.vehicleId);
    if (!selectedVehicle) {
        toast({ variant: 'destructive', title: 'Invalid Vehicle' });
        return;
    }

    const offerToUpdate = {
      ...data,
      vehicleModelName: selectedVehicle.modelName,
      lastRevisedDate: serverTimestamp(),
    };

    updateDocumentNonBlocking(offerRef, offerToUpdate);
    toast({
        title: 'Offer Update Initiated',
        description: 'The financial offer is being saved.',
    });
    router.push('/dealer/dashboard');
  };

  if (isOfferLoading) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
  }

  if (!offer) {
    return (
        <div className="flex h-screen w-full flex-col">
            <Header />
            <main className="flex flex-1 items-center justify-center">
                <p>Offer not found.</p>
            </main>
        </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <Card>
                <CardHeader>
                    <CardTitle>Edit Financial Offer</CardTitle>
                    <CardDescription>
                    Update the details for this lease or loan offer.
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
                                    {vehicleData.map(v => (
                                        <SelectItem key={v.id} value={v.id}>{v.modelName}</SelectItem>
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

                        <FormField name="msrp" render={({ field }) => (
                            <FormItem>
                                <FormLabel>MSRP</FormLabel>
                                <FormControl><Input type="number" placeholder="35000" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField name="termMonths" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Term (Months)</FormLabel>
                                <FormControl><Input type="number" placeholder="36" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        {offerType === 'loan' ? (
                             <FormField name="apr" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>APR (%)</FormLabel>
                                    <FormControl><Input type="number" step="0.01" placeholder="4.9" {...field} /></FormControl>
                                    <FormDescription>Enter as a percentage, e.g., 4.9 for 4.9%.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        ) : (
                            <>
                                <FormField name="residualPercentage" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Residual Value (%)</FormLabel>
                                        <FormControl><Input type="number" step="1" placeholder="65" {...field} /></FormControl>
                                        <FormDescription>Enter as a whole number, e.g., 65 for 65%.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField name="moneyFactor" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Money Factor</FormLabel>
                                        <FormControl><Input type="number" step="0.00001" placeholder="0.00250" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </>
                        )}

                        <FormField name="incentives" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Incentives/Rebates</FormLabel>
                                <FormControl><Input type="number" placeholder="1000" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField name="fees" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Fees</FormLabel>
                                <FormControl><Input type="number" placeholder="595" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        
                        <div className="md:col-span-2">
                            <FormField name="offerDetails" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Offer Details (Optional)</FormLabel>
                                    <FormControl><Textarea placeholder="e.g., 'Special holiday offer for well-qualified buyers.'" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>

                        <div className="md:col-span-2 flex justify-end gap-4">
                            <Button type="submit" onClick={() => form.setValue('status', 'draft')}>Save Draft</Button>
                            <Button type="submit" onClick={() => form.setValue('status', 'published')}>Save and Publish</Button>
                        </div>
                    </form>
                    </Form>
                </CardContent>
            </Card>
        </main>
    </div>
  );
}
