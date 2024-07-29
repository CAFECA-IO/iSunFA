import { ReportSheetType, ReportStatusType, ReportType } from "@/constants/report";
import { STATUS_MESSAGE } from "@/constants/status_code";
import { BalanceSheetOtherInfo, CashFlowStatementOtherInfo, IncomeStatementOtherInfo } from "@/interfaces/report";
import { ReportLanguagesKey } from "@/interfaces/report_language";

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
  return maybeObj.dso !== undefined &&
    typeof maybeObj.dso === 'object' &&
    typeof maybeObj.dso.curDso === 'number' &&
    typeof maybeObj.dso.preDso === 'number' &&
    maybeObj.inventoryTurnoverDays !== undefined &&
    typeof maybeObj.inventoryTurnoverDays === 'object' &&
    typeof maybeObj.inventoryTurnoverDays.curInventoryTurnoverDays === 'number' &&
    typeof maybeObj.inventoryTurnoverDays.preInventoryTurnoverDays === 'number';
}

export function isIncomeStatementOtherInfo(obj: unknown): obj is IncomeStatementOtherInfo {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const maybeObj = obj as Partial<IncomeStatementOtherInfo>;
  return maybeObj.revenueAndExpenseRatio !== undefined &&
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
    typeof maybeObj.revenueToRD.ratio.preRatio === 'number';
}

export function isCashFlowStatementOtherInfo(obj: unknown): obj is CashFlowStatementOtherInfo {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const maybeObj = obj as Partial<CashFlowStatementOtherInfo>;
  return maybeObj.operatingStabilized !== undefined &&
    typeof maybeObj.operatingStabilized === 'object' &&
    Object.values(maybeObj.operatingStabilized).every((val: unknown) => {
      if (typeof val !== 'object' || val === null) {
        return false;
      }

      const valForTest = val as Partial<{ cur: number; curMinus1: number; curMinus2: number; curMinus3: number; curMinus4: number }>;

      return typeof val === 'object' &&
        typeof valForTest.cur === 'number' &&
        typeof valForTest.curMinus1 === 'number' &&
        typeof valForTest.curMinus2 === 'number' &&
        typeof valForTest.curMinus3 === 'number' &&
        typeof valForTest.curMinus4 === 'number';
}) &&
    maybeObj.strategyInvest !== undefined &&
    typeof maybeObj.strategyInvest === 'object' &&
    maybeObj.strategyInvest.cur !== undefined &&
    typeof maybeObj.strategyInvest.cur === 'object' &&
    typeof maybeObj.strategyInvest.cur.PPEInvest === 'number' &&
    typeof maybeObj.strategyInvest.cur.strategyInvest === 'number' &&
    typeof maybeObj.strategyInvest.cur.otherInvest === 'number' &&
    maybeObj.strategyInvest.pre !== undefined &&
    typeof maybeObj.strategyInvest.pre === 'object' &&
    typeof maybeObj.strategyInvest.pre.PPEInvest === 'number' &&
    typeof maybeObj.strategyInvest.pre.strategyInvest === 'number' &&
    typeof maybeObj.strategyInvest.pre.otherInvest === 'number';
}
