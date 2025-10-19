
'use client';

import { TradeInForm } from '@/components/checkout/TradeInForm';
import { FiAddons } from '@/components/checkout/FiAddons';
import { ESignModal } from '@/components/checkout/ESignModal';
import { PaymentForm } from '@/components/checkout/PaymentForm';
import { SchedulingForm } from '@/components/checkout/SchedulingForm';
import { OfferDetails } from '@/components/checkout/OfferDetails';
import { TotalsCard } from '@/components/checkout/TotalsCard';
import { IncomeVerificationFlow } from '@/components/checkout/IncomeVerificationFlow';
import { CreditApplicationFlow } from '@/components/checkout/CreditApplicationFlow';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CheckoutPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <Link href="/offers" className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-700">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Offers
        </Link>
      </div>
      <h1 className="mb-8 text-4xl font-bold tracking-tight">Checkout</h1>
      <div className="space-y-8">
        <OfferDetails />

        <IncomeVerificationFlow />

        <CreditApplicationFlow />

        <TradeInForm />

        <FiAddons />

        <TotalsCard />

        <ESignModal />

        <PaymentForm />
        
        <SchedulingForm />

        <Button className="w-full" size="lg">
          Complete Purchase
        </Button>
      </div>
    </div>
  );
}
