'use client';

import { useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFirebase, useMemoFirebase, useCollection } from '@/firebase';
import { collection, doc, orderBy, query, serverTimestamp, Timestamp } from 'firebase/firestore';
import { addDocumentNonBlocking, setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { FinancialOffer, NegotiationMessage, NegotiationReasonCode } from '@/types';
import { calculateLeasePayment, calculateLoanPayment } from '@/lib/calculations';
import { formatCurrency } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { MessageSquare, Send } from 'lucide-react';

interface NegotiationThreadProps {
  offer: FinancialOffer;
}

interface CounterPreset {
  label: string;
  reasonCode: NegotiationReasonCode;
  updates: {
    termMonths?: number;
    mileageAllowance?: number;
    downPayment?: number;
  };
}

function formatDate(value?: Date | Timestamp | { seconds: number; nanoseconds?: number }) {
  if (!value) return '—';
  if (value instanceof Date) return value.toLocaleString();
  if (value instanceof Timestamp) return value.toDate().toLocaleString();
  if (typeof value === 'object' && 'seconds' in value) {
    return new Date(value.seconds * 1000).toLocaleString();
  }
  return '—';
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((segment) => segment[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function buildCounterPresets(offer: FinancialOffer): CounterPreset[] {
  if (offer.offerType === 'lease') {
    return [
      {
        label: 'Reduce mileage to 10k/year',
        reasonCode: 'MILEAGE_ADJUSTMENT',
        updates: {
          mileageAllowance: Math.max((offer.mileageAllowance ?? 12000) - 2000, 10000),
        },
      },
      {
        label: 'Extend to 39 months',
        reasonCode: 'TERM_EXTENSION',
        updates: {
          termMonths: offer.termMonths + 3,
        },
      },
      {
        label: 'Add $500 to due-at-signing',
        reasonCode: 'DOWN_PAYMENT_ADJUSTMENT',
        updates: {
          downPayment: (offer.dueAtSigning ?? 1500) + 500,
        },
      },
    ];
  }

  return [
    {
      label: 'Extend to 60 months',
      reasonCode: 'TERM_EXTENSION',
      updates: {
        termMonths: Math.min(offer.termMonths + 24, 72),
      },
    },
    {
      label: 'Add $1,000 down',
      reasonCode: 'DOWN_PAYMENT_ADJUSTMENT',
      updates: {
        downPayment: (offer.dueAtSigning ?? 0) + 1000,
      },
    },
    {
      label: 'Shorten term to 36 months',
      reasonCode: 'TERM_EXTENSION',
      updates: {
        termMonths: Math.max(offer.termMonths - 12, 24),
      },
    },
  ];
}

export function NegotiationThread({ offer }: NegotiationThreadProps) {
  const { firestore, user } = useFirebase();
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const threadRef = useMemoFirebase(() => {
    if (!firestore || !offer.id) return null;
    return doc(firestore, 'negotiationThreads', offer.id);
  }, [firestore, offer.id]);

  const messagesQuery = useMemoFirebase(() => {
    if (!threadRef) return null;
    return query(collection(threadRef, 'messages'), orderBy('createdAt', 'asc'));
  }, [threadRef]);

  const { data: messages } = useCollection<NegotiationMessage>(messagesQuery);

  const counterPresets = useMemo(() => buildCounterPresets(offer), [offer]);

  const authorRole = user?.uid === offer.dealerId ? 'dealer' : 'customer';

  const ensureThreadMetadata = () => {
    if (!threadRef || !firestore) return;
    const basePayload: Record<string, unknown> = {
      financialOfferId: offer.id,
      dealerId: offer.dealerId,
      status: 'open',
      updatedAt: serverTimestamp(),
    };
    if (!messages || messages.length === 0) {
      basePayload.createdAt = serverTimestamp();
    }
    setDocumentNonBlocking(threadRef, basePayload, { merge: true });
  };

  const handleSendMessage = async (
    content: string,
    reasonCode: NegotiationReasonCode = 'CUSTOM',
    counterProposal?: NegotiationMessage['counterProposal'],
  ) => {
    if (!threadRef || !firestore || !user) return;
    ensureThreadMetadata();
    setIsSending(true);
    try {
      await addDocumentNonBlocking(collection(threadRef, 'messages'), {
        negotiationThreadId: offer.id,
        authorId: user.uid,
        authorRole,
        content,
        reasonCode,
        counterProposal,
        createdAt: serverTimestamp(),
      });
      updateDocumentNonBlocking(threadRef, {
        lastMessagePreview: content.slice(0, 140),
        updatedAt: serverTimestamp(),
      });
      setMessage('');
    } finally {
      setIsSending(false);
    }
  };

  const computeCounterPayment = (updates: CounterPreset['updates']) => {
    const term = updates.termMonths ?? offer.termMonths;
    const down = updates.downPayment ?? offer.dueAtSigning ?? 0;

    if (offer.offerType === 'lease') {
      const residualPercentage = (offer.residualPercentage ?? 60) / 100;
      const payment = calculateLeasePayment(
        offer.msrp,
        residualPercentage,
        term,
        offer.moneyFactor ?? 0.0025,
      );
      return payment + (offer.fees ?? 0) / Math.max(term, 1);
    }

    const incentives = offer.incentives ?? 0;
    const fees = offer.fees ?? 0;
    const principal = Math.max(offer.msrp + fees - incentives - down, 0);
    const payment = calculateLoanPayment(principal, (offer.apr ?? 6) / 100, term);
    return payment;
  };

  const handlePresetClick = (preset: CounterPreset) => {
    const estimatedPayment = computeCounterPayment(preset.updates);
    const summaryParts: string[] = [];

    if (preset.updates.termMonths && preset.updates.termMonths !== offer.termMonths) {
      summaryParts.push(`term ${preset.updates.termMonths} months`);
    }
    if (preset.updates.mileageAllowance && preset.updates.mileageAllowance !== offer.mileageAllowance) {
      summaryParts.push(`${preset.updates.mileageAllowance.toLocaleString()} mi/year`);
    }
    if (preset.updates.downPayment && preset.updates.downPayment !== offer.dueAtSigning) {
      summaryParts.push(`$${preset.updates.downPayment.toLocaleString()} due at signing`);
    }

    const content = `Counter offer: ${summaryParts.join(' · ') || 'updated terms'} with an estimated payment of ${formatCurrency(
      estimatedPayment,
    )}/mo.`;

    handleSendMessage(content, preset.reasonCode, {
      termMonths: preset.updates.termMonths,
      mileageAllowance: preset.updates.mileageAllowance,
      downPayment: preset.updates.downPayment,
      estimatedPayment: Number(estimatedPayment.toFixed(2)),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" /> Negotiation Thread
        </CardTitle>
        <CardDescription>
          Collaborate with your dealer in real time. Counter adjustments instantly recalculate payments and
          leave an audit-friendly trail.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 md:grid-cols-3">
          {counterPresets.map((preset) => (
            <Button
              key={preset.label}
              variant="outline"
              onClick={() => handlePresetClick(preset)}
              disabled={isSending}
            >
              {preset.label}
            </Button>
          ))}
        </div>
        <Separator />
        <ScrollArea className="h-80 rounded-md border bg-muted/30 p-4">
          <div className="space-y-4">
            {messages && messages.length > 0 ? (
              messages.map((msg) => (
                <div key={msg.id} className="rounded-lg bg-background p-4 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback>{getInitials(msg.authorRole === 'dealer' ? 'Dealer' : 'Customer')}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium capitalize">{msg.authorRole}</span>
                      <span>· {formatDate(msg.createdAt)}</span>
                    </div>
                    {msg.reasonCode && <Badge variant="secondary">{msg.reasonCode}</Badge>}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed whitespace-pre-line">{msg.content}</p>
                  {msg.counterProposal && (
                    <div className="mt-3 grid gap-2 rounded-md border bg-muted/50 p-3 text-xs text-muted-foreground md:grid-cols-2">
                      {msg.counterProposal.termMonths && (
                        <div>
                          <span className="font-semibold text-foreground">Term:</span> {msg.counterProposal.termMonths} months
                        </div>
                      )}
                      {msg.counterProposal.mileageAllowance && (
                        <div>
                          <span className="font-semibold text-foreground">Mileage:</span>{' '}
                          {msg.counterProposal.mileageAllowance.toLocaleString()} mi/year
                        </div>
                      )}
                      {msg.counterProposal.downPayment !== undefined && (
                        <div>
                          <span className="font-semibold text-foreground">Due at signing:</span>{' '}
                          {formatCurrency(msg.counterProposal.downPayment ?? 0)}
                        </div>
                      )}
                      {msg.counterProposal.estimatedPayment !== undefined && (
                        <div>
                          <span className="font-semibold text-foreground">Estimated payment:</span>{' '}
                          {formatCurrency(msg.counterProposal.estimatedPayment ?? 0)}/mo
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No messages yet. Kick off the conversation with a counter offer.
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        <Textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Add context or ask a question."
          className="min-h-[80px]"
        />
        <div className="flex w-full items-center justify-between">
          <p className="text-xs text-muted-foreground">
            All messages are timestamped and stored with the offer audit trail.
          </p>
          <Button
            onClick={() => handleSendMessage(message)}
            disabled={!message.trim() || isSending}
          >
            <Send className="mr-2 h-4 w-4" /> Send
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
