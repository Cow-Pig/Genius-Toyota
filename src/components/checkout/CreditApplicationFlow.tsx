'use client';

import { useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useMockDataProvider } from '@/lib/mock-data-provider';
import type { MockCreditReport, VerificationStatus } from '@/types';
import { Loader2, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { PrequalDialog, PrequalFormValues } from './PrequalDialog';
import { useCheckout } from './CheckoutProvider';

const statusVariants: Record<VerificationStatus, 'default' | 'secondary' | 'destructive'> = {
  Pending: 'secondary',
  Verified: 'default',
  'Needs Attention': 'destructive',
};

function StatusBadge({ status }: { status: VerificationStatus }) {
  return <Badge variant={statusVariants[status]}>{status}</Badge>;
}

function formatReportDate(date: string) {
  try {
    return format(new Date(date), 'PP');
  } catch (error) {
    return date;
  }
}

export function CreditApplicationFlow() {
  const { fetchCreditReport } = useMockDataProvider();
  const [status, setStatus] = useState<VerificationStatus>('Pending');
  const [isPulling, setIsPulling] = useState(false);
  const [report, setReport] = useState<MockCreditReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPrequalOpen, setIsPrequalOpen] = useState(false);
  const [isSubmittingPrequal, setIsSubmittingPrequal] = useState(false);
  const { prequalSubmission, setPrequalSubmission } = useCheckout();

  const runSoftPull = async () => {
    setIsPulling(true);
    setError(null);

    try {
      const result = await fetchCreditReport();
      setReport(result);
      const needsAttention = result.score < 660 || result.scoreBand === 'Needs Attention';
      setStatus(needsAttention ? 'Needs Attention' : 'Verified');
      if (needsAttention) {
        setError('Score falls outside our preferred band. Flagged for dealer follow-up.');
      }
    } catch (err) {
      setReport(null);
      setStatus('Needs Attention');
      setError(err instanceof Error ? err.message : 'Unable to complete mock credit pull.');
    } finally {
      setIsPulling(false);
    }
  };

  const handleSoftPull = async () => {
    await runSoftPull();
  };

  const handlePrequalSubmit = async (values: PrequalFormValues) => {
    setIsSubmittingPrequal(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      setPrequalSubmission(values);
      setIsPrequalOpen(false);
      await runSoftPull();
    } finally {
      setIsSubmittingPrequal(false);
    }
  };

  const tradelines = useMemo(() => report?.tradelines ?? [], [report]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Credit Application</CardTitle>
            <CardDescription>
              Run a soft pull across our mock bureaus to pre-qualify without impacting the shopper's score.
            </CardDescription>
          </div>
          <StatusBadge status={status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>We never store credentials. Shopper can revoke access anytime.</p>
            <div className="flex items-center gap-2 text-xs">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>Soft pull only • masked PII • instant delete available</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => setIsPrequalOpen(true)} className="w-full sm:w-auto">
              Get prequalified
            </Button>
            <Button onClick={handleSoftPull} disabled={isPulling} variant="outline" className="w-full sm:w-auto">
              {isPulling ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running soft pull…
                </span>
              ) : (
                'Run mock soft pull'
              )}
            </Button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-amber-600">{error}</p>
        )}

        {prequalSubmission && (
          <div className="rounded-lg border bg-muted/40 p-4 text-sm">
            <p className="font-semibold">Pre-qualification submitted</p>
            <p className="text-muted-foreground">
              {prequalSubmission.firstName} {prequalSubmission.lastName} · {prequalSubmission.city}, {prequalSubmission.state}
            </p>
            <p className="text-xs text-muted-foreground">
              Monthly income {prequalSubmission.monthlyIncome} · Housing payment {prequalSubmission.housingPayment}
            </p>
          </div>
        )}

        {report && (
          <div className="space-y-4 rounded-lg border bg-muted/40 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">Applicant</p>
                <p className="text-lg font-semibold">{report.applicantName}</p>
                <p className="text-xs text-muted-foreground">Report date {formatReportDate(report.reportDate)}</p>
              </div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Credit Score</span>
                <span className="text-4xl font-bold text-primary">{report.score}</span>
                <Badge variant="outline">{report.scoreBand}</Badge>
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-sm font-semibold">Tradeline Snapshot</p>
              <ScrollArea className="max-h-60">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bureau</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Opened</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tradelines.map((line, index) => (
                      <TableRow key={`${line.bureau}-${line.accountType}-${index}`}>
                        <TableCell>{line.bureau}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{line.accountType}</span>
                            <span className="text-xs text-muted-foreground">Status: {line.paymentStatus}</span>
                          </div>
                        </TableCell>
                        <TableCell>{line.openedDate}</TableCell>
                        <TableCell className="text-right">${line.balance.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </div>
        )}
      </CardContent>

      <PrequalDialog
        open={isPrequalOpen}
        onOpenChange={setIsPrequalOpen}
        onSubmit={handlePrequalSubmit}
        isSubmitting={isSubmittingPrequal}
        initialValues={prequalSubmission ?? undefined}
      />
    </Card>
  );
}
