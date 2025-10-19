'use client';
import { useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { FinancialOffer } from '@/types';
import { Header } from '@/components/finance-navigator/Header';
import { Loader2 } from 'lucide-react';
import { vehicleData } from '@/lib/data';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatPercent } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { NegotiationThread } from '@/components/offers/NegotiationThread';

export default function OfferDetailPage() {
  const { firestore } = useFirebase();
  const params = useParams();
  const { id } = params;

  const offerRef = useMemoFirebase(() => {
    if (!firestore || !id) return null;
    return doc(firestore, 'financialOffers', id as string);
  }, [firestore, id]);

  const { data: offer, isLoading: isOfferLoading } = useDoc<FinancialOffer>(offerRef);

  const vehicle = vehicleData.find(v => v.id === offer?.vehicleId) ||
    vehicleData.find(v => v.modelName.toLowerCase() === offer?.vehicleModelName.toLowerCase());
  const image = PlaceHolderImages.find(p => p.id === vehicle?.id);

  if (isOfferLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!offer || !vehicle) {
    return (
      <div className="flex min-h-screen w-full flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <p>Offer not found or details are incomplete.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
            <div>
                <div className="relative aspect-[4/3] w-full rounded-lg overflow-hidden shadow-lg">
                    <Image
                        src={image?.imageUrl || `https://picsum.photos/seed/${vehicle.id}/800/600`}
                        alt={vehicle.modelName}
                        fill
                        className="object-cover"
                    />
                </div>
            </div>
            <div>
                <Card>
                    <CardHeader>
                        <Badge variant={offer.offerType === 'loan' ? 'default' : 'secondary'} className="w-fit mb-2">
                            {offer.offerType.charAt(0).toUpperCase() + offer.offerType.slice(1)} Special
                        </Badge>
                        <CardTitle className="text-4xl font-headline">{vehicle.modelName}</CardTitle>
                        <CardDescription className="text-lg">{vehicle.keySpecs}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <p className="text-muted-foreground">{offer.offerDetails || 'Explore this limited-time offer tailored for you.'}</p>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                            <div className="font-medium">MSRP</div>
                            <div className="text-right">{formatCurrency(offer.msrp)}</div>
                            <div className="font-medium">Incentives</div>
                            <div className="text-right text-green-600">-{formatCurrency(offer.incentives ?? 0)}</div>
                            <div className="font-medium">Term</div>
                            <div className="text-right">{offer.termMonths} Months</div>
                            {offer.apr !== undefined && <div className="font-medium">APR</div>}
                            {offer.apr !== undefined && <div className="text-right">{formatPercent(offer.apr / 100, 2)}</div>}
                            {offer.moneyFactor !== undefined && <div className="font-medium">Money Factor</div>}
                            {offer.moneyFactor !== undefined && <div className="text-right">{offer.moneyFactor.toFixed(5)}</div>}
                            {offer.residualPercentage !== undefined && <div className="font-medium">Residual</div>}
                            {offer.residualPercentage !== undefined && <div className="text-right">{offer.residualPercentage}%</div>}
                            <div className="font-medium">Fees</div>
                            <div className="text-right">{formatCurrency(offer.fees ?? 0)}</div>
                        </div>
                         <Link href={{ pathname: '/checkout', query: { offer: JSON.stringify(offer) } }} passHref>
                            <Button size="lg" className="w-full">I'm Interested</Button>
                         </Link>
                    </CardContent>
                </Card>
            </div>
            <div className="md:col-span-2">
                <NegotiationThread offer={offer} />
            </div>
        </div>
      </main>
    </div>
  );
}
