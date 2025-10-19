'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, Timestamp, orderBy } from 'firebase/firestore';
import { FinancialOffer, OfferPurchase } from '@/types';
import { format } from 'date-fns';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Header } from '@/components/dealer/Header';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
  } from '@/components/ui/dropdown-menu';
import { deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { MockIntegrationPanel } from '@/components/dealer/MockIntegrationPanel';

function OfferActions({ offer }: { offer: FinancialOffer }) {
    const { firestore } = useFirebase();
    const router = useRouter();
    const { toast } = useToast();

    if (!firestore || !offer.id) return null;

    const offerRef = doc(firestore, 'financialOffers', offer.id);

    const handleDelete = () => {
        if (window.confirm('Are you sure you want to delete this offer? This cannot be undone.')) {
            deleteDocumentNonBlocking(offerRef);
            toast({ title: 'Offer deleted.' });
        }
    }

    const handleUnpublish = () => {
        updateDocumentNonBlocking(offerRef, { status: 'draft' });
        toast({ title: 'Offer unpublished.', description: 'The offer is now a draft.'});
    }


    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button aria-haspopup="true" size="icon" variant="ghost">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          {offer.status === 'published' && (
            <>
                <DropdownMenuItem onClick={() => router.push(`/offers/${offer.id}`)}>View</DropdownMenuItem>
                <DropdownMenuItem onClick={handleUnpublish}>Unpublish</DropdownMenuItem>
            </>
          )}
          {offer.status === 'draft' && (
            <DropdownMenuItem onClick={() => router.push(`/dealer/offers/edit/${offer.id}`)}>
              Edit
            </DropdownMenuItem>
          )}
          <DropdownMenuItem className="text-destructive" onClick={handleDelete}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }


function isTimestampLike(value: unknown): value is { seconds: number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'seconds' in value &&
    typeof (value as { seconds?: unknown }).seconds === 'number'
  );
}

function getDate(value: FinancialOffer['lastRevisedDate']) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (isTimestampLike(value)) {
    return new Date(value.seconds * 1000);
  }
  return null;
}

function getTimestampDate(value: unknown) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (isTimestampLike(value)) {
    return new Date(value.seconds * 1000);
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function OfferRow({ offer }: { offer: FinancialOffer }) {
  const lastUpdated = getDate(offer.lastRevisedDate);
  return (
    <TableRow>
      <TableCell className="font-medium">{offer.vehicleModelName}</TableCell>
      <TableCell>
        <Badge variant={offer.offerType === 'loan' ? 'secondary' : 'outline'}>
          {offer.offerType}
        </Badge>
      </TableCell>
      <TableCell>{formatCurrency(offer.msrp)}</TableCell>
      <TableCell>{offer.termMonths} mos</TableCell>
       <TableCell>
        <Badge variant={offer.status === 'published' ? 'default' : 'destructive'}>
            {offer.status}
        </Badge>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {lastUpdated ? format(lastUpdated, 'PPp') : '—'}
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end">
            <OfferActions offer={offer} />
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function DealerDashboardPage() {
  const { firestore, user } = useFirebase();

  const offersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'financialOffers'), where('dealerId', '==', user.uid));
  }, [firestore, user]);

  const { data: offers, isLoading } = useCollection<FinancialOffer>(offersQuery);

  const purchasesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'offerPurchases'),
      where('dealerId', '==', user.uid),
      orderBy('purchasedAt', 'desc'),
    );
  }, [firestore, user]);

  const { data: purchases, isLoading: isLoadingPurchases } = useCollection<OfferPurchase>(purchasesQuery);

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center">
          <h1 className="text-lg font-semibold md:text-2xl">Financial Offers</h1>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/dealer/offers/new">
              <Button size="sm">
                <PlusCircle className="mr-2" />
                Create Offer
              </Button>
            </Link>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Your Current Offers</CardTitle>
            <CardDescription>
              Manage and track all the financial offers you've created.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>MSRP</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Last Updated</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      Loading offers...
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && offers && offers.length > 0 ? (
                  offers.map((offer) => (
                    <OfferRow key={offer.id} offer={offer} />
                  ))
                ) : (
                  !isLoading && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">
                        No offers created yet.
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Purchases</CardTitle>
            <CardDescription>See which customers have committed to your offers in real time.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Purchase Date</TableHead>
                  <TableHead className="hidden lg:table-cell">Delivery</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingPurchases && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      Loading purchases...
                    </TableCell>
                  </TableRow>
                )}
                {!isLoadingPurchases && purchases && purchases.length > 0 ? (
                  purchases.map((purchase) => {
                    const purchasedAt = getTimestampDate(purchase.purchasedAt);
                    const appointmentDate = getTimestampDate(purchase.appointment?.date ?? null);
                    const customerName = [purchase.customer.firstName, purchase.customer.lastName]
                      .filter(Boolean)
                      .join(' ');
                    return (
                      <TableRow key={purchase.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{customerName || 'Unknown customer'}</span>
                            {purchase.selectedAddons.length > 0 && (
                              <span className="text-xs text-muted-foreground">
                                Add-ons: {purchase.selectedAddons.map((addon) => addon.name).join(', ')}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col text-sm text-muted-foreground">
                            <span>{purchase.customer.email}</span>
                            {purchase.customer.phone && <span>{purchase.customer.phone}</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{purchase.vehicleModelName}</span>
                            <Badge variant={purchase.offerType === 'lease' ? 'outline' : 'secondary'}>
                              {purchase.offerType}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {purchasedAt ? format(purchasedAt, 'PPp') : '—'}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {purchase.appointment ? (
                            <div className="flex flex-col text-sm text-muted-foreground">
                              <span className="capitalize">{purchase.appointment.method}</span>
                              {appointmentDate && <span>{format(appointmentDate, 'PP')}</span>}
                              {purchase.appointment.timeSlot && <span>{purchase.appointment.timeSlot}</span>}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Not scheduled</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  !isLoadingPurchases && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">
                        No purchases yet.
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <MockIntegrationPanel />
      </main>
    </div>
  );
}
