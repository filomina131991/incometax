import { TaxSlab } from "../types";

export function calculateTax(taxableIncome: number, slabs: TaxSlab[], rebateLimit: number, rebateAmount: number, isNewRegime: boolean = false): number {
  if (taxableIncome <= 0) return 0;

  let tax = 0;
  for (const slab of slabs) {
    if (taxableIncome > slab.min) {
      const upperLimit = slab.max === null ? taxableIncome : Math.min(taxableIncome, slab.max);
      const taxableAmountInSlab = upperLimit - slab.min;
      const slabTax = (taxableAmountInSlab * slab.rate) / 100;
      tax += slabTax;
    }
  }

  // Rebate u/s 87A
  if (taxableIncome <= rebateLimit) {
    tax = Math.max(0, tax - rebateAmount);
  } else if (isNewRegime && rebateLimit === 1200000) {
    // Marginal Relief for New Tax Regime (FY 2025-26)
    // Range: 12,00,001 to 12,75,000
    // Rule: Tax cannot exceed (Income - 12,00,000)
    const extraIncome = taxableIncome - 1200000;
    if (tax > extraIncome) {
      tax = extraIncome;
    }
  }

  return Math.round(tax);
}

export function calculateCess(tax: number): number {
  return Math.round(tax * 0.04);
}
