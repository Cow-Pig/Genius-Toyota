
'use client';

import { CheckoutProvider } from '@/components/checkout/CheckoutProvider';
import { Suspense } from 'react';
import type { ReactNode } from 'react';

function CheckoutLayoutContent({
    children,
  }: {
    children: ReactNode;
  }) {
    return <CheckoutProvider>{children}</CheckoutProvider>;
}


export default function CheckoutLayout({
    children,
  }: {
    children: ReactNode;
  }) {
    return (
        <Suspense fallback={<div>Loading checkout...</div>}>
            <CheckoutLayoutContent>{children}</CheckoutLayoutContent>
        </Suspense>
    )
  }
