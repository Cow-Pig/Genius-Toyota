'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import type { TimelineEvent } from '@/lib/journey-store';
import { format } from 'date-fns';

const eventLabels: Record<TimelineEvent['type'], string> = {
  prequalification_submitted: 'Pre-qualification submitted',
  offer_received: 'Offer received',
  income_verified: 'Income verified',
  decision_ready: 'Decision ready',
  contract_available: 'Contract package available',
  pickup_scheduled: 'Pickup scheduled',
};

const toneMap: Record<TimelineEvent['type'], 'default' | 'secondary' | 'outline'> = {
  prequalification_submitted: 'secondary',
  offer_received: 'default',
  income_verified: 'default',
  decision_ready: 'default',
  contract_available: 'default',
  pickup_scheduled: 'default',
};

function formatTimestamp(timestamp: string) {
  try {
    return format(new Date(timestamp), 'PPpp');
  } catch (error) {
    return timestamp;
  }
}

export function StatusTimeline({
  events,
  referenceNumber,
  lastUpdated,
  loading = false,
}: {
  events: TimelineEvent[];
  referenceNumber?: string | null;
  lastUpdated?: string | null;
  loading?: boolean;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Customer timeline</CardTitle>
          {referenceNumber ? (
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Ref. {referenceNumber}
            </span>
          ) : null}
        </div>
        {lastUpdated ? (
          <p className="text-xs text-muted-foreground">Last updated {formatTimestamp(lastUpdated)}</p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-start gap-3">
                <Skeleton className="mt-1 h-3 w-3 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No milestones yet. Submit a request to kick things off.</p>
        ) : (
          <div className="space-y-4">
            {events.map((event, index) => (
              <div key={event.id} className="relative pl-5">
                {index !== 0 ? (
                  <span className="absolute left-[5px] top-0 h-full w-px bg-muted" aria-hidden="true" />
                ) : null}
                <div className="flex items-start gap-3">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={toneMap[event.type]}>{eventLabels[event.type]}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(event.occurredAt)}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground">{event.referenceNumber}</span>
                    </div>
                    <p className="text-sm font-medium text-foreground">{event.title}</p>
                    <p className="text-sm text-muted-foreground">{event.description}</p>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-wide text-muted-foreground">
                      <span>Email subject: {event.emailSubject}</span>
                      {event.emailSentAt ? <span>Sent {formatTimestamp(event.emailSentAt)}</span> : <span>Queued</span>}
                    </div>
                  </div>
                </div>
                {index !== events.length - 1 ? <Separator className="my-4" /> : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
