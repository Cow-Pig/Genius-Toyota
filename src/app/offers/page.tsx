'use client';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { FinancialOffer } from '@/types';
import { Header } from '@/components/finance-navigator/Header';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { vehicleData } from '@/lib/data';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Link from 'next/link';

function OfferCard({ offer }: { offer: FinancialOffer }) {
    const vehicle = vehicleData.find(v => v.id === offer.vehicleId);
    const image = PlaceHolderImages.find(p => p.id === vehicle?.id);

    return (
        <Card className="flex flex-col">
            <CardHeader className="p-0">
                {image && (
                     <div className="relative h-48 w-full">
                        <Image
                            src={image.imageUrl}
                            alt={vehicle?.modelName || 'Vehicle image'}
                            fill
                            className="object-cover rounded-t-lg"
                        />
                    </div>
                )}
            </CardHeader>
            <CardContent className="p-6 flex-grow">
                <Badge variant={offer.offerType === 'loan' ? 'default' : 'secondary'} className="mb-2">
                    {offer.offerType.charAt(0).toUpperCase() + offer.offerType.slice(1)}
                </Badge>
                <CardTitle className="font-headline mb-2">{offer.vehicleModelName}</CardTitle>
                <CardDescription>{offer.offerDetails || `A great ${offer.offerType} offer from our dealership.`}</CardDescription>
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-muted-foreground">MSRP</p>
                        <p className="font-semibold">{formatCurrency(offer.msrp)}</p>
                    </div>
                    <div>
                        <p className="text-muted-foreground">Term</p>
                        <p className="font-semibold">{offer.termMonths} months</p>
                    </div>
                    {offer.apr && (
                         <div>
                            <p className="text-muted-foreground">APR</p>
                            <p className="font-semibold">{offer.apr}%</p>
                        </div>
                    )}
                     {offer.residualPercentage && (
                         <div>
                            <p className="text-muted-foreground">Residual</p>
                            <p className="font-semibold">{offer.residualPercentage}%</p>
                        </div>
                    )}
                </div>
            </CardContent>
            <CardFooter>
                <Link href={`/offers/${offer.id}`} className="w-full">
                    <Button className="w-full">View Details</Button>
                </Link>
            </CardFooter>
        </Card>
    )
}

function LoadingSkeleton() {
    return (
        <>
            {[...Array(6)].map((_, i) => (
                <Card key={i}>
                    <Skeleton className="h-48 w-full rounded-t-lg" />
                    <CardContent className="p-6 space-y-4">
                        <Skeleton className="h-5 w-1/4" />
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                         <div className="flex justify-between items-center pt-2">
                            <Skeleton className="h-8 w-20" />
                            <Skeleton className="h-8 w-20" />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Skeleton className="h-10 w-full" />
                    </CardFooter>
                </Card>
            ))}
        </>
    )
}


export default function OffersPage() {
    const { firestore } = useFirebase();

    const offersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'financialOffers'), where('status', '==', 'published'));
    }, [firestore]);

    const { data: offers, isLoading } = useCollection<FinancialOffer>(offersQuery);

    return (
        <div className="flex min-h-screen w-full flex-col">
            <Header />
            <main className="flex-1 container mx-auto px-4 py-8">
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-bold font-headline">Current Offers</h1>
                    <p className="text-lg text-muted-foreground mt-2">Explore the latest lease and finance deals.</p>
                </div>
                {isLoading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                       <LoadingSkeleton />
                    </div>
                )}
                {!isLoading && offers && offers.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {offers.map(offer => (
                            <OfferCard key={offer.id} offer={offer} />
                        ))}
                    </div>
                ) : (
                    !isLoading && (
                        <div className="text-center py-16">
                             <p className="text-muted-foreground">No public offers available at the moment. Please check back later.</p>
                        </div>
                    )
                )}
            </main>
        </div>
    )
}
