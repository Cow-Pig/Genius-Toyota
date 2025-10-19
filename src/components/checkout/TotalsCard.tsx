
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCheckout } from './CheckoutProvider';
import { formatCurrency } from '@/lib/utils';

export function TotalsCard() {
  const { totalAmount, amountDueAtSigning, tradeInValue, totalAddonsPrice, offer } = useCheckout();

  if (!offer) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Deal Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Select an offer to see the payment summary and due-at-signing details.
          </p>
        </CardContent>
      </Card>
    );
  }

  const msrp = offer.msrp ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deal Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between">
          <p>Vehicle MSRP</p>
          <p>{formatCurrency(msrp)}</p>
        </div>
        <div className="flex justify-between">
          <p>F&I Add-ons</p>
          <p>{formatCurrency(totalAddonsPrice)}</p>
        </div>
        <div className="flex justify-between font-semibold">
          <p>Total Purchase Price</p>
          <p>{formatCurrency(totalAmount)}</p>
        </div>
        <div className="flex justify-between">
          <p>Trade-In Value</p>
          <p>- {formatCurrency(tradeInValue)}</p>
        </div>
        <div className="flex justify-between text-lg font-bold">
          <p>Amount Due at Signing</p>
          <p>{formatCurrency(amountDueAtSigning)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
