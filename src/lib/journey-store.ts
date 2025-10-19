import { randomUUID } from 'crypto';
import { encryptPayload, decryptPayload, EncryptedPayload, maskEmail, maskValue } from './crypto';
import { buildEmailHtml } from './email-templates';

export type TimelineEventType =
  | 'offer_received'
  | 'income_verified'
  | 'prequalification_submitted'
  | 'decision_ready'
  | 'contract_available'
  | 'pickup_scheduled';

export type JourneyStatus =
  | 'idle'
  | 'received'
  | 'in_verification'
  | 'decision_ready'
  | 'contract_ready'
  | 'scheduled';

export type JourneyPreferences = Record<TimelineEventType, boolean>;

export type TimelineEvent = {
  id: string;
  type: TimelineEventType;
  title: string;
  description: string;
  occurredAt: string;
  referenceNumber: string;
  emailSubject: string;
  emailQueuedAt: string;
  emailSentAt?: string;
};

type CustomerProfile = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city?: string;
  state?: string;
};

type DealerProfile = {
  id: string;
  name: string;
};

type NotificationRecord = {
  id: string;
  type: TimelineEventType;
  to: string;
  subject: string;
  queuedAt: string;
  sentAt?: string;
  html: string;
};

type PlaidSummary = {
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
  encryptedAccessToken?: EncryptedPayload;
  itemId?: string;
};

type PrequalificationRecord = {
  id: string;
  referenceNumber: string;
  encryptedCustomer: EncryptedPayload;
  scenario: unknown;
  dealer: DealerProfile;
  consent: boolean;
  status: JourneyStatus;
  createdAt: string;
  updatedAt: string;
  events: TimelineEvent[];
  preferences: JourneyPreferences;
  notifications: NotificationRecord[];
  plaid?: PlaidSummary;
};

type CreatePrequalificationInput = {
  customer: CustomerProfile;
  scenario: unknown;
  dealer: DealerProfile;
  consent: boolean;
};

const EVENT_DEFINITIONS: Record<
  TimelineEventType,
  {
    title: (customer: CustomerProfile, dealer: DealerProfile) => string;
    description: (customer: CustomerProfile, dealer: DealerProfile) => string;
    subject: (dealer: DealerProfile) => string;
    status: JourneyStatus;
  }
> = {
  prequalification_submitted: {
    title: (customer) => `Request received for ${customer.firstName} ${customer.lastName}`,
    description: (customer, dealer) =>
      `We logged your soft pull consent and shared your profile with ${dealer.name}. Expect a status update shortly.`,
    subject: (dealer) => `We got your pre-qualification for ${dealer.name}`,
    status: 'received',
  },
  offer_received: {
    title: () => 'Dealer offer received',
    description: (customer, dealer) =>
      `${dealer.name} dropped a purchase outline and we archived it in your account for quick review.`,
    subject: (dealer) => `Offer from ${dealer.name}`,
    status: 'in_verification',
  },
  income_verified: {
    title: () => 'Income verified via Plaid',
    description: () =>
      'Recurring deposits and account owners matched your application. You are clear to move forward.',
    subject: () => 'Income verification complete',
    status: 'in_verification',
  },
  decision_ready: {
    title: () => 'Decision ready to review',
    description: () =>
      "Your approval terms are available. Take a look when you're ready and lock in the structure you prefer.",
    subject: () => 'Your financing decision is ready',
    status: 'decision_ready',
  },
  contract_available: {
    title: () => 'Contract package prepared',
    description: () => 'We prepared a digital contract packet with the latest numbers and disclosures.',
    subject: () => 'Contract package is ready to sign',
    status: 'contract_ready',
  },
  pickup_scheduled: {
    title: () => 'Vehicle pickup scheduled',
    description: (customer, dealer) =>
      `${dealer.name} locked in a delivery window. We'll send a reminder before you head to the store.`,
    subject: () => 'Pickup confirmed',
    status: 'scheduled',
  },
};

const DEFAULT_PREFERENCES: JourneyPreferences = {
  prequalification_submitted: true,
  offer_received: true,
  income_verified: true,
  decision_ready: true,
  contract_available: true,
  pickup_scheduled: true,
};

type JourneyStore = Map<string, PrequalificationRecord>;

declare global {
  // eslint-disable-next-line no-var
  var __JOURNEY_STORE__?: JourneyStore;
}

function getJourneyStore(): JourneyStore {
  if (!globalThis.__JOURNEY_STORE__) {
    globalThis.__JOURNEY_STORE__ = new Map();
  }

  return globalThis.__JOURNEY_STORE__;
}

function buildReferenceNumber(id: string): string {
  const suffix = id.slice(-6).toUpperCase();
  return `TF-${suffix}`;
}

function queueEmail(
  record: PrequalificationRecord,
  event: TimelineEvent,
  customer: CustomerProfile,
) {
  if (!record.preferences[event.type]) {
    return;
  }

  const html = buildEmailHtml(event.type, {
    customerName: `${customer.firstName} ${customer.lastName}`.trim(),
    dealerName: record.dealer.name,
    summary: event.description,
    occurredAt: event.occurredAt,
    referenceNumber: record.referenceNumber,
  });

  const notification: NotificationRecord = {
    id: randomUUID(),
    type: event.type,
    to: customer.email,
    subject: event.emailSubject,
    queuedAt: event.emailQueuedAt,
    html,
  };

  record.notifications.push(notification);

  setTimeout(() => {
    notification.sentAt = new Date().toISOString();
    event.emailSentAt = notification.sentAt;
    record.updatedAt = notification.sentAt;
  }, 150);
}

function appendEventInternal(
  record: PrequalificationRecord,
  type: TimelineEventType,
  customer: CustomerProfile,
) {
  const definition = EVENT_DEFINITIONS[type];
  const occurredAt = new Date().toISOString();
  const event: TimelineEvent = {
    id: randomUUID(),
    type,
    title: definition.title(customer, record.dealer),
    description: definition.description(customer, record.dealer),
    occurredAt,
    referenceNumber: record.referenceNumber,
    emailSubject: definition.subject(record.dealer),
    emailQueuedAt: occurredAt,
  };

  record.events.push(event);
  record.status = definition.status;
  record.updatedAt = occurredAt;
  queueEmail(record, event, customer);
}

function scheduleProgression(record: PrequalificationRecord, customer: CustomerProfile) {
  const steps: Array<{ type: TimelineEventType; delay: number }> = [
    { type: 'offer_received', delay: 2000 },
    { type: 'income_verified', delay: 4000 },
    { type: 'decision_ready', delay: 6500 },
    { type: 'contract_available', delay: 9000 },
    { type: 'pickup_scheduled', delay: 12000 },
  ];

  steps.forEach(({ type, delay }) => {
    setTimeout(() => {
      const store = getJourneyStore();
      const latest = store.get(record.id);
      if (!latest) {
        return;
      }
      const profile = decryptPayload<CustomerProfile>(latest.encryptedCustomer);
      appendEventInternal(latest, type, profile);
    }, delay);
  });
}

export function createPrequalification(
  input: CreatePrequalificationInput,
): PrequalificationRecord {
  const store = getJourneyStore();
  const id = `prq_${randomUUID().replace(/-/g, '').slice(0, 18)}`;
  const referenceNumber = buildReferenceNumber(id);
  const createdAt = new Date().toISOString();

  const encryptedCustomer = encryptPayload(input.customer);

  const record: PrequalificationRecord = {
    id,
    referenceNumber,
    encryptedCustomer,
    scenario: input.scenario,
    dealer: input.dealer,
    consent: input.consent,
    status: 'idle',
    createdAt,
    updatedAt: createdAt,
    events: [],
    preferences: { ...DEFAULT_PREFERENCES },
    notifications: [],
  };

  store.set(id, record);

  const customer = input.customer;
  appendEventInternal(record, 'prequalification_submitted', customer);

  scheduleProgression(record, customer);

  return record;
}

export function getPrequalification(id: string): PrequalificationRecord | undefined {
  return getJourneyStore().get(id);
}

export function getCustomerProfile(record: PrequalificationRecord): CustomerProfile {
  return decryptPayload<CustomerProfile>(record.encryptedCustomer);
}

export function updatePreferences(
  id: string,
  preferences: Partial<JourneyPreferences>,
): PrequalificationRecord | undefined {
  const record = getJourneyStore().get(id);
  if (!record) {
    return undefined;
  }

  record.preferences = {
    ...record.preferences,
    ...preferences,
  };
  record.updatedAt = new Date().toISOString();
  return record;
}

export function recordPlaidSummary(
  id: string,
  summary: Omit<PlaidSummary, 'encryptedAccessToken'> & {
    accessToken?: string;
  },
) {
  const record = getJourneyStore().get(id);
  if (!record) {
    return;
  }

  const { accessToken, ...rest } = summary;
  const encryptedAccessToken = accessToken
    ? encryptPayload({ token: accessToken })
    : record.plaid?.encryptedAccessToken;

  record.plaid = {
    ...(record.plaid ?? {}),
    ...rest,
    encryptedAccessToken,
  };
  record.updatedAt = new Date().toISOString();
}

export function appendEvent(
  id: string,
  type: TimelineEventType,
  descriptionOverride?: string,
) {
  const record = getJourneyStore().get(id);
  if (!record) {
    return;
  }

  const customer = decryptPayload<CustomerProfile>(record.encryptedCustomer);
  if (descriptionOverride) {
    const definition = EVENT_DEFINITIONS[type];
    const occurredAt = new Date().toISOString();
    const event: TimelineEvent = {
      id: randomUUID(),
      type,
      title: definition.title(customer, record.dealer),
      description: descriptionOverride,
      occurredAt,
      referenceNumber: record.referenceNumber,
      emailSubject: definition.subject(record.dealer),
      emailQueuedAt: occurredAt,
    };
    record.events.push(event);
    record.status = definition.status;
    record.updatedAt = occurredAt;
    queueEmail(record, event, customer);
    return;
  }

  appendEventInternal(record, type, customer);
}

export function getSanitizedRecord(id: string) {
  const record = getJourneyStore().get(id);
  if (!record) {
    return undefined;
  }

  const customer = decryptPayload<CustomerProfile>(record.encryptedCustomer);

  return {
    id: record.id,
    referenceNumber: record.referenceNumber,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    dealer: record.dealer,
    preferences: record.preferences,
    consent: record.consent,
    events: record.events,
    notifications: record.notifications.map((notification) => ({
      ...notification,
      to: maskEmail(notification.to),
    })),
    customer: {
      firstName: customer.firstName,
      lastName: maskValue(customer.lastName, { prefix: 1, suffix: 0 }),
      email: maskEmail(customer.email),
      phone: maskValue(customer.phone, { prefix: 3, suffix: 2 }),
      city: customer.city,
      state: customer.state,
    },
    plaid: record.plaid
      ? {
          institutionName: record.plaid.institutionName,
          lastSyncedAt: record.plaid.lastSyncedAt,
          recurringDeposits: record.plaid.recurringDeposits,
          accountOwners: record.plaid.accountOwners,
          paystubs: record.plaid.paystubs,
        }
      : undefined,
  };
}
