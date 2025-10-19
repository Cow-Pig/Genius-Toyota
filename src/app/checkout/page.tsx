
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
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useCheckout } from '@/components/checkout/CheckoutProvider';
import { useFirebase } from '@/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import type { OfferPurchase } from '@/types';

export default function CheckoutPage() {
  const router = useRouter();
  const [isNavigating, startNavigate] = useTransition();
  const { firestore } = useFirebase();
  const {
    offer,
    selectedAddonDetails,
    totalAmount,
    amountDueAtSigning,
    tradeInValue,
    prequalSubmission,
    paymentContact,
    appointment,
  } = useCheckout();

  const recordPurchase = async () => {
    if (!firestore || !offer) {
      return;
    }

    const customerEmail = (
      prequalSubmission?.email ?? paymentContact?.email ?? offer.shopperEmail ?? ''
    ).trim();

    const purchasePayload: Omit<OfferPurchase, 'id' | 'purchasedAt'> = {
      dealerId: offer.dealerId,
      offerId: offer.id,
      vehicleModelName: offer.vehicleModelName,
      offerType: offer.offerType,
      purchaseTotal: totalAmount,
      amountDueAtSigning,
      tradeInValue,
      selectedAddons: selectedAddonDetails.map((addon) => ({
        id: addon.id,
        name: addon.name,
        price: addon.price,
      })),
      customer: {
        firstName: prequalSubmission?.firstName ?? '',
        lastName: prequalSubmission?.lastName ?? '',
        email: customerEmail,
        phone: prequalSubmission?.phone ?? '',
      },
      paymentContactName: paymentContact?.name ?? null,
      appointment: appointment
        ? {
            method: appointment.method,
            date: appointment.date ? appointment.date.toISOString() : null,
            timeSlot: appointment.timeSlot,
          }
        : null,
    };

    await addDoc(collection(firestore, 'offerPurchases'), {
      ...purchasePayload,
      purchasedAt: serverTimestamp(),
    });

    if (customerEmail) {
      try {
        const response = await fetch('/api/purchases/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(purchasePayload),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error ?? 'Unknown error sending confirmation email');
        }
      } catch (error) {
        console.error('Failed to send purchase confirmation email', error);
      }
    }
  };

  const handleCompletePurchase = () => {
    startNavigate(() => {
      void (async () => {
        try {
          await recordPurchase();
        } catch (error) {
          console.error('Failed to record purchase', error);
        } finally {
          router.push('/checkout/success');
        }
      })();
    });
  };

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

        <Button className="w-full" size="lg" onClick={handleCompletePurchase} disabled={isNavigating}>
          {isNavigating ? 'Finalizing your purchase…' : 'Complete Purchase'}
        </Button>
      </div>
    </div>
  );
}
