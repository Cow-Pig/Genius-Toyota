
'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { FinancialOffer } from '@/types';
import type { PrequalFormValues } from './PrequalDialog';
import { useSearchParams } from 'next/navigation';

// Mock data imports - in a real app, this would be fetched from an API
import mockTradeIn from '@/data/trade-in.json';

interface Addon {
  id: string;
  name: string;
  description: string;
  price: number;
}

const DEFAULT_MSRP = 35000;
const DEFAULT_TERM_MONTHS = 36;
const DEFAULT_DUE_AT_SIGNING = 2000;
const DEFAULT_FEES = 595;

function roundToNearest(value: number, increment: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(value / increment) * increment;
}

function calculateAddonsFromOffer(offer: FinancialOffer | null): Addon[] {
  const msrp = offer?.msrp ?? DEFAULT_MSRP;
  const termMonths = offer?.termMonths ?? DEFAULT_TERM_MONTHS;
  const incentives = offer?.incentives ?? 0;
  const dueAtSigning = offer?.dueAtSigning ?? DEFAULT_DUE_AT_SIGNING;
  const fees = offer?.fees ?? DEFAULT_FEES;

  const financedAmount = Math.max(msrp + fees - incentives - dueAtSigning, 0);

  const warrantyPrice = Math.max(roundToNearest(msrp * 0.07, 50), 500);
  const gapPrice = Math.max(roundToNearest(financedAmount * 0.025, 25), 300);
  const maintenancePrice = Math.max(roundToNearest((termMonths / 12) * 400, 25), 300);

  return [
    {
      id: 'warranty',
      name: 'Extended Vehicle Warranty',
      description: 'Covers unexpected repairs beyond the factory warranty period.',
      price: warrantyPrice,
    },
    {
      id: 'gap',
      name: 'GAP Insurance',
      description:
        "Covers the difference between your loan balance and your vehicle's value if it's totaled.",
      price: gapPrice,
    },
    {
      id: 'maintenance',
      name: 'Pre-Paid Maintenance Plan',
      description: 'Covers scheduled maintenance like oil changes and tire rotations.',
      price: maintenancePrice,
    },
  ];
}

interface CheckoutState {
  offer: FinancialOffer | null;
  tradeInValue: number;
  availableAddons: Addon[];
  selectedAddons: string[];
  selectedAddonDetails: Addon[];
  toggleAddon: (id: string) => void;
  totalAddonsPrice: number;
  totalAmount: number;
  amountDueAtSigning: number;
  prequalSubmission: PrequalFormValues | null;
  setPrequalSubmission: (values: PrequalFormValues | null) => void;
  paymentContact: { email: string; name: string } | null;
  setPaymentContact: (contact: { email: string; name: string } | null) => void;
  appointment: { method: 'pickup' | 'delivery'; date: Date | null; timeSlot: string | null } | null;
  setAppointment: (
    details: { method: 'pickup' | 'delivery'; date: Date | null; timeSlot: string | null } | null,
  ) => void;
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
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [prequalSubmission, setPrequalSubmission] = useState<PrequalFormValues | null>(null);
  const [paymentContact, setPaymentContact] = useState<{ email: string; name: string } | null>(null);
  const [appointment, setAppointment] = useState<{
    method: 'pickup' | 'delivery';
    date: Date | null;
    timeSlot: string | null;
  } | null>(null);

  const availableAddons = useMemo(() => calculateAddonsFromOffer(offer), [offer]);

  useEffect(() => {
    setSelectedAddons((prev) =>
      prev.filter((id) => availableAddons.some((addon) => addon.id === id)),
    );
  }, [availableAddons]);

  const toggleAddon = useCallback((id: string) => {
    setSelectedAddons((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }, []);

  const totalAddonsPrice = useMemo(
    () =>
      availableAddons.reduce(
        (total, addon) =>
          selectedAddons.includes(addon.id) ? total + addon.price : total,
        0,
      ),
    [selectedAddons, availableAddons],
  );

  const selectedAddonDetails = useMemo(
    () => availableAddons.filter((addon) => selectedAddons.includes(addon.id)),
    [availableAddons, selectedAddons],
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
      selectedAddonDetails,
      totalAddonsPrice,
      totalAmount,
      amountDueAtSigning,
      prequalSubmission,
      setPrequalSubmission,
      paymentContact,
      setPaymentContact,
      appointment,
      setAppointment,
    }),
    [
      offer,
      tradeInValue,
      availableAddons,
      selectedAddons,
      toggleAddon,
      selectedAddonDetails,
      totalAddonsPrice,
      totalAmount,
      amountDueAtSigning,
      prequalSubmission,
      paymentContact,
      appointment,
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
