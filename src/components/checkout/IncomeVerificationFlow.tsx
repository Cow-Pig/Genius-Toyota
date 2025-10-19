'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import type {
  MockBankLinkResult,
  MockIrsTranscript,
  VerificationStatus,
} from '@/types';
import { formatCurrency } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, FileText, Loader2, Shield } from 'lucide-react';

const statusVariant: Record<VerificationStatus, 'default' | 'secondary' | 'destructive'> = {
  Pending: 'secondary',
  Verified: 'default',
  'Needs Attention': 'destructive',
};

function StatusBadge({ status }: { status: VerificationStatus }) {
  return <Badge variant={statusVariant[status]}>{status}</Badge>;
}

export function IncomeVerificationFlow() {
  const { fetchBankLink, fetchIrsTranscripts } = useMockDataProvider();
  const [bankStatus, setBankStatus] = useState<VerificationStatus>('Pending');
  const [bankResult, setBankResult] = useState<MockBankLinkResult | null>(null);
  const [bankError, setBankError] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);

  const [irsStatus, setIrsStatus] = useState<VerificationStatus>('Pending');
  const [irsTranscripts, setIrsTranscripts] = useState<MockIrsTranscript[]>([]);
  const [isPullingIrs, setIsPullingIrs] = useState(false);
  const [irsError, setIrsError] = useState<string | null>(null);

  const [manualStatus, setManualStatus] = useState<VerificationStatus>('Pending');
  const [manualPreview, setManualPreview] = useState<{ employer: string; grossPay: string; netPay: string } | null>(null);

  const handleMockBankLink = async () => {
    setIsLinking(true);
    setBankError(null);
    try {
      const result = await fetchBankLink();
      setBankResult(result);
      setBankStatus(result.status);
      if (result.status !== 'Verified') {
        setBankError('One deposit needs a quick look before we mark it as verified.');
      }
    } catch (error) {
      setBankStatus('Needs Attention');
      setBankError(error instanceof Error ? error.message : 'Unable to complete bank link.');
    } finally {
      setIsLinking(false);
    }
  };

  const handleIrsPull = async () => {
    setIsPullingIrs(true);
    setIrsError(null);
    try {
      const transcripts = await fetchIrsTranscripts();
      setIrsTranscripts(transcripts);
      setIrsStatus('Verified');
    } catch (error) {
      setIrsStatus('Needs Attention');
      setIrsError(error instanceof Error ? error.message : 'IRS transcript pull failed.');
    } finally {
      setIsPullingIrs(false);
    }
  };

  const handleManualUpload = () => {
    setManualStatus('Verified');
    setManualPreview({
      employer: 'Horizon Robotics',
      grossPay: '$3,625.75',
      netPay: '$2,880.42',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Income Verification</CardTitle>
        <CardDescription>
          Choose the quickest verification path. We default to a secure bank link, but you can also
          pull IRS transcripts or upload documents manually.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" /> Mock Bank Link
              </h3>
              <p className="text-sm text-muted-foreground">
                Read-only OAuth connection to fetch the last 90 days of deposits and match them to your employer.
              </p>
            </div>
            <StatusBadge status={bankStatus} />
          </div>
          <Button onClick={handleMockBankLink} disabled={isLinking} variant="outline">
            {isLinking ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Linking Bank…
              </span>
            ) : (
              'Launch Mock Bank Link'
            )}
          </Button>
          {bankError && (
            <p className="text-sm text-amber-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> {bankError}
            </p>
          )}
          {bankResult && (
            <div className="rounded-lg border bg-muted/40">
              <div className="border-b px-4 py-3">
                <p className="text-sm font-medium">Income Snapshot</p>
                <p className="text-xs text-muted-foreground">
                  Deposits and heuristics used to validate employment and income stability.
                </p>
              </div>
              <div className="grid gap-4 p-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Heuristics</p>
                  <div className="flex flex-wrap gap-2">
                    {bankResult.heuristics.map((hint) => (
                      <Badge key={hint} variant="outline">
                        {hint}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold">Flagged Deposits</p>
                  {bankResult.flaggedDeposits.length === 0 ? (
                    <p className="text-sm text-muted-foreground">None detected.</p>
                  ) : (
                    <ul className="text-sm text-muted-foreground list-disc list-inside">
                      {bankResult.flaggedDeposits.map((id) => (
                        <li key={id}>{id}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <Separator />
              <ScrollArea className="max-h-64">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bankResult.accounts.flatMap((account) =>
                      account.transactions.map((txn) => (
                        <TableRow key={txn.id}>
                          <TableCell>{txn.date}</TableCell>
                          <TableCell>
                            {account.name} ••••{account.mask}
                          </TableCell>
                          <TableCell>
                            <span className="flex items-center gap-1">
                              {txn.description}
                              {txn.employerMatch && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(txn.amount)}
                          </TableCell>
                        </TableRow>
                      )),
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </section>

        <Separator />

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> Mock IRS Transcript
              </h3>
              <p className="text-sm text-muted-foreground">
                Simulated 4506-C consent with ready-to-download wage & income PDFs.
              </p>
            </div>
            <StatusBadge status={irsStatus} />
          </div>
          <Button onClick={handleIrsPull} disabled={isPullingIrs} variant="outline">
            {isPullingIrs ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Fetching transcripts…
              </span>
            ) : (
              'Consent & Pull Transcripts'
            )}
          </Button>
          {irsError && (
            <p className="text-sm text-amber-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> {irsError}
            </p>
          )}
          {irsTranscripts.length > 0 && (
            <div className="rounded-lg border bg-muted/40 p-4">
              <p className="text-sm font-semibold mb-2">Available Transcripts</p>
              <ul className="space-y-2 text-sm">
                {irsTranscripts.map((transcript) => (
                  <li
                    key={transcript.id}
                    className="flex items-center justify-between rounded-md bg-background px-3 py-2 shadow-sm"
                  >
                    <div>
                      <p className="font-medium">{transcript.type}</p>
                      <p className="text-xs text-muted-foreground">
                        Tax Year {transcript.year} · Employer: {transcript.employer}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost">
                      Download PDF
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <Separator />

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-primary" /> Manual Upload Fallback
              </h3>
              <p className="text-sm text-muted-foreground">
                Prefer to upload stubs? We redact sensitive fields instantly and show what the dealer sees.
              </p>
            </div>
            <StatusBadge status={manualStatus} />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline">Review Consent Language</Button>
            <Button onClick={handleManualUpload}>Upload & Auto-Redact</Button>
          </div>
          {manualPreview && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <p className="text-sm font-semibold">Redaction Preview</p>
              <div className="grid gap-2 text-sm md:grid-cols-3">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Employer</p>
                  <p>{manualPreview.employer}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Gross Pay</p>
                  <p>{manualPreview.grossPay}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Net Pay (PII masked)</p>
                  <p>{manualPreview.netPay}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                We permanently redact account numbers and SSNs. You can revoke access at any time.
              </p>
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
