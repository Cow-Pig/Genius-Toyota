
'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { FinancialOffer } from '@/types';
import { useSearchParams } from 'next/navigation';

// Mock data imports - in a real app, this would be fetched from an API
import mockTradeIn from '@/data/trade-in.json';
import mockAddons from '@/data/addons.json';

interface Addon {
  id: string;
  name: string;
  description: string;
  price: number;
}

interface CheckoutState {
  offer: FinancialOffer | null;
  tradeInValue: number;
  availableAddons: Addon[];
  selectedAddons: string[];
  toggleAddon: (id: string) => void;
  totalAddonsPrice: number;
  totalAmount: number;
  amountDueAtSigning: number;
}

const CheckoutContext = createContext<CheckoutState | undefined>(undefined);

export function CheckoutProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const offerString = searchParams.get('offer');
  
  const initialOffer = useMemo(() => {
    if (offerString) {
      try {
        const parsedOffer = JSON.parse(offerString);
        // Firestore timestamps will be serialized, so we need to convert them back to Date objects
        if (parsedOffer.lastRevisedDate) {
            // Firestore timestamps are objects with seconds and nanoseconds
            if (typeof parsedOffer.lastRevisedDate === 'object' && parsedOffer.lastRevisedDate.seconds) {
                 parsedOffer.lastRevisedDate = new Date(parsedOffer.lastRevisedDate.seconds * 1000);
            } else {
                 parsedOffer.lastRevisedDate = new Date(parsedOffer.lastRevisedDate);
            }
        }
        if (parsedOffer.createdDate) {
            if (typeof parsedOffer.createdDate === 'object' && parsedOffer.createdDate.seconds) {
                parsedOffer.createdDate = new Date(parsedOffer.createdDate.seconds * 1000);
           } else {
                parsedOffer.createdDate = new Date(parsedOffer.createdDate);
           }
        }
        return parsedOffer as FinancialOffer;
      } catch (e) {
        console.error("Failed to parse offer from query params", e);
        return null;
      }
    }
    return null;
  }, [offerString]);

  const [offer] = useState<FinancialOffer | null>(initialOffer);
  const [tradeInValue] = useState<number>(mockTradeIn.estimate);
  const [availableAddons] = useState<Addon[]>(mockAddons);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

  const toggleAddon = useCallback((id: string) => {
    setSelectedAddons((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }, []);

  const totalAddonsPrice = useMemo(() =>
    availableAddons.reduce(
      (total, addon) =>
        selectedAddons.includes(addon.id) ? total + addon.price : total,
      0,
    ),
    [selectedAddons, availableAddons],
  );

  const totalAmount = useMemo(
    () => (offer?.msrp || 0) + totalAddonsPrice,
    [offer?.msrp, totalAddonsPrice],
  );

  // This is a simplified calculation. A real app might have a more complex 'due at signing' logic.
  const amountDueAtSigning = useMemo(
    () => Math.max(0, totalAmount - tradeInValue),
    [totalAmount, tradeInValue],
  );

  const value = useMemo(
    () => ({
      offer,
      tradeInValue,
      availableAddons,
      selectedAddons,
      toggleAddon,
      totalAddonsPrice,
      totalAmount,
      amountDueAtSigning,
    }),
    [
      offer,
      tradeInValue,
      availableAddons,
      selectedAddons,
      toggleAddon,
      totalAddonsPrice,
      totalAmount,
      amountDueAtSigning,
    ],
  );

  return <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>;
}

export function useCheckout() {
  const context = useContext(CheckoutContext);
  if (context === undefined) {
    throw new Error('useCheckout must be used within a CheckoutProvider');
  }
  return context;
}
