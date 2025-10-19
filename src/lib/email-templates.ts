import { format } from 'date-fns';
import type { TimelineEventType } from './journey-store';

const BRAND_FOOTER = `
  <tr>
    <td style="padding:24px 32px;background:#111827;color:#f9fafb;font-family:'Inter',Arial,sans-serif;font-size:12px;line-height:18px;">
      Toyota Motor Credit Corporation · NMLS ID 8027<br />
      19001 South Western Avenue, Torrance, CA 90501
    </td>
  </tr>
`;

const greetings = {
  offer_received: 'Your dealer offer just landed',
  income_verified: 'Income verification complete',
  prequalification_submitted: 'We received your pre-qualification request',
  decision_ready: 'Your decision is ready to review',
  contract_available: 'Your finance paperwork is prepped',
  pickup_scheduled: 'We booked your pickup appointment',
} satisfies Record<TimelineEventType, string>;

export function buildEmailHtml(
  type: TimelineEventType,
  options: {
    customerName: string;
    dealerName: string;
    summary: string;
    occurredAt: string;
    referenceNumber: string;
  },
): string {
  const title = greetings[type] ?? 'Update from Toyota Financial';
  const occurred = format(new Date(options.occurredAt), 'PPpp');
  const brandColor = '#BF0D0D';

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charSet="utf-8" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:'Inter',Arial,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;">
      <tr>
        <td style="padding:24px 32px;border-bottom:4px solid ${brandColor};">
          <h1 style="margin:0;font-size:24px;line-height:32px;font-weight:700;color:${brandColor};">Toyota Financial</h1>
          <p style="margin:8px 0 0;font-size:16px;line-height:24px;">${title}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:24px 32px;">
          <p style="margin:0 0 16px;font-size:16px;line-height:24px;">Hi ${options.customerName},</p>
          <p style="margin:0 0 16px;font-size:16px;line-height:24px;">${options.summary}</p>
          <table role="presentation" width="100%" style="margin:24px 0;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;">
            <tr>
              <td style="padding:20px 24px;">
                <p style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;">Dealer</p>
                <p style="margin:4px 0 0;font-size:16px;font-weight:600;">${options.dealerName}</p>
                <p style="margin:16px 0 0;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;">Time</p>
                <p style="margin:4px 0 0;font-size:16px;font-weight:600;">${occurred}</p>
                <p style="margin:16px 0 0;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;">Reference</p>
                <p style="margin:4px 0 0;font-size:16px;font-weight:600;">${options.referenceNumber}</p>
              </td>
            </tr>
          </table>
          <p style="margin:0;font-size:14px;line-height:22px;color:#4b5563;">Need help? Reply to this email or call us at 1-800-874-8822. We&apos;re here 7 days a week.</p>
        </td>
      </tr>
      ${BRAND_FOOTER}
    </table>
  </body>
</html>`;
}
