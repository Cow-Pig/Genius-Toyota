import type { NegotiationMessage, NegotiationReasonCode } from '@/types';

type PersistedCounterProposal = {
  termMonths: number | null;
  mileageAllowance: number | null;
  downPayment: number | null;
  estimatedPayment: number | null;
};

export type PersistedNegotiationMessage = Omit<
  NegotiationMessage,
  'createdAt' | 'reasonCode' | 'counterProposal'
> & {
  id: string;
  createdAt: string;
  reasonCode: NegotiationReasonCode | null;
  counterProposal: PersistedCounterProposal | null;
  isLocalOnly?: boolean;
};

const STORAGE_PREFIX = 'negotiationThread';

function isValidAuthorRole(value: unknown): value is 'dealer' | 'customer' {
  return value === 'dealer' || value === 'customer';
}

function sanitizeCounterProposal(value: unknown): PersistedCounterProposal | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const sanitized: PersistedCounterProposal = {
    termMonths: null,
    mileageAllowance: null,
    downPayment: null,
    estimatedPayment: null,
  };

  let hasValue = false;

  if (typeof record.termMonths === 'number' && Number.isFinite(record.termMonths)) {
    sanitized.termMonths = Math.round(record.termMonths);
    hasValue = true;
  }

  if (typeof record.mileageAllowance === 'number' && Number.isFinite(record.mileageAllowance)) {
    sanitized.mileageAllowance = Math.round(record.mileageAllowance);
    hasValue = true;
  }

  if (typeof record.downPayment === 'number' && Number.isFinite(record.downPayment)) {
    sanitized.downPayment = Number(record.downPayment);
    hasValue = true;
  }

  if (typeof record.estimatedPayment === 'number' && Number.isFinite(record.estimatedPayment)) {
    sanitized.estimatedPayment = Number(record.estimatedPayment);
    hasValue = true;
  }

  return hasValue ? sanitized : null;
}

function sanitizeNegotiationMessage(value: unknown): PersistedNegotiationMessage | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id : null;
  const negotiationThreadId =
    typeof record.negotiationThreadId === 'string' ? record.negotiationThreadId : null;
  const authorId = typeof record.authorId === 'string' ? record.authorId : null;
  const authorRole = isValidAuthorRole(record.authorRole) ? record.authorRole : null;
  const content = typeof record.content === 'string' ? record.content : null;
  const createdAt = typeof record.createdAt === 'string' ? record.createdAt : null;

  if (!id || !negotiationThreadId || !authorId || !authorRole || !content || !createdAt) {
    return null;
  }

  const parsedDate = new Date(createdAt);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  const reasonCode =
    typeof record.reasonCode === 'string' ? (record.reasonCode as NegotiationReasonCode) : null;

  const counterProposal = sanitizeCounterProposal(record.counterProposal);

  const result: PersistedNegotiationMessage = {
    id,
    negotiationThreadId,
    authorId,
    authorRole,
    content,
    createdAt: parsedDate.toISOString(),
    reasonCode,
    counterProposal,
    isLocalOnly: Boolean(record.isLocalOnly),
  };

  return result;
}

export function loadPersistedNegotiationMessages(threadId: string): PersistedNegotiationMessage[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const storageKey = `${STORAGE_PREFIX}:${threadId}:messages`;
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry) => sanitizeNegotiationMessage(entry))
      .filter((value): value is PersistedNegotiationMessage => value !== null);
  } catch (error) {
    console.warn('Failed to load negotiation messages from localStorage', error);
    return [];
  }
}

export function persistNegotiationMessages(
  threadId: string,
  messages: PersistedNegotiationMessage[],
): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const storageKey = `${STORAGE_PREFIX}:${threadId}:messages`;
    window.localStorage.setItem(storageKey, JSON.stringify(messages));
  } catch (error) {
    console.warn('Failed to persist negotiation messages to localStorage', error);
  }
}

export function clearPersistedNegotiationMessages(threadId: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  const storageKey = `${STORAGE_PREFIX}:${threadId}:messages`;
  window.localStorage.removeItem(storageKey);
}
