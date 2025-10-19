/**
 * Calculates the monthly loan payment.
 * @param principal The total loan amount.
 * @param annualRate The annual interest rate (e.g., 0.05 for 5%).
 * @param termMonths The loan term in months.
 * @returns The monthly payment amount.
 */
export function calculateLoanPayment(
  principal: number,
  annualRate: number,
  termMonths: number
): number {
  if (principal <= 0) return 0;
  if (termMonths <= 0) return principal;

  const monthlyRate = annualRate / 12;

  if (monthlyRate === 0) {
    return principal / termMonths;
  }

  const payment =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
    (Math.pow(1 + monthlyRate, termMonths) - 1);

  return payment;
}

/**
 * Calculates the monthly lease payment.
 * @param msrp The Manufacturer's Suggested Retail Price.
 * @param residualValuePercentage The residual value as a percentage of MSRP (e.g., 0.55 for 55%).
 * @param termMonths The lease term in months.
 * @param moneyFactor The money factor for the lease.
 * @returns The monthly lease payment before taxes.
 */
export function calculateLeasePayment(
  msrp: number,
  residualValuePercentage: number,
  termMonths: number,
  moneyFactor: number
): number {
    if (termMonths <= 0) return 0;

  const residualValue = msrp * residualValuePercentage;
  const capitalizedCost = msrp; // Simplified: assumes no cap cost reduction other than down payment, which is handled elsewhere.
  
  const depreciation = capitalizedCost - residualValue;
  const monthlyDepreciation = depreciation / termMonths;

  const rentCharge = (capitalizedCost + residualValue) * moneyFactor;

  const monthlyPayment = monthlyDepreciation + rentCharge;

  return monthlyPayment;
}
