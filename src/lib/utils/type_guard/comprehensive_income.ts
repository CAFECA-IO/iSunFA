import { IComprehensiveIncome, ICosts, IFeeDetail, IFinancialCosts, IIncome, IOperatingExpenses, IOtherGainLosses, ISimpleCost } from "@/interfaces/comprehensive_income";
import { isStringNumber } from "@/lib/utils/common";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isISimpleCost(obj: any): obj is ISimpleCost {
  return typeof obj === 'object' && obj !== null && isStringNumber(obj.weightedAverageCost);
}

// Info Murky (20240505): type guards can input any type and return a boolean
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isIBreakdown(obj: any): boolean {
  if (typeof obj !== 'object' || obj === null) return false;
  return Object.keys(obj).every(
    // prettier-ignore
    (key) => typeof obj[key] === 'object' &&
      obj[key] !== null &&
      isStringNumber(obj[key].amount) &&
      isStringNumber(obj[key].weightedAverageCost)
  );
}

// Info Murky (20240505): type guards can input any type and return a boolean
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isIFeeDetail(obj: any): obj is IFeeDetail {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    isStringNumber(obj.weightedAverageCost) &&
    isIBreakdown(obj.breakdown)
  );
}

// Info Murky (20240505): type guards can input any type and return a boolean
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isIOtherGainLosses(obj: any): obj is IOtherGainLosses {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    isStringNumber(obj.weightedAverageCost) &&
    isStringNumber(obj.details.investmentGains) &&
    isStringNumber(obj.details.forexGains) &&
    isIFeeDetail(obj.details.cryptocurrencyGains)
  );
}

// Info Murky (20240505): type guards can input any type and return a boolean
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isIFinancialCosts(obj: any): obj is IFinancialCosts {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    isStringNumber(obj.weightedAverageCost) &&
    isStringNumber(obj.details.interestExpense) &&
    isIFeeDetail(obj.details.cryptocurrencyForexLosses) &&
    isStringNumber(obj.details.fiatToCryptocurrencyConversionLosses) &&
    isStringNumber(obj.details.cryptocurrencyToFiatConversionLosses) &&
    isStringNumber(obj.details.fiatToFiatConversionLosses)
  );
}

// Info Murky (20240505): type guards can input any type and return a boolean
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isIOperatingExpenses(obj: any): obj is IOperatingExpenses {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    isStringNumber(obj.weightedAverageCost) &&
    isStringNumber(obj.details.salaries) &&
    isStringNumber(obj.details.rent) &&
    isStringNumber(obj.details.marketing) &&
    isIFeeDetail(obj.details.rebateExpenses)
  );
}

// Info Murky (20240505): type guards can input any type and return a boolean
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isICosts(obj: any): obj is ICosts {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    isStringNumber(obj.weightedAverageCost) &&
    isIFeeDetail(obj.details.technicalProviderFee) &&
    isISimpleCost(obj.details.marketDataProviderFee) &&
    isISimpleCost(obj.details.newCoinListingCost)
  );
}

// Info Murky (20240505): type guards can input any type and return a boolean
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isIIncome(obj: any): obj is IIncome {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    isStringNumber(obj.weightedAverageCost) &&
    isIFeeDetail(obj.details.depositFee) &&
    isIFeeDetail(obj.details.withdrawalFee) &&
    isIFeeDetail(obj.details.tradingFee) &&
    isIFeeDetail(obj.details.spreadFee) &&
    isIFeeDetail(obj.details.liquidationFee) &&
    isIFeeDetail(obj.details.guaranteedStopLossFee)
  );
}

// Info Murky (20240505): type guards can input any type and return a boolean
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isIComprehensiveIncome(obj: any): obj is IComprehensiveIncome {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.reportType === 'string' &&
    typeof obj.reportID === 'string' &&
    isStringNumber(obj.reportID) &&
    typeof obj.reportName === 'string' &&
    typeof obj.reportStartTime === 'number' &&
    typeof obj.reportEndTime === 'number' &&
    isStringNumber(obj.netProfit) &&
    isIIncome(obj.income) &&
    isICosts(obj.costs) &&
    isIOperatingExpenses(obj.operatingExpenses) &&
    isIFinancialCosts(obj.financialCosts) &&
    isIOtherGainLosses(obj.otherGainLosses)
  );
}
