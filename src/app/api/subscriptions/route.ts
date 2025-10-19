import { NextResponse } from 'next/server';
import { z } from 'zod';
import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getServerFirestore } from '@/firebase/server-app';
import { sendEmail } from '@/lib/email';

const subscriptionSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120).optional(),
});

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const parsed = subscriptionSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid subscription details', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const firestore = getServerFirestore();
  const normalizedEmail = parsed.data.email.trim().toLowerCase();

  await setDoc(
    doc(collection(firestore, 'emailSubscriptions'), normalizedEmail),
    {
      email: normalizedEmail,
      name: parsed.data.name ?? null,
      subscribedAt: serverTimestamp(),
    },
    { merge: true },
  );

  const greetingName = parsed.data.name?.trim() ?? 'there';
  const textContent = `Hi ${greetingName},\n\nThanks for subscribing to Genius Toyota updates! We'll keep you posted with the latest offers and announcements.\n\nIf you ever want to unsubscribe, just reply to this email and we'll take care of it.\n\n— The Genius Toyota Team`;

  try {
    await sendEmail({
      to: normalizedEmail,
      subject: 'You are subscribed to Genius Toyota updates',
      text: textContent,
    });
  } catch (error) {
    console.error('Failed to send subscription confirmation email', error);
    return NextResponse.json({ error: 'Unable to send confirmation email' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
