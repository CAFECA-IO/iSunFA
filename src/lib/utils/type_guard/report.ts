import { ReportSheetType, ReportStatusType, ReportType } from '@/constants/report';
import { STATUS_MESSAGE } from '@/constants/status_code';
import {
  BalanceSheetOtherInfo,
  CashFlowStatementOtherInfo,
  IncomeStatementOtherInfo,
  YearlyData,
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

  const isValidAssetLiabilityRatio =
    maybeObj.assetLiabilityRatio &&
    typeof maybeObj.assetLiabilityRatio === 'object' &&
    Object.values(maybeObj.assetLiabilityRatio).every(
      (dateInfo) =>
        Array.isArray(dateInfo.data) &&
        dateInfo.data.every((item) => typeof item === 'number') &&
        Array.isArray(dateInfo.labels) &&
        dateInfo.labels.every((label) => typeof label === 'string')
    );

  const isValidAssetMixRatio =
    maybeObj.assetMixRatio &&
    typeof maybeObj.assetMixRatio === 'object' &&
    Object.values(maybeObj.assetMixRatio).every(
      (dateInfo) =>
        Array.isArray(dateInfo.data) &&
        dateInfo.data.every((item) => typeof item === 'number') &&
        Array.isArray(dateInfo.labels) &&
        dateInfo.labels.every((label) => typeof label === 'string')
    );

  const isValidDso =
    maybeObj.dso !== undefined &&
    typeof maybeObj.dso === 'object' &&
    typeof maybeObj.dso.curDso === 'number' &&
    typeof maybeObj.dso.preDso === 'number';

  const isValidInventoryTurnoverDays =
    maybeObj.inventoryTurnoverDays !== undefined &&
    typeof maybeObj.inventoryTurnoverDays === 'object' &&
    typeof maybeObj.inventoryTurnoverDays.curInventoryTurnoverDays === 'number' &&
    typeof maybeObj.inventoryTurnoverDays.preInventoryTurnoverDays === 'number';

  return (
    (isValidAssetLiabilityRatio &&
      isValidAssetMixRatio &&
      isValidDso &&
      isValidInventoryTurnoverDays) ||
    false
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

  const isValidYearlyData = (data: unknown): data is YearlyData =>
    typeof data === 'object' &&
    data !== null &&
    Object.values(data).every((value) => typeof value === 'number');

  const isValidOperatingStabilized =
    maybeObj.operatingStabilized &&
    typeof maybeObj.operatingStabilized === 'object' &&
    isValidYearlyData(maybeObj.operatingStabilized.beforeIncomeTax) &&
    isValidYearlyData(maybeObj.operatingStabilized.amortizationDepreciation) &&
    isValidYearlyData(maybeObj.operatingStabilized.tax) &&
    isValidYearlyData(maybeObj.operatingStabilized.operatingIncomeCashFlow) &&
    isValidYearlyData(maybeObj.operatingStabilized.ratio);

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
      (yearInfo) =>
        typeof yearInfo === 'object' &&
        Array.isArray(yearInfo.data) &&
        yearInfo.data.every((num) => typeof num === 'number') &&
        Array.isArray(yearInfo.labels) &&
        yearInfo.labels.every((label) => typeof label === 'string')
    );

  const isValidOurThoughts =
    maybeObj.ourThoughts &&
    Array.isArray(maybeObj.ourThoughts) &&
    maybeObj.ourThoughts.every((thought) => typeof thought === 'string');

  const isValidFreeCash =
    maybeObj.freeCash &&
    typeof maybeObj.freeCash === 'object' &&
    Object.values(maybeObj.freeCash).every(
      (yearInfo) =>
        typeof yearInfo === 'object' &&
        typeof yearInfo.operatingCashFlow === 'number' &&
        typeof yearInfo.ppe === 'number' &&
        typeof yearInfo.intangibleAsset === 'number' &&
        typeof yearInfo.freeCash === 'number'
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
