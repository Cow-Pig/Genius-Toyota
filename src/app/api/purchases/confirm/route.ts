import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sendEmail } from '@/lib/email';

const addonSchema = z.object({
  name: z.string(),
  price: z.number(),
});

const appointmentSchema = z
  .object({
    method: z.string().nullable(),
    date: z.string().nullable(),
    timeSlot: z.string().nullable(),
  })
  .nullable();

const purchaseSchema = z.object({
  dealerId: z.string(),
  offerId: z.string(),
  vehicleModelName: z.string(),
  offerType: z.string(),
  purchaseTotal: z.number(),
  amountDueAtSigning: z.number(),
  tradeInValue: z.number().nullable(),
  selectedAddons: z.array(addonSchema),
  customer: z.object({
    email: z.string().email(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
  }),
  paymentContactName: z.string().nullable().optional(),
  appointment: appointmentSchema.optional(),
});

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const parsed = purchaseSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid purchase payload', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const {
    customer,
    selectedAddons,
    appointment,
    vehicleModelName,
    offerType,
    purchaseTotal,
    amountDueAtSigning,
    tradeInValue,
    paymentContactName,
  } = parsed.data;

  const customerName = [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim() || 'there';

  const addonsSummary = selectedAddons.length
    ? selectedAddons
        .map((addon) => `• ${addon.name} — ${usd.format(addon.price)}`)
        .join('\n')
    : 'No add-ons selected.';

  const appointmentSummary = appointment
    ? [
        appointment.method ? `Method: ${appointment.method}` : null,
        appointment.date ? `Date: ${new Date(appointment.date).toLocaleString()}` : null,
        appointment.timeSlot ? `Time: ${appointment.timeSlot}` : null,
      ]
        .filter(Boolean)
        .join('\n') || 'Appointment details will be finalized soon.'
    : 'Appointment details will be finalized soon.';

  const text = `Hi ${customerName},\n\nThanks for completing your purchase with Toyota Finance Navigator! Here are the details for your records:\n\nVehicle: ${vehicleModelName}\nOffer Type: ${offerType}\nTotal Price: ${usd.format(purchaseTotal)}\nDue at Signing: ${usd.format(amountDueAtSigning)}\nTrade-In Value: ${usd.format(tradeInValue ?? 0)}\nPayment Contact: ${paymentContactName ?? 'Not provided'}\n\nAdd-ons:\n${addonsSummary}\n\nAppointment:\n${appointmentSummary}\n\nIf you have any questions, reply to this email and our team will be happy to help.\n\n— The Toyota Finance Navigator Team`;

  const html = `<!DOCTYPE html>
<html lang="en">
  <body style="font-family:Arial,Helvetica,sans-serif;margin:0;padding:24px;background:#f5f6f8;color:#111827;">
    <table role="presentation" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
      <tr>
        <td style="background:#bf0d0d;color:#ffffff;padding:20px 32px;">
          <h1 style="margin:0;font-size:24px;">Toyota Finance Navigator</h1>
          <p style="margin:8px 0 0;font-size:16px;">Purchase Confirmation</p>
        </td>
      </tr>
      <tr>
        <td style="padding:24px 32px;">
          <p style="margin:0 0 16px;font-size:16px;">Hi ${customerName},</p>
          <p style="margin:0 0 16px;font-size:16px;line-height:24px;">Thanks for completing your purchase with Toyota Finance Navigator! Here are the details for your records:</p>
          <table role="presentation" width="100%" style="margin:16px 0;border-collapse:collapse;">
            <tbody>
              <tr>
                <td style="padding:8px 0;width:40%;color:#6b7280;">Vehicle</td>
                <td style="padding:8px 0;font-weight:600;">${vehicleModelName}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#6b7280;">Offer Type</td>
                <td style="padding:8px 0;font-weight:600;">${offerType}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#6b7280;">Total Price</td>
                <td style="padding:8px 0;font-weight:600;">${usd.format(purchaseTotal)}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#6b7280;">Due at Signing</td>
                <td style="padding:8px 0;font-weight:600;">${usd.format(amountDueAtSigning)}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#6b7280;">Trade-In Value</td>
                <td style="padding:8px 0;font-weight:600;">${usd.format(tradeInValue ?? 0)}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#6b7280;">Payment Contact</td>
                <td style="padding:8px 0;font-weight:600;">${paymentContactName ?? 'Not provided'}</td>
              </tr>
            </tbody>
          </table>
          <div style="margin:24px 0;">
            <h2 style="margin:0 0 8px;font-size:18px;">Add-ons</h2>
            <pre style="margin:0;padding:16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;font-family:inherit;white-space:pre-wrap;">${addonsSummary}</pre>
          </div>
          <div style="margin:24px 0;">
            <h2 style="margin:0 0 8px;font-size:18px;">Appointment</h2>
            <pre style="margin:0;padding:16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;font-family:inherit;white-space:pre-wrap;">${appointmentSummary}</pre>
          </div>
          <p style="margin:0;font-size:14px;color:#4b5563;">If you have any questions, reply to this email and our team will be happy to help.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  try {
    await sendEmail({
      to: customer.email,
      subject: 'Your Toyota Finance Navigator purchase confirmation',
      text,
      html,
    });
  } catch (error) {
    console.error('Failed to send purchase confirmation email', error);
    return NextResponse.json({ error: 'Unable to send purchase confirmation email' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
