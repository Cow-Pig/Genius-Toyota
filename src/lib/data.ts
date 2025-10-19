import type { Vehicle, CreditTier, FinancialRates } from '@/types';

export const creditTiers: CreditTier[] = [
  { tier: 'Excellent (720-850)', label: 'Excellent (720-850)' },
  { tier: 'Good (690-719)', label: 'Good (690-719)' },
  { tier: 'Fair (630-689)', label: 'Fair (630-689)' },
  { tier: 'Poor (<630)', label: 'Needs Improvement (<630)' },
];

export const financialRates: { [key: string]: FinancialRates } = {
    'Excellent (720-850)': { financeApr: 0.049, moneyFactor: 0.00204 },
    'Good (690-719)': { financeApr: 0.065, moneyFactor: 0.00270 },
    'Fair (630-689)': { financeApr: 0.098, moneyFactor: 0.00408 },
    'Poor (<630)': { financeApr: 0.145, moneyFactor: 0.00604 },
};

export function getRatesForTier(tier: string): FinancialRates {
    return financialRates[tier] || financialRates['Fair (630-689)'];
}


export const vehicleData: Vehicle[] = [
  {
    id: 'corolla',
    modelName: 'Corolla',
    msrp: 22050,
    keySpecs: 'Compact Sedan | FWD',
    badges: ['Safety Sense 3.0', 'Top Seller'],
    residualValue: 0.60,
  },
  {
    id: 'camry',
    modelName: 'Camry',
    msrp: 26420,
    keySpecs: 'Mid-size Sedan | FWD/AWD',
    badges: ['Safety Sense 2.5+', 'Spacious'],
    residualValue: 0.58,
  },
  {
    id: 'rav4-hybrid',
    modelName: 'RAV4 Hybrid',
    msrp: 31725,
    keySpecs: 'Compact SUV | Hybrid | AWD',
    badges: ['Hybrid', 'AWD', 'Versatile'],
    residualValue: 0.65,
  },
  {
    id: 'sienna',
    modelName: 'Sienna',
    msrp: 37185,
    keySpecs: 'Minivan | Hybrid | FWD/AWD',
    badges: ['Hybrid', 'Family Friendly', 'AWD'],
    residualValue: 0.62,
  },
  {
    id: 'tundra',
    modelName: 'Tundra',
    msrp: 41815,
    keySpecs: 'Full-size Truck | i-FORCE',
    badges: ['Towing', 'Powerful'],
    residualValue: 0.70,
  },
  {
    id: 'highlander',
    modelName: 'Highlander',
    msrp: 39120,
    keySpecs: 'Mid-size SUV | FWD/AWD | Up to 8 Passengers',
    badges: ['Family', 'AWD', '3rd Row'],
    residualValue: 0.64,
  },
  {
    id: 'tacoma',
    modelName: 'Tacoma',
    msrp: 31500,
    keySpecs: 'Mid-size Truck | Off-road capable',
    badges: ['Off-road', 'Capable', 'Best-seller'],
    residualValue: 0.72,
  },
];
