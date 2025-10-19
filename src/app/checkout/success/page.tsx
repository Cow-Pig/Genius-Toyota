'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, Calendar, FileText, Car, MessageCircle, ShieldCheck } from 'lucide-react';

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen bg-muted/20 py-16">
      <div className="container mx-auto max-w-3xl px-4">
        <Card className="shadow-xl">
          <CardHeader className="space-y-3 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-green-500" />
            <CardTitle className="text-3xl font-bold">You're all set!</CardTitle>
            <CardDescription className="text-base">
              We've locked in your Toyota deal, captured your signatures, and scheduled the handoff. Here's what's next.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border bg-muted/40 p-4 text-left">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                    Credit
                  </Badge>
                  <ShieldCheck className="h-4 w-4 text-green-600" />
                  Verified
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Soft pull complete and shared with your dealer partner.
                </p>
              </div>
              <div className="rounded-lg border bg-muted/40 p-4 text-left">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                    Income
                  </Badge>
                  <ShieldCheck className="h-4 w-4 text-green-600" />
                  Verified
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Bank link, IRS transcripts, and documents all cleared.
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Pickup checklist</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-3">
                  <FileText className="mt-0.5 h-4 w-4 text-primary" />
                  Download your executed contract pack and GAP/warranty addenda.
                </li>
                <li className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-4 w-4 text-primary" />
                  Arrive on <span className="font-semibold text-foreground">Friday at 4:30 PM</span> for a 30-minute delivery slot.
                </li>
                <li className="flex items-start gap-3">
                  <Car className="mt-0.5 h-4 w-4 text-primary" />
                  Bring your trade-in with plates removed and all keys in hand.
                </li>
                <li className="flex items-start gap-3">
                  <MessageCircle className="mt-0.5 h-4 w-4 text-primary" />
                  Reach out via the negotiation thread if anything changes before pickup.
                </li>
              </ul>
            </div>

            <Separator />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Need to tweak financing or delivery? You can revisit the finance navigator or message your dealer anytime.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button asChild variant="outline">
                  <Link href="/offers">View my offers</Link>
                </Button>
                <Button asChild>
                  <Link href="/">Back to navigator</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
