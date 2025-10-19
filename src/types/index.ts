
import type { Timestamp } from 'firebase/firestore';

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
  createdDate?: Date | Timestamp | { seconds: number; nanoseconds?: number };
  lastRevisedDate?: Date | Timestamp | { seconds: number; nanoseconds?: number };
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
  scenario: Scenario;
  vehicle: Vehicle;
  monthlyPayment: number;
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
