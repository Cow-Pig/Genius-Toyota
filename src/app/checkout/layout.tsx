
'use client';

import { CheckoutProvider } from '@/components/checkout/CheckoutProvider';
import { Suspense } from 'react';

function CheckoutLayoutContent({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return <CheckoutProvider>{children}</CheckoutProvider>;
}


export default function CheckoutLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
        <Suspense fallback={<div>Loading checkout...</div>}>
            <CheckoutLayoutContent>{children}</CheckoutLayoutContent>
        </Suspense>
    )
  }
