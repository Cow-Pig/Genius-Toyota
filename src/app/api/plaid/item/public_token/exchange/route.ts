import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  exchangePublicToken,
  buildPlaidSummary,
} from '@/lib/plaid';
import {
  appendEvent,
  getPrequalification,
  getCustomerProfile,
  recordPlaidSummary,
} from '@/lib/journey-store';
import {
  isTransportEnvelope,
  openTransportPayload,
  type TransportEnvelope,
} from '@/lib/secure-transport';

const requestSchema = z.object({
  prequalRequestId: z.string(),
  publicToken: z.string(),
  institution: z
    .object({
      name: z.string().optional(),
      institution_id: z.string().optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });
  }

  if (
    body &&
    typeof body === 'object' &&
    'envelope' in body &&
    isTransportEnvelope((body as { envelope: unknown }).envelope)
  ) {
    try {
      body = await openTransportPayload((body as { envelope: TransportEnvelope }).envelope);
    } catch (error) {
      console.error('Transport payload decrypt failed', error);
      return NextResponse.json({ error: 'Unable to decrypt payload' }, { status: 400 });
    }
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request payload', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const record = getPrequalification(parsed.data.prequalRequestId);
  if (!record) {
    return NextResponse.json({ error: 'Pre-qualification not found' }, { status: 404 });
  }

  try {
    const exchange = await exchangePublicToken(parsed.data.publicToken);
    const summary = await buildPlaidSummary(
      exchange.access_token,
      parsed.data.institution?.name ?? record.plaid?.institutionName,
    );

    recordPlaidSummary(parsed.data.prequalRequestId, {
      ...summary,
      accessToken: exchange.access_token,
      itemId: exchange.item_id,
    });

    const alreadyVerified = record.events.some((event) => event.type === 'income_verified');
    if (!alreadyVerified) {
      const profile = getCustomerProfile(record);
      appendEvent(
        parsed.data.prequalRequestId,
        'income_verified',
        `Plaid matched recurring deposits to ${profile.firstName}'s profile and confirmed account ownership.`,
      );
    }

    return NextResponse.json({
      itemId: exchange.item_id,
      plaid: summary,
      referenceNumber: record.referenceNumber,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Plaid exchange error', error);
    return NextResponse.json(
      { error: 'Unable to verify with Plaid sandbox right now.' },
      { status: 503 },
    );
  }
}
