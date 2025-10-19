'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useToast } from '@/hooks/use-toast';
import type {
  JourneyPreferences,
  TimelineEvent,
} from '@/lib/journey-store';
import { sealTransportPayload } from '@/lib/secure-transport';

interface DealerSummary {
  id: string;
  name: string;
}

interface NotificationSummary {
  id: string;
  type: TimelineEvent['type'];
  to: string;
  subject: string;
  queuedAt: string;
  sentAt?: string;
}

interface CustomerSummary {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city?: string;
  state?: string;
}

export interface PlaidSummaryClient {
  institutionName?: string;
  lastSyncedAt?: string;
  recurringDeposits?: Array<{
    name: string;
    averageAmount: number;
    cadence: string;
    lastDeposit: string;
  }>;
  accountOwners?: Array<{
    accountName: string;
    mask: string;
    owners: string[];
  }>;
  paystubs?: Array<{
    employer: string;
    payDate: string;
    grossPay: number;
    netPay: number;
    documentName: string;
    documentSize: number;
    lastVerified: string;
    downloadUrl?: string;
  }>;
}

interface JourneyState {
  prequalRequestId: string | null;
  referenceNumber: string | null;
  status: string | null;
  dealer: DealerSummary | null;
  preferences: JourneyPreferences;
  events: TimelineEvent[];
  notifications: NotificationSummary[];
  customer: CustomerSummary | null;
  plaid: PlaidSummaryClient | null;
  lastUpdated: string | null;
}

interface SubmitPayload {
  scenario: unknown;
  customerProfile: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    city?: string;
    state?: string;
  };
  softPullConsent: boolean;
  dealer: DealerSummary;
}

interface CustomerJourneyContextValue {
  state: JourneyState;
  submitPrequalification: (payload: SubmitPayload) => Promise<void>;
  updatePreferences: (preferences: Partial<JourneyPreferences>) => Promise<void>;
  refreshStatus: () => Promise<void>;
  isSubmitting: boolean;
  isRefreshing: boolean;
}

const defaultState: JourneyState = {
  prequalRequestId: null,
  referenceNumber: null,
  status: null,
  dealer: null,
  preferences: {
    prequalification_submitted: true,
    offer_received: true,
    income_verified: true,
    decision_ready: true,
    contract_available: true,
    pickup_scheduled: true,
  },
  events: [],
  notifications: [],
  customer: null,
  plaid: null,
  lastUpdated: null,
};

const CustomerJourneyContext = createContext<CustomerJourneyContextValue | undefined>(
  undefined,
);

export function CustomerJourneyProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<JourneyState>(defaultState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();
  const eventRegistry = useRef(new Set<string>());

  const submitPrequalification = useCallback(
    async (payload: SubmitPayload) => {
      setIsSubmitting(true);
      try {
        const envelope = await sealTransportPayload(payload);
        const response = await fetch('/api/prequalifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Transport-Encrypted': 'AES-256-GCM',
          },
          body: JSON.stringify({ envelope }),
        });

        if (!response.ok) {
          throw new Error('Unable to submit pre-qualification.');
        }

        const data = await response.json();
        eventRegistry.current = new Set((data.timeline ?? []).map((event: TimelineEvent) => event.id));
        setState((prev) => ({
          ...prev,
          prequalRequestId: data.prequalRequestId,
          referenceNumber: data.referenceNumber,
          status: data.status,
          dealer: data.dealer ?? null,
          preferences: data.preferences ?? prev.preferences,
          events: data.timeline ?? [],
          notifications: data.notifications ?? [],
          customer: data.customer ?? null,
          lastUpdated: data.lastUpdated ?? new Date().toISOString(),
        }));

        toast({
          title: 'We received your request',
          description: 'A confirmation email is on its way. Check your inbox for the full breakdown.',
        });
      } catch (error) {
        console.error(error);
        toast({
          title: 'Unable to submit right now',
          description: 'Refresh and try again or give us a call—we saved your form details.',
          variant: 'destructive',
        });
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [toast],
  );

  const refreshStatus = useCallback(async () => {
    if (!state.prequalRequestId) {
      return;
    }

    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/prequalifications/${state.prequalRequestId}`);
      if (!response.ok) {
        throw new Error('Unable to refresh status.');
      }

      const data = await response.json();
      setState((prev) => ({
        ...prev,
        referenceNumber: data.referenceNumber ?? prev.referenceNumber,
        status: data.status ?? prev.status,
        dealer: data.dealer ?? prev.dealer,
        preferences: data.preferences ?? prev.preferences,
        events: data.events ?? prev.events,
        notifications: data.notifications ?? prev.notifications,
        customer: data.customer ?? prev.customer,
        plaid: data.plaid ?? prev.plaid,
        lastUpdated: data.updatedAt ?? new Date().toISOString(),
      }));

      const incomingEvents: TimelineEvent[] = data.events ?? [];
      incomingEvents.forEach((event) => {
        if (!eventRegistry.current.has(event.id)) {
          eventRegistry.current.add(event.id);
          toast({
            title: event.title,
            description: event.description,
          });
        }
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Unable to refresh status',
        description: 'We will keep trying in the background.',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [state.prequalRequestId, toast]);

  const updatePreferences = useCallback(
    async (preferences: Partial<JourneyPreferences>) => {
      if (!state.prequalRequestId) {
        return;
      }

      const response = await fetch(`/api/prequalifications/${state.prequalRequestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences }),
      });

      if (!response.ok) {
        toast({
          title: 'Unable to update alerts',
          description: 'Try again shortly or leave them as-is—we kept your previous selections.',
          variant: 'destructive',
        });
        return;
      }

      const data = await response.json();
      setState((prev) => ({
        ...prev,
        preferences: {
          ...prev.preferences,
          ...(data.preferences ?? {}),
        },
        lastUpdated: data.updatedAt ?? prev.lastUpdated,
      }));

      toast({
        title: 'Notification preferences updated',
        description: 'You can tweak alerts any time from Settings.',
      });
    },
    [state.prequalRequestId, toast],
  );

  useEffect(() => {
    if (!state.prequalRequestId) {
      return;
    }

    const interval = window.setInterval(() => {
      refreshStatus().catch(() => undefined);
    }, 10000);

    refreshStatus().catch(() => undefined);

    return () => {
      window.clearInterval(interval);
    };
  }, [state.prequalRequestId, refreshStatus]);

  const value = useMemo<CustomerJourneyContextValue>(
    () => ({
      state,
      submitPrequalification,
      updatePreferences,
      refreshStatus,
      isSubmitting,
      isRefreshing,
    }),
    [state, submitPrequalification, updatePreferences, refreshStatus, isSubmitting, isRefreshing],
  );

  return <CustomerJourneyContext.Provider value={value}>{children}</CustomerJourneyContext.Provider>;
}

export function useCustomerJourney() {
  const context = useContext(CustomerJourneyContext);
  if (!context) {
    throw new Error('useCustomerJourney must be used within a CustomerJourneyProvider');
  }

  return context;
}
