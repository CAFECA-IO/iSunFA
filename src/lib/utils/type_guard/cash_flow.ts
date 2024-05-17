import {
  IBreakdownCost,
  ICashFlow,
  IFinancingActivities,
  IInvestingActivities,
  IOperatingActivities,
  IOtherSupplementaryItems,
  ISupplementalSchedule,
  IWeightedCost,
} from '@/interfaces/cash_flow';
import { isStringNumber } from '@/lib/utils/common';

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
function isIWeightedCost(obj: any): obj is IWeightedCost {
  return typeof obj === 'object' && obj !== null && isStringNumber(obj.weightedAverageCost);
}

// Info Murky (20240505): type guards can input any type and return a boolean
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isIBreakdownCost(obj: any): obj is IBreakdownCost {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    isStringNumber(obj.weightedAverageCost) &&
    isIBreakdown(obj.breakdown)
  );
}

// Info Murky (20240505): type guards can input any type and return a boolean
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isISupplementalSchedule(obj: any): obj is ISupplementalSchedule {
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
function isIOtherSupplementaryItems(obj: any): obj is IOtherSupplementaryItems {
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
function isIOperatingActivities(obj: any): obj is IOperatingActivities {
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
function isIFinancingActivities(obj: any): obj is IFinancingActivities {
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
