import { ReportSheetType, ReportStatusType, ReportType } from "@/constants/report";
import { STATUS_MESSAGE } from "@/constants/status_code";
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
