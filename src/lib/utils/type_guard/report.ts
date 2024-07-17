import { ReportSheetType, ReportType } from '@/constants/report';
import { STATUS_MESSAGE } from '@/constants/status_code';

export function isReportType(data: string): data is ReportType {
  const isValid = Object.values(ReportType).includes(data as ReportType);
  return isValid;
}

export function isReportSheetType(data: string): data is ReportSheetType {
  const isValid = Object.values(ReportSheetType).includes(data as ReportSheetType);
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
