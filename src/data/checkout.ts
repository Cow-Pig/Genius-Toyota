
import type { FinancialOffer } from '@/types';

// This is a mock financial offer that would typically be fetched from a database.
// It represents the offer that the user has selected and is proceeding to checkout with.
export const mockOffer: FinancialOffer = {
  id: 'offer-b7c5a1',
  dealerId: 'dealer-01HQSZ7J3G8S7X6R0J3E6Q2Z9W',
  vehicleModelName: 'Toyota Camry XSE',
  offerType: 'loan',
  msrp: 34500,
  termMonths: 60,
  apr: 3.99,
  monthlyPayment: 638,
  status: 'published',
  // In a real app, this would be a Firestore Timestamp
  lastRevisedDate: new Date('2024-07-22T14:30:00Z'), 
  vehicleDetails: {
      make: 'Toyota',
      model: 'Camry',
      year: 2024,
      trim: 'XSE V6',
      vin: '1234567890ABCDEFG',
      imageUrl: '/camry-xse.png' // Placeholder image path
  }
};
