export function calculateTaxAmount(amount: number, taxRate: number): number {
  let taxRateInDecimal = taxRate;

  if (taxRate >= 1) {
    taxRateInDecimal = taxRate / 100;
  }

  return amount * taxRateInDecimal;
}

export function calculateTotalAmountAfterTax(amount: number, taxRate: number): number {
  return amount + calculateTaxAmount(amount, taxRate);
}
