'use client';

import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMockDataProvider } from '@/lib/mock-data-provider';
import type {
  MockBankLinkResult,
  MockPlaidExchangeMetadata,
  MockPlaidLinkToken,
  MockIrsTranscript,
  VerificationStatus,
} from '@/types';
import { formatCurrency } from '@/lib/utils';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  Shield,
} from 'lucide-react';

const statusVariant: Record<VerificationStatus, 'default' | 'secondary' | 'destructive'> = {
  Pending: 'secondary',
  Verified: 'default',
  'Needs Attention': 'destructive',
};

function StatusBadge({ status }: { status: VerificationStatus }) {
  return <Badge variant={statusVariant[status]}>{status}</Badge>;
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

type PlaidHandler = {
  open: () => void;
  exit?: () => void;
  destroy?: () => void;
};

type PlaidSuccessMetadata = {
  institution?: {
    institution_id?: string | null;
    name?: string | null;
  };
  accounts?: { id: string }[];
};

type PlaidError = {
  display_message?: string | null;
  error_message?: string | null;
};

declare global {
  interface Window {
    Plaid?: {
      create: (config: {
        token: string;
        onSuccess: (publicToken: string, metadata: PlaidSuccessMetadata) => void;
        onExit?: (error?: PlaidError | null) => void;
      }) => PlaidHandler;
    };
  }
}

export function IncomeVerificationFlow() {
  const {
    fetchBankLink,
    getPlaidLinkToken,
    exchangePlaidPublicToken,
    fetchIrsTranscripts,
  } = useMockDataProvider();
  const [bankStatus, setBankStatus] = useState<VerificationStatus>('Pending');
  const [bankResult, setBankResult] = useState<MockBankLinkResult | null>(null);
  const [bankError, setBankError] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [plaidTokenDetails, setPlaidTokenDetails] =
    useState<MockPlaidLinkToken | null>(null);
  const [plaidReady, setPlaidReady] = useState(false);
  const [plaidError, setPlaidError] = useState<string | null>(null);
  const [isLoadingLinkToken, setIsLoadingLinkToken] = useState(false);

  const [irsStatus, setIrsStatus] = useState<VerificationStatus>('Pending');
  const [irsTranscripts, setIrsTranscripts] = useState<MockIrsTranscript[]>([]);
  const [isPullingIrs, setIsPullingIrs] = useState(false);
  const [irsError, setIrsError] = useState<string | null>(null);

  const [manualStatus, setManualStatus] = useState<VerificationStatus>('Pending');
  const [manualPreview, setManualPreview] = useState<
    | {
        employer: string;
        grossPay: string;
        netPay: string;
        fileName: string;
        fileSize: string;
      }
    | null
  >(null);
  const [manualError, setManualError] = useState<string | null>(null);
  const [isUploadingManual, setIsUploadingManual] = useState(false);

  const plaidHandlerRef = useRef<PlaidHandler | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingLinkToken(true);
    getPlaidLinkToken()
      .then((token) => {
        if (!isMounted) {
          return;
        }
        setLinkToken(token.token);
        setPlaidTokenDetails(token);
        setPlaidError(null);
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }
        setPlaidError(
          error instanceof Error
            ? error.message
            : 'Unable to retrieve Plaid link token. Using mock verifier instead.',
        );
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingLinkToken(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [getPlaidLinkToken]);

  useEffect(() => {
    if (!linkToken || typeof window === 'undefined') {
      return;
    }

    if (window.Plaid) {
      setPlaidReady(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
    script.async = true;
    script.onload = () => {
      setPlaidReady(true);
    };
    script.onerror = () => {
      setPlaidError(
        'We could not load Plaid Link in this environment. Falling back to mock verification.',
      );
    };
    document.body.appendChild(script);

    return () => {
      script.onload = null;
      script.onerror = null;
    };
  }, [linkToken]);

  useEffect(() => {
    return () => {
      plaidHandlerRef.current?.exit?.();
      plaidHandlerRef.current?.destroy?.();
      plaidHandlerRef.current = null;
    };
  }, []);

  const flattenedTransactions = useMemo(() => {
    if (!bankResult) {
      return [] as {
        id: string;
        date: string;
        description: string;
        amount: number;
        accountName: string;
        accountMask: string;
        employerMatch?: boolean;
      }[];
    }

    return bankResult.accounts.flatMap((account) =>
      account.transactions.map((txn) => ({
        ...txn,
        accountName: account.name,
        accountMask: account.mask,
      })),
    );
  }, [bankResult]);

  const handleBankVerification = async () => {
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
      setBankError(
        error instanceof Error ? error.message : 'Unable to complete bank link.',
      );
    } finally {
      setIsLinking(false);
    }
  };

  const handlePlaidLaunch = () => {
    setPlaidError(null);
    setBankError(null);

    if (!linkToken || !plaidReady || typeof window === 'undefined' || !window.Plaid) {
      handleBankVerification();
      return;
    }

    plaidHandlerRef.current?.exit?.();
    plaidHandlerRef.current?.destroy?.();

    const handler = window.Plaid.create({
      token: linkToken,
      onSuccess: async (publicToken, metadata) => {
        setIsLinking(true);
        try {
          const exchangeMetadata: MockPlaidExchangeMetadata = {
            institutionId: metadata.institution?.institution_id ?? null,
            accountIds: metadata.accounts?.map((account) => account.id) ?? [],
          };
          const result = await exchangePlaidPublicToken(
            publicToken,
            exchangeMetadata,
          );
          setBankResult(result);
          setBankStatus(result.status);
          if (result.status !== 'Verified') {
            setBankError('Plaid flagged a detail for dealer review.');
          }
        } catch (error) {
          setBankStatus('Needs Attention');
          setBankError(
            error instanceof Error
              ? error.message
              : 'Unable to exchange Plaid token. Try again.',
          );
        } finally {
          setIsLinking(false);
          handler.exit?.();
        }
      },
      onExit: (error) => {
        if (error?.display_message || error?.error_message) {
          setPlaidError(error.display_message ?? error.error_message ?? null);
        }
        setIsLinking(false);
      },
    });

    plaidHandlerRef.current = handler;
    handler.open();
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
      setIrsError(
        error instanceof Error ? error.message : 'IRS transcript pull failed.',
      );
    } finally {
      setIsPullingIrs(false);
    }
  };

  const handleManualUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setManualStatus('Pending');
    setManualError(null);
    setManualPreview(null);
    setIsUploadingManual(true);

    const reader = new FileReader();
    reader.onload = () => {
      setTimeout(() => {
        setManualStatus('Verified');
        setManualPreview({
          employer: 'Auto-detected: Horizon Robotics',
          grossPay: '$74,250.00',
          netPay: '$58,400.00',
          fileName: file.name,
          fileSize: formatFileSize(file.size),
        });
        setIsUploadingManual(false);
      }, 450);
    };
    reader.onerror = () => {
      setManualStatus('Needs Attention');
      setManualError('We could not read that file. Please upload a PDF or image.');
      setIsUploadingManual(false);
    };
    reader.readAsArrayBuffer(file);
  };

  const canLaunchPlaid = Boolean(linkToken && plaidReady && !isLoadingLinkToken);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Income Verification</CardTitle>
        <CardDescription>
          Choose the quickest verification path. We default to a secure Plaid bank link, but you can also
          pull IRS transcripts or upload documents manually.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <section className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-xl font-semibold">
                <Shield className="h-5 w-5 text-primary" /> Plaid Bank Link
              </h3>
              <p className="text-sm text-muted-foreground">
                Read-only OAuth connection via Plaid to fetch the last 90 days of deposits and match them to your employer.
              </p>
              {plaidTokenDetails?.institution?.name && (
                <p className="text-xs text-muted-foreground">
                  Powered by {plaidTokenDetails.institution.name}
                  {plaidTokenDetails.supportMessage
                    ? ` · ${plaidTokenDetails.supportMessage}`
                    : ''}
                </p>
              )}
            </div>
            <StatusBadge status={bankStatus} />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              onClick={handlePlaidLaunch}
              disabled={isLinking || !canLaunchPlaid}
              className="w-full sm:w-auto"
            >
              {isLinking ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying with Plaid…
                </span>
              ) : isLoadingLinkToken ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Preparing Plaid Link…
                </span>
              ) : (
                'Launch Plaid Link'
              )}
            </Button>
            <Button
              onClick={handleBankVerification}
              variant="outline"
              disabled={isLinking}
              className="w-full sm:w-auto"
            >
              Use mock bank statements instead
            </Button>
          </div>
          {(plaidError || bankError) && (
            <div className="space-y-1 text-sm text-amber-600">
              {plaidError && (
                <p className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> {plaidError}
                </p>
              )}
              {bankError && (
                <p className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> {bankError}
                </p>
              )}
            </div>
          )}
          {bankResult && (
            <div className="rounded-lg border bg-muted/40">
              <div className="space-y-2 border-b px-4 py-3">
                <p className="text-sm font-medium">Income Snapshot</p>
                <p className="text-xs text-muted-foreground">
                  Deposits and heuristics used to validate employment and income stability.
                </p>
                {bankResult.institution?.name && (
                  <p className="text-xs text-muted-foreground">
                    Institution: {bankResult.institution.name} · Last synced{' '}
                    {bankResult.lastSyncedAt}
                  </p>
                )}
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
                    <ul className="list-inside list-disc text-sm text-muted-foreground">
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
                    {flattenedTransactions.map((txn) => (
                      <TableRow key={txn.id}>
                        <TableCell>{txn.date}</TableCell>
                        <TableCell>
                          {txn.accountName} ••••{txn.accountMask}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1">
                            {txn.description}
                            {txn.employerMatch && (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(txn.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-xl font-semibold">
                <FileText className="h-5 w-5 text-primary" /> IRS Transcript Pull
              </h3>
              <p className="text-sm text-muted-foreground">
                Simulated 4506-C consent with wage &amp; income PDFs ready for download.
              </p>
            </div>
            <StatusBadge status={irsStatus} />
          </div>
          <Button onClick={handleIrsPull} disabled={isPullingIrs} variant="outline">
            {isPullingIrs ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Pulling transcripts…
              </span>
            ) : (
              'Pull IRS Transcripts'
            )}
          </Button>
          {irsError && (
            <p className="text-sm text-amber-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> {irsError}
            </p>
          )}
          {irsTranscripts.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2">
              {irsTranscripts.map((transcript) => (
                <div key={transcript.id} className="rounded-lg border bg-muted/40 p-4">
                  <p className="text-sm font-semibold">
                    {transcript.type} · {transcript.year}
                  </p>
                  <p className="text-xs text-muted-foreground">{transcript.employer}</p>
                  <p className="text-sm font-medium">
                    Total income {formatCurrency(transcript.totalIncome)}
                  </p>
                  <Button asChild size="sm" className="mt-2 w-full">
                    <a href={transcript.pdfUrl} download>
                      Download mock PDF
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-semibold">Manual Upload</h3>
              <p className="text-sm text-muted-foreground">
                Upload a W-2, pay stub, or employment letter for instant parsing and redaction previews.
              </p>
            </div>
            <StatusBadge status={manualStatus} />
          </div>
          <div className="space-y-3">
            <Label htmlFor="w2-upload">Attach W-2 or pay stub</Label>
            <Input
              id="w2-upload"
              type="file"
              accept="application/pdf,image/*"
              onChange={handleManualUpload}
              disabled={isUploadingManual}
            />
            <p className="text-xs text-muted-foreground">
              We only read the document in memory to surface highlights. Nothing is stored.
            </p>
          </div>
          {isUploadingManual && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Parsing document…
            </p>
          )}
          {manualError && (
            <p className="flex items-center gap-2 text-sm text-amber-600">
              <AlertTriangle className="h-4 w-4" /> {manualError}
            </p>
          )}
          {manualPreview && (
            <div className="rounded-lg border bg-muted/40 p-4 text-sm">
              <p className="font-semibold">Document summary</p>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                <li>File: {manualPreview.fileName} ({manualPreview.fileSize})</li>
                <li>Employer match: {manualPreview.employer}</li>
                <li>Gross pay detected: {manualPreview.grossPay}</li>
                <li>Net pay detected: {manualPreview.netPay}</li>
              </ul>
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
