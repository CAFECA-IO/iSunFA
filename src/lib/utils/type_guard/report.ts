import { ReportSheetType, ReportStatusType, ReportType } from '@/constants/report';
import { STATUS_MESSAGE } from '@/constants/status_code';
import {
  BalanceSheetOtherInfo,
  CashFlowStatementOtherInfo,
  IncomeStatementOtherInfo,
} from '@/interfaces/report';
import { ReportLanguagesKey } from '@/interfaces/report_language';

export function isReportType(data: string): data is ReportType {
  const isValid = Object.values(ReportType).includes(data as ReportType);
  return isValid;
}

export function isReportSheetType(data: string): data is ReportSheetType {
  const isValid = Object.values(ReportSheetType).includes(data as ReportSheetType);
  return isValid;
}

export function isReportLanguagesKey(data: string): data is ReportLanguagesKey {
  const isValid = Object.values(ReportLanguagesKey).includes(data as ReportLanguagesKey);
  return isValid;
}

export function isReportStatusType(data: string): data is ReportStatusType {
  const isValid = Object.values(ReportStatusType).includes(data as ReportStatusType);
  return isValid;
}

export function assertIsReportSheetType(data: string): asserts data is ReportSheetType {
  if (!isReportSheetType(data)) {
    throw new Error(STATUS_MESSAGE.INVALID_ENUM_VALUE);
  }
}

export function convertStringToReportType(data: string) {
  if (!isReportType(data)) {
    throw new Error(STATUS_MESSAGE.INVALID_ENUM_VALUE);
  }
  return data as ReportType;
}

export function convertStringToReportSheetType(data: string) {
  if (!isReportSheetType(data)) {
    throw new Error(STATUS_MESSAGE.INVALID_ENUM_VALUE);
  }
  return data as ReportSheetType;
}

export function isBalanceSheetOtherInfo(obj: unknown): obj is BalanceSheetOtherInfo {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const maybeObj = obj as Partial<BalanceSheetOtherInfo>;
  return (
    maybeObj.dso !== undefined &&
    typeof maybeObj.dso === 'object' &&
    typeof maybeObj.dso.curDso === 'number' &&
    typeof maybeObj.dso.preDso === 'number' &&
    maybeObj.inventoryTurnoverDays !== undefined &&
    typeof maybeObj.inventoryTurnoverDays === 'object' &&
    typeof maybeObj.inventoryTurnoverDays.curInventoryTurnoverDays === 'number' &&
    typeof maybeObj.inventoryTurnoverDays.preInventoryTurnoverDays === 'number'
  );
}

export function isIncomeStatementOtherInfo(obj: unknown): obj is IncomeStatementOtherInfo {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const maybeObj = obj as Partial<IncomeStatementOtherInfo>;
  return (
    maybeObj.revenueAndExpenseRatio !== undefined &&
    typeof maybeObj.revenueAndExpenseRatio === 'object' &&
    typeof maybeObj.revenueAndExpenseRatio.revenue === 'object' &&
    typeof maybeObj.revenueAndExpenseRatio.totalCost === 'object' &&
    typeof maybeObj.revenueAndExpenseRatio.salesExpense === 'object' &&
    typeof maybeObj.revenueAndExpenseRatio.administrativeExpense === 'object' &&
    maybeObj.revenueAndExpenseRatio.ratio !== undefined &&
    typeof maybeObj.revenueAndExpenseRatio.ratio === 'object' &&
    typeof maybeObj.revenueAndExpenseRatio.ratio.curRatio === 'number' &&
    typeof maybeObj.revenueAndExpenseRatio.ratio.preRatio === 'number' &&
    maybeObj.revenueToRD !== undefined &&
    typeof maybeObj.revenueToRD === 'object' &&
    typeof maybeObj.revenueToRD.revenue === 'object' &&
    typeof maybeObj.revenueToRD.researchAndDevelopmentExpense === 'object' &&
    maybeObj.revenueToRD.ratio !== undefined &&
    typeof maybeObj.revenueToRD.ratio === 'object' &&
    typeof maybeObj.revenueToRD.ratio.curRatio === 'number' &&
    typeof maybeObj.revenueToRD.ratio.preRatio === 'number'
  );
}

export function isCashFlowStatementOtherInfo(obj: unknown): obj is CashFlowStatementOtherInfo {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const maybeObj = obj as Partial<CashFlowStatementOtherInfo>;

  const isValidOperatingStabilized =
    maybeObj.operatingStabilized &&
    typeof maybeObj.operatingStabilized === 'object' &&
    Object.values(maybeObj.operatingStabilized).every(
      (val) => typeof val === 'object' && Object.values(val).every((num) => typeof num === 'number')
    );

  const isValidLineChartDataForRatio =
    maybeObj.lineChartDataForRatio &&
    typeof maybeObj.lineChartDataForRatio === 'object' &&
    Array.isArray(maybeObj.lineChartDataForRatio.data) &&
    maybeObj.lineChartDataForRatio.data.every((num) => typeof num === 'number') &&
    Array.isArray(maybeObj.lineChartDataForRatio.labels) &&
    maybeObj.lineChartDataForRatio.labels.every((label) => typeof label === 'string');

  const isValidStrategyInvest =
    maybeObj.strategyInvest &&
    typeof maybeObj.strategyInvest === 'object' &&
    Object.values(maybeObj.strategyInvest).every(
      (val) =>
        typeof val === 'object' &&
        Array.isArray(val.data) &&
        val.data.every((num) => typeof num === 'number') &&
        Array.isArray(val.labels) &&
        val.labels.every((label) => typeof label === 'string')
    );

  const isValidOurThoughts =
    maybeObj.ourThoughts &&
    Array.isArray(maybeObj.ourThoughts) &&
    maybeObj.ourThoughts.every((thought) => typeof thought === 'string');

  const isValidFreeCash =
    maybeObj.freeCash &&
    typeof maybeObj.freeCash === 'object' &&
    Object.values(maybeObj.freeCash).every(
      (val) =>
        typeof val === 'object' &&
        typeof val.operatingCashFlow === 'number' &&
        typeof val.ppe === 'number' &&
        typeof val.intangibleAsset === 'number' &&
        typeof val.freeCash === 'number'
    );

  const isValidThirdTitle = maybeObj.thirdTitle && typeof maybeObj.thirdTitle === 'string';
  const isValidFourthTitle = maybeObj.fourthTitle && typeof maybeObj.fourthTitle === 'string';
  const isValidFourPointOneTitle =
    maybeObj.fourPointOneTitle && typeof maybeObj.fourPointOneTitle === 'string';

  return (
    (isValidOperatingStabilized &&
      isValidLineChartDataForRatio &&
      isValidStrategyInvest &&
      isValidOurThoughts &&
      isValidFreeCash &&
      isValidThirdTitle &&
      isValidFourthTitle &&
      isValidFourPointOneTitle) ||
    false
  );
}
