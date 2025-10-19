
import type { FieldValue, Timestamp } from 'firebase/firestore';

export type OfferType = 'loan' | 'lease' | 'cash';
export type OfferStatus = 'draft' | 'published' | 'expired';

export interface VehicleDetails {
  make: string;
  model: string;
  year: number;
  trim: string;
  vin: string;
  imageUrl?: string;
}

export interface FinancialOffer {
  id: string;
  dealerId: string;
  vehicleModelName: string;
  offerType: OfferType;
  status: OfferStatus;
  msrp: number;
  termMonths: number;
  monthlyPayment?: number;
  apr?: number;
  moneyFactor?: number;
  residualPercentage?: number;
  incentives?: number;
  fees?: number;
  taxRate?: number;
  mileageAllowance?: number;
  dueAtSigning?: number;
  offerDetails?: string;
  vehicleId?: string;
  createdDate?: Date | Timestamp | FieldValue | { seconds: number; nanoseconds?: number };
  lastRevisedDate?: Date | Timestamp | FieldValue | { seconds: number; nanoseconds?: number };
  validUntil?: Date | Timestamp | FieldValue | { seconds: number; nanoseconds?: number };
  shopperEmail?: string;
  vehicleDetails?: VehicleDetails;
}

export interface Vehicle {
  id: string;
  modelName: string;
  msrp: number;
  keySpecs: string;
  badges: string[];
  residualValue: number;
  estimatedPayment?: number;
}

export interface CreditTier {
  tier: string;
  label: string;
}

export interface FinancialRates {
  financeApr: number;
  moneyFactor: number;
}

export type VerificationStatus = 'Pending' | 'Verified' | 'Needs Attention';

export interface Scenario {
  zipCode: string;
  creditScoreTier: string;
  downPayment: number;
  tradeInValue: number;
  monthlyBudget: number;
  financeTerm: number;
  leaseTerm: number;
  annualMileage: number;
}

export interface SavedScenario {
  id: string;
  planType: 'finance' | 'lease';
  scenario: Scenario;
  vehicle: Vehicle;
  monthlyPayment: number;
  dueAtSigning: number;
  totalCost: number;
  termMonths: number;
  savedAt: string;
}

export interface DrawerState {
  open: boolean;
  type: 'finance' | 'lease' | null;
}

export interface UserProfile {
  id: string;
  role: 'dealer' | 'customer' | 'admin';
  email: string;
  firstName: string;
  lastName: string;
}

export interface MockBankTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  employerMatch?: boolean;
}

export interface MockBankAccount {
  id: string;
  mask: string;
  name: string;
  institution: string;
  currentBalance: number;
  availableBalance: number;
  lastUpdated: string;
  transactions: MockBankTransaction[];
}

export interface MockBankLinkInstitution {
  name: string;
  institutionId: string;
  logoUrl?: string;
}

export interface MockBankLinkResult {
  status: VerificationStatus;
  accounts: MockBankAccount[];
  heuristics: string[];
  flaggedDeposits: string[];
  institution?: MockBankLinkInstitution;
  lastSyncedAt?: string;
}

export interface MockPlaidLinkToken {
  token: string;
  expiration: string;
  institution: MockBankLinkInstitution;
  supportMessage?: string;
}

export interface MockPlaidExchangeMetadata {
  institutionId?: string | null;
  accountIds: string[];
}

export interface MockIrsTranscript {
  id: string;
  year: number;
  type: 'Wage & Income' | 'Return Transcript';
  employer: string;
  totalIncome: number;
  pdfUrl: string;
}

export interface MockCreditTradeline {
  bureau: 'Experian' | 'Equifax' | 'TransUnion';
  accountType: string;
  openedDate: string;
  balance: number;
  paymentStatus: 'Current' | 'Late' | 'Closed';
}

export interface MockCreditReport {
  applicantName: string;
  score: number;
  scoreBand: string;
  tradelines: MockCreditTradeline[];
  reportDate: string;
}

export interface MockInventoryVehicle {
  id: string;
  vehicleId: string;
  vin: string;
  color: string;
  msrp: number;
  packages: string[];
  available: boolean;
}

export interface IncomeVerificationRecord {
  method: 'bankLink' | 'irsTranscript' | 'manualUpload';
  status: VerificationStatus;
  lastUpdated: Date | Timestamp | { seconds: number; nanoseconds?: number };
  details?: string;
  referenceId?: string;
}

export type NegotiationReasonCode =
  | 'TERM_EXTENSION'
  | 'MILEAGE_ADJUSTMENT'
  | 'DOWN_PAYMENT_ADJUSTMENT'
  | 'CUSTOM';

export interface NegotiationCounterPayload {
  termMonths?: number;
  mileageAllowance?: number;
  downPayment?: number;
  estimatedPayment?: number;
}

export interface NegotiationMessage {
  id?: string;
  negotiationThreadId: string;
  authorId: string;
  authorRole: 'dealer' | 'customer';
  createdAt?: Date | Timestamp | { seconds: number; nanoseconds?: number };
  content: string;
  reasonCode?: NegotiationReasonCode;
  counterProposal?: NegotiationCounterPayload;
}

export interface NegotiationThread {
  id: string;
  financialOfferId: string;
  dealerId: string;
  customerId?: string;
  status: 'open' | 'accepted' | 'closed';
  createdAt?: Date | Timestamp | { seconds: number; nanoseconds?: number };
  updatedAt?: Date | Timestamp | { seconds: number; nanoseconds?: number };
  lastMessagePreview?: string;
}

export type MockDataProviderFailureMode = 'none' | 'timeout' | 'error' | 'needsAttention';

export interface MockDataProviderConfig {
  latencyMs: number;
  failureModes: {
    plaidLinkToken: MockDataProviderFailureMode;
    bankLink: MockDataProviderFailureMode;
    plaidExchange: MockDataProviderFailureMode;
    irsTranscript: MockDataProviderFailureMode;
    creditReport: MockDataProviderFailureMode;
    inventory: MockDataProviderFailureMode;
  };
}
