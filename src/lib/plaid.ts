const PLAID_BASE_URL = 'https://sandbox.plaid.com';

type PlaidCredentials = {
  clientId: string;
  secret: string;
};

function getPlaidCredentials(): PlaidCredentials {
  const clientId =
    process.env.PLAID_CLIENT_ID || process.env.NEXT_PUBLIC_PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET || process.env.NEXT_PUBLIC_PLAID_SECRET;

  if (!clientId || !secret) {
    throw new Error('Plaid credentials are not configured.');
  }

  return { clientId, secret };
}

type PlaidRequestBody = Record<string, unknown>;

async function plaidFetch<T>(endpoint: string, body: PlaidRequestBody): Promise<T> {
  const creds = getPlaidCredentials();
  const response = await fetch(`${PLAID_BASE_URL}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: creds.clientId, secret: creds.secret, ...body }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Plaid API error (${endpoint}): ${response.status} ${errorText}`);
  }

  return (await response.json()) as T;
}

type LinkTokenConfig = {
  userId: string;
  name: string;
  legalName?: string;
};

export async function createLinkToken(config: LinkTokenConfig) {
  const response = await plaidFetch<{
    link_token: string;
    expiration: string;
  }>('link/token/create', {
    user: {
      client_user_id: config.userId,
      legal_name: config.legalName ?? config.name,
    },
    client_name: 'Toyota Financial',
    language: 'en',
    products: ['income_verification', 'identity', 'transactions'],
    country_codes: ['US'],
  });

  return response;
}

type ExchangeResult = {
  access_token: string;
  item_id: string;
};

export async function exchangePublicToken(publicToken: string): Promise<ExchangeResult> {
  return plaidFetch<ExchangeResult>('item/public_token/exchange', {
    public_token: publicToken,
  });
}

type TransactionsSyncResponse = {
  added: Array<{
    transaction_id: string;
    name: string;
    merchant_name?: string | null;
    amount: number;
    iso_currency_code?: string | null;
    account_id: string;
    date: string;
  }>;
  accounts: Array<{
    account_id: string;
    name: string;
    official_name?: string | null;
    mask?: string | null;
    type?: string | null;
    subtype?: string | null;
  }>;
  next_cursor?: string | null;
  has_more: boolean;
};

async function pullRecentTransactions(accessToken: string) {
  const collected: TransactionsSyncResponse['added'] = [];
  let cursor: string | null | undefined;
  let accounts: TransactionsSyncResponse['accounts'] = [];
  let iterations = 0;

  do {
    const response = await plaidFetch<TransactionsSyncResponse>('transactions/sync', {
      access_token: accessToken,
      cursor: cursor ?? undefined,
      count: 100,
    });
    collected.push(...response.added);
    accounts = response.accounts;
    cursor = response.next_cursor;
    iterations += 1;
    if (!response.has_more || iterations >= 5) {
      break;
    }
  } while (true);

  return { transactions: collected, accounts };
}

type IdentityResponse = {
  accounts: Array<{
    account_id: string;
    name?: string | null;
    mask?: string | null;
    owners?: Array<{
      names?: string[];
    }>;
  }>;
};

async function fetchIdentity(accessToken: string): Promise<IdentityResponse> {
  return plaidFetch<IdentityResponse>('identity/get', { access_token: accessToken });
}

type PaystubsResponse = {
  paystubs: Array<{
    employer: {
      name?: string | null;
    };
    pay_period_details?: {
      pay_period_start_date?: string | null;
      pay_period_end_date?: string | null;
    };
    pay_date?: string | null;
    gross_earnings?: Array<{
      current_amount?: number | null;
    }>;
    net_earnings?: Array<{
      current_amount?: number | null;
    }>;
    document_id?: string | null;
  }>;
};

async function fetchPaystubs(accessToken: string): Promise<PaystubsResponse | null> {
  try {
    const response = await plaidFetch<PaystubsResponse>('income/verification/paystubs/get', {
      access_token: accessToken,
    });
    return response;
  } catch (error) {
    console.warn('Unable to fetch Plaid paystubs', error);
    return null;
  }
}

function summarizeDeposits(transactions: TransactionsSyncResponse['added']) {
  const deposits = transactions.filter((txn) => txn.amount < 0).map((txn) => ({
    ...txn,
    amount: Math.abs(txn.amount),
  }));

  const grouped = new Map<string, { total: number; count: number; lastDate: string }>();

  deposits.forEach((txn) => {
    const key = txn.merchant_name || txn.name;
    if (!grouped.has(key)) {
      grouped.set(key, { total: 0, count: 0, lastDate: txn.date });
    }
    const bucket = grouped.get(key)!;
    bucket.total += txn.amount;
    bucket.count += 1;
    if (new Date(txn.date) > new Date(bucket.lastDate)) {
      bucket.lastDate = txn.date;
    }
  });

  return Array.from(grouped.entries())
    .map(([name, stats]) => ({
      name,
      averageAmount: stats.total / stats.count,
      cadence: stats.count >= 6 ? 'Bi-weekly' : stats.count >= 3 ? 'Monthly' : 'Ad-hoc',
      lastDeposit: stats.lastDate,
    }))
    .sort((a, b) => b.averageAmount - a.averageAmount)
    .slice(0, 4);
}

type PlaidSummary = {
  recurringDeposits: ReturnType<typeof summarizeDeposits>;
  accountOwners: Array<{
    accountName: string;
    mask: string;
    owners: string[];
  }>;
  paystubs: Array<{
    employer: string;
    payDate: string;
    grossPay: number;
    netPay: number;
    documentName: string;
    documentSize: number;
    lastVerified: string;
    downloadUrl?: string;
  }>;
  lastSyncedAt: string;
  institutionName?: string;
};

export async function buildPlaidSummary(
  accessToken: string,
  institutionName?: string,
): Promise<PlaidSummary> {
  const [{ transactions, accounts }, identity, paystubs] = await Promise.all([
    pullRecentTransactions(accessToken),
    fetchIdentity(accessToken),
    fetchPaystubs(accessToken),
  ]);

  const ownersByAccount = new Map<string, string[]>();
  identity.accounts.forEach((account) => {
    ownersByAccount.set(account.account_id, account.owners?.flatMap((owner) => owner.names ?? []) ?? []);
  });

  const accountOwners = accounts.map((account) => ({
    accountName: account.official_name || account.name,
    mask: account.mask ?? '—',
    owners: ownersByAccount.get(account.account_id) ?? [],
  }));

  const recurringDeposits = summarizeDeposits(transactions);

  const paystubSummaries = (paystubs?.paystubs ?? []).map((stub, index) => ({
    employer: stub.employer?.name ?? 'Employer',
    payDate: stub.pay_date ?? '',
    grossPay: stub.gross_earnings?.[0]?.current_amount ?? 0,
    netPay: stub.net_earnings?.[0]?.current_amount ?? 0,
    documentName: `paystub-${index + 1}.pdf`,
    documentSize: 524288,
    lastVerified: new Date().toISOString(),
    downloadUrl: stub.document_id
      ? `https://sandbox.plaid.com/paystubs/${stub.document_id}.pdf`
      : undefined,
  }));

  return {
    recurringDeposits,
    accountOwners,
    paystubs: paystubSummaries,
    lastSyncedAt: new Date().toISOString(),
    institutionName,
  };
}
