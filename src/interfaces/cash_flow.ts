import { isStringNumber } from '@/interfaces/common';

export interface ICashFlow {
  reportType: string;
  reportID: string;
  reportName: string;
  reportStartTime: number;
  reportEndTime: number;
  supplementalScheduleOfNonCashOperatingActivities: ISupplementalSchedule;
  otherSupplementaryItems: IOtherSupplementaryItems;
  operatingActivities: IOperatingActivities;
  investingActivities: IInvestingActivities;
  financingActivities: IFinancingActivities;
}

export interface ISupplementalSchedule {
  weightedAverageCost: string;
  details: {
    cryptocurrenciesPaidToCustomersForPerpetualContractProfits: IWeightedCost;
    cryptocurrenciesDepositedByCustomers: IBreakdownCost;
    cryptocurrenciesWithdrawnByCustomers: IBreakdownCost;
    cryptocurrenciesPaidToSuppliersForExpenses: IBreakdownCost;
    cryptocurrencyInflows: IBreakdownCost;
    cryptocurrencyOutflows: IBreakdownCost;
    purchaseOfCryptocurrenciesWithNonCashConsideration: IBreakdownCost;
    disposalOfCryptocurrenciesForNonCashConsideration: IBreakdownCost;
    cryptocurrenciesReceivedFromCustomersAsTransactionFees: IBreakdownCost;
  };
}

export interface IOtherSupplementaryItems {
  details: {
    relatedToNonCash: {
      cryptocurrenciesEndOfPeriod: IWeightedCost;
      cryptocurrenciesBeginningOfPeriod: IWeightedCost;
    };
    relatedToCash: {
      netIncreaseDecreaseInCashCashEquivalentsAndRestrictedCash: IWeightedCost;
      cryptocurrenciesBeginningOfPeriod: IWeightedCost;
      cryptocurrenciesEndOfPeriod: IWeightedCost;
    };
  };
}

export interface IOperatingActivities {
  weightedAverageCost: string;
  details: {
    cashDepositedByCustomers: IBreakdownCost;
    cashWithdrawnByCustomers: IBreakdownCost;
    purchaseOfCryptocurrencies: IWeightedCost;
    disposalOfCryptocurrencies: IWeightedCost;
    cashReceivedFromCustomersAsTransactionFee: IBreakdownCost;
    cashPaidToSuppliersForExpenses: IBreakdownCost;
  };
}

export interface IInvestingActivities {
  weightedAverageCost: string;
}

export interface IFinancingActivities {
  weightedAverageCost: string;
  details: {
    proceedsFromIssuanceOfCommonStock: IWeightedCost;
    longTermDebt: IWeightedCost;
    shortTermBorrowings: IWeightedCost;
    paymentsOfDividends: IWeightedCost;
    treasuryStock: IWeightedCost;
  };
}

export interface IWeightedCost {
  weightedAverageCost: string;
}

export interface IBreakdownCost {
  weightedAverageCost: string;
  breakdown: {
    [key: string]: {
      amount: string;
      weightedAverageCost: string;
    };
  };
}

// Info Murky (20240505): type guards
// Info Murky (20240505): type guards can input any type and return a boolean
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isIBreakdown(obj: any): boolean {
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
export function isIWeightedCost(obj: any): obj is IWeightedCost {
  return typeof obj === 'object' && obj !== null && isStringNumber(obj.weightedAverageCost);
}

// Info Murky (20240505): type guards can input any type and return a boolean
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isIBreakdownCost(obj: any): obj is IBreakdownCost {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    isStringNumber(obj.weightedAverageCost) &&
    isIBreakdown(obj.breakdown)
  );
}

// Info Murky (20240505): type guards can input any type and return a boolean
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isISupplementalSchedule(obj: any): obj is ISupplementalSchedule {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    isStringNumber(obj.weightedAverageCost) &&
    Object.keys(obj.details).every(
      (key) => isIBreakdownCost(obj.details[key]) || isIWeightedCost(obj.details[key])
    )
  );
}

// Info Murky (20240505): type guards can input any type and return a boolean
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isIOtherSupplementaryItems(obj: any): obj is IOtherSupplementaryItems {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    ['relatedToNonCash', 'relatedToCash'].every(
      // prettier-ignore
      (subKey) => typeof obj.details[subKey] === 'object' &&
        Object.keys(obj.details[subKey]).every((key) => isIWeightedCost(obj.details[subKey][key]))
    )
  );
}

// Info Murky (20240505): type guards can input any type and return a boolean
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isIOperatingActivities(obj: any): obj is IOperatingActivities {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    isStringNumber(obj.weightedAverageCost) &&
    Object.keys(obj.details).every(
      (key) => isIBreakdownCost(obj.details[key]) || isIWeightedCost(obj.details[key])
    )
  );
}

// Info Murky (20240505): type guards can input any type and return a boolean
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isIInvestingActivities(obj: any): obj is IInvestingActivities {
  return typeof obj === 'object' && obj !== null && isStringNumber(obj.weightedAverageCost);
}

// Info Murky (20240505): type guards can input any type and return a boolean
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isIFinancingActivities(obj: any): obj is IFinancingActivities {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    isStringNumber(obj.weightedAverageCost) &&
    Object.keys(obj.details).every((key) => isIWeightedCost(obj.details[key]))
  );
}

// Info Murky (20240505): type guards can input any type and return a boolean
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isICashFlow(obj: any): obj is ICashFlow {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.reportType === 'string' &&
    typeof obj.reportID === 'string' &&
    isStringNumber(obj.reportID) &&
    typeof obj.reportName === 'string' &&
    typeof obj.reportStartTime === 'number' &&
    typeof obj.reportEndTime === 'number' &&
    isISupplementalSchedule(obj.supplementalScheduleOfNonCashOperatingActivities) &&
    isIOtherSupplementaryItems(obj.otherSupplementaryItems) &&
    isIOperatingActivities(obj.operatingActivities) &&
    isIInvestingActivities(obj.investingActivities) &&
    isIFinancingActivities(obj.financingActivities)
  );
}
