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
import { collection, query, where, doc, Timestamp } from 'firebase/firestore';
import { FinancialOffer } from '@/types';
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
      </main>
    </div>
  );
}
