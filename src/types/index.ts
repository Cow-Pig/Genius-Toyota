
export type FinancialOffer = {
  id: string;
  dealerId: string;
  vehicleModelName: string;
  offerType: 'loan' | 'lease' | 'cash';
  msrp: number;
  termMonths: number;
  apr: number;
  monthlyPayment: number;
  status: 'draft' | 'published' | 'expired';
  lastRevisedDate: Date;
  vehicleDetails?: {
    make: string;
    model: string;
    year: number;
    trim: string;
    vin: string;
    imageUrl?: string;
  };
};
