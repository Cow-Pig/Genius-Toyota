import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createPrequalification, getSanitizedRecord } from '@/lib/journey-store';

const requestSchema = z.object({
  scenario: z.unknown(),
  customerProfile: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(7),
    city: z.string().optional(),
    state: z.string().optional(),
  }),
  softPullConsent: z.boolean(),
  dealer: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
  }),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request payload', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const record = createPrequalification({
    customer: parsed.data.customerProfile,
    scenario: parsed.data.scenario,
    dealer: parsed.data.dealer,
    consent: parsed.data.softPullConsent,
  });

  const sanitized = getSanitizedRecord(record.id);
  return NextResponse.json({
    prequalRequestId: record.id,
    referenceNumber: record.referenceNumber,
    status: record.status,
    timeline: sanitized?.events ?? [],
    preferences: sanitized?.preferences,
    dealer: sanitized?.dealer,
    notifications: sanitized?.notifications ?? [],
    customer: sanitized?.customer,
    lastUpdated: record.updatedAt,
  });
}
