'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import bankFixture from '@/data/providers/bank.json';
import irsFixture from '@/data/providers/irs.json';
import creditFixture from '@/data/providers/credit.json';
import inventoryFixture from '@/data/providers/inventory.json';
import type {
  MockBankAccount,
  MockBankLinkResult,
  MockBankTransaction,
  MockIrsTranscript,
  MockCreditReport,
  MockCreditTradeline,
  MockInventoryVehicle,
  MockDataProviderConfig,
  MockDataProviderFailureMode,
} from '@/types';

type BankFixture = typeof bankFixture;
type IrsFixture = typeof irsFixture;
type CreditFixture = typeof creditFixture;
type InventoryFixture = typeof inventoryFixture;

type MockDataProviderContextValue = {
  config: MockDataProviderConfig;
  setConfig: (
    update:
      | Partial<MockDataProviderConfig>
      | ((prev: MockDataProviderConfig) => MockDataProviderConfig),
  ) => void;
  fetchBankLink: () => Promise<MockBankLinkResult>;
  fetchIrsTranscripts: () => Promise<MockIrsTranscript[]>;
  fetchCreditReport: () => Promise<MockCreditReport>;
  fetchInventory: () => Promise<MockInventoryVehicle[]>;
};

const defaultConfig: MockDataProviderConfig = {
  latencyMs: 400,
  failureModes: {
    bankLink: 'none',
    irsTranscript: 'none',
    creditReport: 'none',
    inventory: 'none',
  },
};

const MockDataProviderContext = createContext<MockDataProviderContextValue | undefined>(
  undefined
);

function applyFailureMode<T>(
  latencyMs: number,
  failureMode: MockDataProviderFailureMode,
  successBuilder: () => T,
  needsAttentionTransformer?: (value: T) => T,
  errorLabel?: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const duration = failureMode === 'timeout' ? latencyMs * 2 : latencyMs;
    setTimeout(() => {
      switch (failureMode) {
        case 'timeout':
          reject(new Error(`${errorLabel ?? 'Mock service'} timed out.`));
          break;
        case 'error':
          reject(new Error(`${errorLabel ?? 'Mock service'} is temporarily unavailable.`));
          break;
        case 'needsAttention':
          if (needsAttentionTransformer) {
            resolve(needsAttentionTransformer(successBuilder()));
          } else {
            resolve(successBuilder());
          }
          break;
        case 'none':
        default:
          resolve(successBuilder());
          break;
      }
    }, duration);
  });
}

function mergeConfig(
  prev: MockDataProviderConfig,
  partial: Partial<MockDataProviderConfig>,
): MockDataProviderConfig {
  return {
    latencyMs: partial.latencyMs ?? prev.latencyMs,
    failureModes: {
      ...prev.failureModes,
      ...(partial.failureModes ?? {}),
    },
  };
}

export function MockDataProviderProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [config, setConfigState] = useState<MockDataProviderConfig>(defaultConfig);

  const setConfig: MockDataProviderContextValue['setConfig'] = (update) => {
    if (typeof update === 'function') {
      setConfigState((prev) => update(prev));
    } else {
      setConfigState((prev) => mergeConfig(prev, update));
    }
  };

  const value = useMemo<MockDataProviderContextValue>(() => {
    const fetchBankLink = () =>
      applyFailureMode<MockBankLinkResult>(
        config.latencyMs,
        config.failureModes.bankLink,
        () => ({
          status: 'Verified',
          accounts: (bankFixture as BankFixture).accounts.map((account) => ({
            ...account,
            transactions: account.transactions.map((txn) => ({
              ...txn,
              type: txn.type === 'credit' ? 'credit' : 'debit',
              employerMatch: Boolean(txn.employerMatch),
            })) as MockBankTransaction[],
          })) as MockBankAccount[],
          heuristics: (bankFixture as BankFixture).heuristics,
          flaggedDeposits: (bankFixture as BankFixture).flaggedDeposits,
        }),
        (result) => ({
          ...result,
          status: 'Needs Attention',
          heuristics: [
            ...result.heuristics,
            'A recent manual transfer requires dealer review.',
          ],
        }),
        'Mock bank link',
      );

    const fetchIrsTranscripts = () =>
      applyFailureMode<MockIrsTranscript[]>(
        config.latencyMs,
        config.failureModes.irsTranscript,
        () =>
          (irsFixture as IrsFixture).transcripts.map((transcript) => ({
            ...transcript,
            type:
              transcript.type === 'Wage & Income'
                ? 'Wage & Income'
                : 'Return Transcript',
          })) as MockIrsTranscript[],
        (transcripts) => transcripts,
        'Mock IRS transcript',
      );

    const fetchCreditReport = () =>
      applyFailureMode<MockCreditReport>(
        config.latencyMs,
        config.failureModes.creditReport,
        () => {
          const report = (creditFixture as CreditFixture).report;
          return {
            ...report,
            tradelines: report.tradelines.map((tradeline) => ({
              ...tradeline,
              bureau:
                tradeline.bureau === 'Experian'
                  ? 'Experian'
                  : tradeline.bureau === 'Equifax'
                  ? 'Equifax'
                  : 'TransUnion',
              paymentStatus:
                tradeline.paymentStatus === 'Late'
                  ? 'Late'
                  : tradeline.paymentStatus === 'Closed'
                  ? 'Closed'
                  : 'Current',
            })) as MockCreditTradeline[],
          } satisfies MockCreditReport;
        },
        (report) => ({
          ...report,
          score: Math.max(report.score - 120, 520),
          scoreBand: 'Needs Attention',
        }),
        'Mock credit bureau',
      );

    const fetchInventory = () =>
      applyFailureMode<MockInventoryVehicle[]>(
        config.latencyMs,
        config.failureModes.inventory,
        () =>
          (inventoryFixture as InventoryFixture).inventory.map((item) => ({
            ...item,
          })) as MockInventoryVehicle[],
        (inventory) =>
          inventory.map((item, index) =>
            index === 0
              ? {
                  ...item,
                  available: false,
                }
              : item,
          ),
        'Mock inventory feed',
      );

    return {
      config,
      setConfig,
      fetchBankLink,
      fetchIrsTranscripts,
      fetchCreditReport,
      fetchInventory,
    };
  }, [config]);

  return (
    <MockDataProviderContext.Provider value={value}>
      {children}
    </MockDataProviderContext.Provider>
  );
}

export function useMockDataProvider() {
  const context = useContext(MockDataProviderContext);
  if (!context) {
    throw new Error(
      'useMockDataProvider must be used within a MockDataProviderProvider.',
    );
  }
  return context;
}
