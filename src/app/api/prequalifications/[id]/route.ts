import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getSanitizedRecord,
  updatePreferences,
} from '@/lib/journey-store';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const record = getSanitizedRecord(params.id);
  if (!record) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    prequalRequestId: record.id,
    referenceNumber: record.referenceNumber,
    status: record.status,
    dealer: record.dealer,
    preferences: record.preferences,
    consent: record.consent,
    customer: record.customer,
    events: record.events,
    notifications: record.notifications,
    plaid: record.plaid,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

const validPreferenceKeys = new Set([
  'prequalification_submitted',
  'offer_received',
  'income_verified',
  'decision_ready',
  'contract_available',
  'pickup_scheduled',
]);

const preferencesSchema = z.object({
  preferences: z
    .record(z.boolean())
    .transform((value) => {
      return Object.fromEntries(
        Object.entries(value).filter(([key]) => validPreferenceKeys.has(key)),
      );
    }),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const body = await request.json();
  const parsed = preferencesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid preferences payload', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updated = updatePreferences(params.id, parsed.data.preferences);
  if (!updated) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const sanitized = getSanitizedRecord(params.id);
  return NextResponse.json({
    prequalRequestId: sanitized?.id,
    preferences: sanitized?.preferences,
    updatedAt: sanitized?.updatedAt,
  });
}
