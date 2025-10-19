
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCheckout } from './CheckoutProvider';
import { formatCurrency } from '@/lib/utils';

export function OfferDetails() {
    const { offer } = useCheckout();

    if (!offer) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>No Offer Selected</CardTitle>
                    <CardDescription>Please go back to the offers page and select a vehicle to check out.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    const { vehicleModelName, msrp, apr, termMonths } = offer;

    // A simplified monthly payment calculation for display
    const monthlyPayment = apr && termMonths ? (msrp / termMonths * (1 + (apr/100)/12)) : offer.monthlyPayment || 0;
    const dueAtSigning = offer.dueAtSigning || 0;


    return (
        <Card>
            <CardHeader>
                <CardTitle>Your Offer</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
                <div>
                    <p className="font-semibold">Vehicle:</p>
                    <p>{vehicleModelName}</p>
                </div>
                <div>
                    <p className="font-semibold">MSRP:</p>
                    <p>{formatCurrency(msrp)}</p>
                </div>
                <div>
                    <p className="font-semibold">Estimated Monthly Payment:</p>
                    <p>{formatCurrency(monthlyPayment)}/mo for {termMonths} months</p>
                </div>
                <div>
                    <p className="font-semibold">Est. Due at Signing:</p>
                    <p>{formatCurrency(dueAtSigning)}</p>
                </div>
            </CardContent>
        </Card>
    );
}
