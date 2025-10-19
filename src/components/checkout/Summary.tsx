
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { FinancialOffer } from '@/types';

interface Addon {
    id: string;
    price: number;
}

interface SummaryProps {
  offer: FinancialOffer;
  tradeInValue: number;
  selectedAddons: Addon[];
}

export function Summary({ offer, tradeInValue, selectedAddons }: SummaryProps) {
  const totalAddonsPrice = useMemo(() => 
    selectedAddons.reduce((total, addon) => total + addon.price, 0), 
    [selectedAddons]
  );

  const totalAmount = offer.msrp + totalAddonsPrice;
  const amountDue = totalAmount - tradeInValue;

  const estimatedTax = totalAmount * 0.08; // 8% sales tax
  const finalAmount = amountDue + estimatedTax;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Purchase Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between">
          <span>Vehicle MSRP</span>
          <span>{formatCurrency(offer.msrp)}</span>
        </div>
        <div className="flex justify-between">
          <span>F&I Add-ons</span>
          <span>{formatCurrency(totalAddonsPrice)}</span>
        </div>
        <div className="flex justify-between font-semibold">
          <span>Subtotal</span>
          <span>{formatCurrency(totalAmount)}</span>
        </div>
        <div className="flex justify-between text-green-600">
          <span>Trade-in Value</span>
          <span>- {formatCurrency(tradeInValue)}</span>
        </div>
        <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between">
                <span>Amount after Trade-in</span>
                <span>{formatCurrency(amountDue)}</span>
            </div>
            <div className="flex justify-between">
                <span>Estimated Tax (8%)</span>
                <span>{formatCurrency(estimatedTax)}</span>
            </div>
             <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Final Amount Due</span>
                <span>{formatCurrency(finalAmount)}</span>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
