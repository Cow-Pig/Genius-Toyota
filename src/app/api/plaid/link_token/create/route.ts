import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createLinkToken } from '@/lib/plaid';
import { getPrequalification, getCustomerProfile } from '@/lib/journey-store';
import {
  isTransportEnvelope,
  openTransportPayload,
  type TransportEnvelope,
} from '@/lib/secure-transport';

const requestSchema = z.object({
  prequalRequestId: z.string().optional(),
});

export async function POST(request: Request) {
  let body: unknown = {};
  try {
    body = await request.json();
  } catch (error) {
    // allow empty bodies to default to guest mode
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

  let name = 'Toyota Guest';
  let legalName: string | undefined;
  if (parsed.data.prequalRequestId) {
    const record = getPrequalification(parsed.data.prequalRequestId);
    if (record) {
      const profile = getCustomerProfile(record);
      name = `${profile.firstName} ${profile.lastName}`.trim();
      legalName = name;
    }
  }

  try {
    const response = await createLinkToken({
      userId: parsed.data.prequalRequestId ?? `guest-${Date.now()}`,
      name,
      legalName,
    });

    return NextResponse.json({
      linkToken: response.link_token,
      expiration: response.expiration,
    });
  } catch (error) {
    console.error('Plaid link token error', error);
    return NextResponse.json(
      {
        error: 'Unable to generate Plaid link token at this time.',
      },
      { status: 503 },
    );
  }
}
