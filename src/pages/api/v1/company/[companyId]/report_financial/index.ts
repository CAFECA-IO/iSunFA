import type { NextApiRequest, NextApiResponse } from 'next';
import { IResponseData } from '@/interfaces/response_data';
import {
  formatApiResponse,
  getTimestampOfFirstDateOfThisYear,
  getTimestampOfLastSecondOfDate,
  getTimestampOfSameDateOfLastYear,
  isParamNumeric,
  isParamString,
  timestampInSeconds,
  timestampToString,
} from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IAccountForSheetDisplay } from '@/interfaces/accounting_account';
import { getSession } from '@/lib/utils/session';
import { ReportSheetType, ReportSheetTypeDisplayMap, ReportStatusType, ReportType } from '@/constants/report';
import { isReportSheetType, convertStringToReportSheetType, isReportLanguagesKey, isReportStatusType } from '@/lib/utils/type_guard/report';
import FinancialReportGeneratorFactory from '@/lib/utils/financial_report/financial_report_generator_factory';
import { createReport, findManyReports, getReportIdByFromTo } from '@/lib/utils/repo/report.repo';
import { getCompanyById } from '@/lib/utils/repo/company.repo';
import { IBasicReportItem } from '@/interfaces/report_item';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { ReportLanguagesKey } from '@/interfaces/report_language';
import { IReportIncludeProject } from '@/interfaces/report';
import { formatIGeneratedReportItem, formatIPendingReportItem } from '@/lib/utils/formatter/report.formatter';

// Info: (20240710 - Murky) Down below are Post related functions
export function formatReportSheetTypeFromQuery(reportType: string | string[] | undefined) {
  let reportSheetType = ReportSheetType.BALANCE_SHEET;

  if (isParamString(reportType) && isReportSheetType(reportType)) {
    reportSheetType = convertStringToReportSheetType(reportType);
  }
  return reportSheetType;
}

export function getLastPeriodStartAndEndDate(reportSheetType: ReportSheetType, startDateInSecond: number, endDateInSecond: number) {
    const lastPeriodStartDateInSecond = reportSheetType === ReportSheetType.BALANCE_SHEET ? 0 : Math.max(getTimestampOfSameDateOfLastYear(startDateInSecond), 0);
    const lastPeriodEndDateInSecond = Math.max(getTimestampOfSameDateOfLastYear(endDateInSecond), 0);
    return { lastPeriodStartDateInSecond, lastPeriodEndDateInSecond };
}
export function formatStartAndEndDateFromQuery(
  reportSheetType: ReportSheetType,
  startDate: string | string[] | undefined,
  endDate: string | string[] | undefined
) {
  const today = new Date();
  const todayInTimestamp = today.getTime();

  // Info: (20240710 - Murky) 如果是Balance Sheet，default開始時間為0，否則為今年的第一天
  let startDateInSecond =
    reportSheetType === ReportSheetType.BALANCE_SHEET ? 0 : getTimestampOfFirstDateOfThisYear();
  let endDateInSecond = getTimestampOfLastSecondOfDate(todayInTimestamp);

  if (startDate && isParamNumeric(startDate)) {
    const startDateInSecondString = parseInt(startDate as string, 10);
    startDateInSecond = timestampInSeconds(startDateInSecondString);
  }

  if (endDate && isParamNumeric(endDate)) {
    const endDateInSecondString = parseInt(endDate as string, 10);
    endDateInSecond = timestampInSeconds(endDateInSecondString);
  }

  const { lastPeriodStartDateInSecond, lastPeriodEndDateInSecond } = getLastPeriodStartAndEndDate(reportSheetType, startDateInSecond, endDateInSecond);

  return {
    startDateInSecond,
    endDateInSecond,
    lastPeriodStartDateInSecond,
    lastPeriodEndDateInSecond,
  };
}

export function formatProjectIdFromQuery(projectId: string | string[] | undefined): number | null {
  let projectIdNumber = null;

  if (isParamNumeric(projectId)) {
    projectIdNumber = parseInt(projectId as string, 10);
  }
  return projectIdNumber;
}

export function formatStatusFromQuery(status: string | string[] | undefined): ReportStatusType {
  let statusString = ReportStatusType.GENERATED;

  if (isParamString(status) && isReportStatusType(status)) {
    statusString = status as ReportStatusType;
  }
  return statusString;
}

export function formatReportLanguageFromQuery(reportLanguage: string | string[] | undefined): ReportLanguagesKey {
  let reportLanguageString = ReportLanguagesKey.tw;

  if (isParamString(reportLanguage) && isReportLanguagesKey(reportLanguage)) {
    reportLanguageString = reportLanguage;
  }
  return reportLanguageString;
}

export function formatFinancialOrAnalysisFromQuery(
  financialOrAnalysis: string | string[] | undefined
): string {
  // Deprecate: (20240710 - Murky) this function is to separate financial and analysis temperately
  let financialOrAnalysisString = 'financial';

  if (isParamString(financialOrAnalysis)) {
    financialOrAnalysisString = financialOrAnalysis as string;
  }
  return financialOrAnalysisString;
}

export function formatPostRequestQuery(req: NextApiRequest) {
  const { projectId, reportType, reportLanguage, startDate, endDate, financialOrAnalysis } =
    req.query;

  const projectIdNumber = formatProjectIdFromQuery(projectId);

  const reportLanguageString = formatReportLanguageFromQuery(reportLanguage);

  const reportSheetType = formatReportSheetTypeFromQuery(reportType);

  const {
    startDateInSecond,
    endDateInSecond,
    lastPeriodStartDateInSecond,
    lastPeriodEndDateInSecond,
  } = formatStartAndEndDateFromQuery(reportSheetType, startDate, endDate);

  const financialOrAnalysisString = formatFinancialOrAnalysisFromQuery(financialOrAnalysis);

  return {
    projectIdNumber,
    reportLanguageString,
    reportSheetType,
    startDateInSecond,
    endDateInSecond,
    lastPeriodStartDateInSecond,
    lastPeriodEndDateInSecond,
    financialOrAnalysisString,
  };
}

export async function generateFinancialReport(
  companyId: number,
  startDateInSecond: number,
  endDateInSecond: number,
  reportSheetType: ReportSheetType
) {
  // Info: (20240710 - Murky) Financial Report Generator
  let sheetDisplay: IAccountForSheetDisplay[] = [];
  try {
    const financialReportGenerator = await FinancialReportGeneratorFactory.createGenerator(
      companyId,
      startDateInSecond,
      endDateInSecond,
      reportSheetType
    );

    sheetDisplay = await financialReportGenerator.generateFinancialReportArray();
  } catch (error) {
    // Deprecate: (20240710 - Murky) console.error
    // eslint-disable-next-line no-console
    console.error(error);
  }
  return sheetDisplay;
}

export async function generateReportName(
  companyId: number,
  reportSheetType: ReportSheetType,
  reportLanguage: string,
  endDateInSecond: number
) {
  const company = await getCompanyById(companyId);
  const reportSheetForDisplay = ReportSheetTypeDisplayMap[reportSheetType];
  const dateString = timestampToString(endDateInSecond).date.replace(/-/g, '');
  const reportName = `${company?.code}_${reportSheetForDisplay}_${reportLanguage}_${dateString}`;
  return reportName;
}

export async function generateReportIfNotExist(
  companyId: number,
  projectId: number | null,
  startDateInSecond: number,
  endDateInSecond: number,
  reportSheetType: ReportSheetType,
  reportLanguageString: ReportLanguagesKey
) {
  // Info: (20240710 - Murky) Check if the report is already generated
  let reportId = await getReportIdByFromTo(
    companyId,
    startDateInSecond,
    endDateInSecond,
    reportSheetType
  );
  if (!reportId) {
    const reportContentJSON = await generateFinancialReport(
      companyId,
      startDateInSecond,
      endDateInSecond,
      reportSheetType
    );
    const name = await generateReportName(
      companyId,
      reportSheetType,
      reportLanguageString,
      endDateInSecond
    );
    const reportCreated = await createReport(
      companyId,
      projectId,
      name,
      startDateInSecond,
      endDateInSecond,
      ReportType.FINANCIAL,
      reportSheetType,
      reportContentJSON,
      ReportStatusType.GENERATED
    );
    reportId = reportCreated?.id || -1;
  }
  return reportId;
}

export async function handlePostRequest(companyId: number, req: NextApiRequest) {
  const {
    projectIdNumber,
    reportLanguageString,
    reportSheetType,
    startDateInSecond,
    endDateInSecond,
    lastPeriodStartDateInSecond,
    lastPeriodEndDateInSecond,
    financialOrAnalysisString,
  } = formatPostRequestQuery(req);

  let thisPeriodReportId = -1;
  let lastPeriodReportId = -1;
  switch (financialOrAnalysisString) {
    case 'financial': {
      thisPeriodReportId = await generateReportIfNotExist(
        companyId,
        projectIdNumber,
        startDateInSecond,
        endDateInSecond,
        reportSheetType,
        reportLanguageString
      );
      lastPeriodReportId = await generateReportIfNotExist(
        companyId,
        projectIdNumber,
        lastPeriodStartDateInSecond,
        lastPeriodEndDateInSecond,
        reportSheetType,
        reportLanguageString
      );
      break;
    }
    case 'analysis': {
      // ToDo: (20240710 - Murky) Analysis Report Generator
      break;
    }
    default: {
      break;
    }
  }
  return { thisPeriodReportId, lastPeriodReportId };
}
// Info: (20240710 - Murky) Post related functions end here

export function formatTargetPageFromQuery(targetPage: string | string[] | undefined) {
  let targetPageNumber = DEFAULT_PAGE_NUMBER;

  if (isParamNumeric(targetPage)) {
    targetPageNumber = parseInt(targetPage as string, 10);
  }
  return targetPageNumber;
}

export function formatPageSizeFromQuery(pageSize: string | string[] | undefined) {
  let pageSizeNumber = DEFAULT_PAGE_LIMIT;

  if (isParamNumeric(pageSize)) {
    pageSizeNumber = parseInt(pageSize as string, 10);
  }
  return pageSizeNumber;
}

export function formatSortByFromQuery(sortBy: string | string[] | undefined) {
  let sortByString: 'createdAt' | 'name' | 'type' | 'reportType' | 'status' = 'createdAt';
  const allowSortBy = ['createdAt', 'name', 'type', 'reportType', 'status'];
  if (isParamString(sortBy) && allowSortBy.includes(sortBy as string)) {
    sortByString = sortBy as 'createdAt' | 'name' | 'type' | 'reportType' | 'status';
  }
  return sortByString;
}

export function formatSortOrderFromQuery(sortOrder: string | string[] | undefined) {
  let sortOrderString: 'desc' | 'asc' = 'desc';

  if (isParamString(sortOrder)) {
    sortOrderString = sortOrder === 'asc' ? 'asc' : 'desc';
  }
  return sortOrderString;
}

export function formatDateInSecondFromQuery(dateInSecond: string | string[] | undefined) {
  let dateInSecondNumber: number | undefined;

  if (isParamNumeric(dateInSecond)) {
    dateInSecondNumber = parseInt(dateInSecond as string, 10);
  }
  return dateInSecondNumber;
}

export function formatSearchQueryFromQuery(searchQuery: string | string[] | undefined) {
  let searchQueryString: string | undefined;

  if (isParamString(searchQuery)) {
    searchQueryString = searchQuery as string;
  }
  return searchQueryString;
}

export function formatGetRequestQuery(req: NextApiRequest) {
  const { status, targetPage, pageSize, sortBy, sortOrder, startDateInSecond, endDateInSecond, searchQuery } = req.query;

  const statusString = formatStatusFromQuery(status);
  const targetPageNumber = formatTargetPageFromQuery(targetPage);
  const pageSizeNumber = formatPageSizeFromQuery(pageSize);
  const sortByString = formatSortByFromQuery(sortBy);
  const sortOrderString = formatSortOrderFromQuery(sortOrder);
  const startDateInSecondFromQuery = formatDateInSecondFromQuery(startDateInSecond);
  const endDateInSecondFromQuery = formatDateInSecondFromQuery(endDateInSecond);
  const searchQueryString = formatSearchQueryFromQuery(searchQuery);
  return { statusString, targetPageNumber, pageSizeNumber, sortByString, sortOrderString, startDateInSecondFromQuery, endDateInSecondFromQuery, searchQueryString };
}

function serializeMapKey(key: { from: number; to: number; companyId: number; type: string; reportType: string }) {
  return JSON.stringify(key);
}

export function mappingReportByFromTo(pendingReports: IReportIncludeProject[], generatedReports: IReportIncludeProject[]): Map<string, IReportIncludeProject> {
  const reportMap = new Map<string, IReportIncludeProject>();
  pendingReports.forEach((report) => {
    reportMap.set(serializeMapKey({ from: report.from, to: report.to, companyId: report.companyId, type: report.type, reportType: report.reportType }), report);
  });
  generatedReports.forEach((report) => {
    reportMap.set(serializeMapKey({ from: report.from, to: report.to, companyId: report.companyId, type: report.type, reportType: report.reportType }), report);
  });
  return reportMap;
}

export function getReportHasPreviousReport(reportMap: Map<string, IReportIncludeProject>, reportsToBeFormat: IReportIncludeProject[]): Map<string, IReportIncludeProject> {
  const reportHasPreviousReport = new Map<string, IReportIncludeProject>();
  reportsToBeFormat.forEach((report) => {
    const reportType = report.reportType as ReportSheetType;
    const { lastPeriodStartDateInSecond, lastPeriodEndDateInSecond } = getLastPeriodStartAndEndDate(reportType, report.from, report.to);

    const hasPreviousReport = reportMap.has(serializeMapKey({ from: lastPeriodStartDateInSecond, to: lastPeriodEndDateInSecond, companyId: report.companyId, type: report.type, reportType: report.reportType }));

    if (hasPreviousReport) {
      reportHasPreviousReport.set(serializeMapKey({ from: report.from, to: report.to, companyId: report.companyId, type: report.type, reportType: report.reportType }), report);
    }
  });
  return reportHasPreviousReport;
}

export function generateIBasicReport(status: ReportStatusType, reports: Map<string, IReportIncludeProject>): IBasicReportItem[] {
  const basicReportItems: IBasicReportItem[] = [];
  reports.forEach((report) => {
    switch (status) {
      case ReportStatusType.PENDING: {
        basicReportItems.push(formatIPendingReportItem(report));
        break;
      }
      case ReportStatusType.GENERATED: {
        basicReportItems.push(formatIGeneratedReportItem(report));
        break;
      }
      default: {
        break;
      }
    }
  });
  return basicReportItems;
}

// Info: (20240710 - Murky) Down below are Get related functions
export async function handleGetRequest(companyId: number, req: NextApiRequest) {
  const {
    statusString,
    targetPageNumber,
    pageSizeNumber,
    sortByString,
    sortOrderString,
    startDateInSecondFromQuery,
    endDateInSecondFromQuery,
    searchQueryString } = formatGetRequestQuery(req);
  const pendingData = await findManyReports(companyId, ReportStatusType.PENDING, targetPageNumber, pageSizeNumber, sortByString, sortOrderString, startDateInSecondFromQuery, endDateInSecondFromQuery, searchQueryString);
  const generatedData = await findManyReports(companyId, ReportStatusType.GENERATED, targetPageNumber, pageSizeNumber, sortByString, sortOrderString, startDateInSecondFromQuery, endDateInSecondFromQuery, searchQueryString);
  const reportMap = mappingReportByFromTo(pendingData.data, generatedData.data);

  const reportsToBeFormat = statusString === ReportStatusType.PENDING ? pendingData.data : generatedData.data;

  const reportHasPreviousReport = getReportHasPreviousReport(reportMap, reportsToBeFormat);

  const basicReportItems = generateIBasicReport(statusString, reportHasPreviousReport);
  return {
    basicReportItems,
    targetPage: targetPageNumber,
    pageSize: pageSizeNumber,
    sortBy: sortByString,
    sortOrder: sortOrderString,
    startDateInSecond: startDateInSecondFromQuery,
    endDateInSecond: endDateInSecondFromQuery,
    searchQuery: searchQueryString,
  };
}

interface IGetRequestQuery {
  basicReportItems: IBasicReportItem[];
  targetPage: number;
  pageSize: number;
  sortBy: "status" | "createdAt" | "name" | "type" | "reportType";
  sortOrder: "desc" | "asc";
  startDateInSecond: number | undefined;
  endDateInSecond: number | undefined;
  searchQuery: string | undefined;
}

interface IPostRequestQuery {
  [key: string]: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData< IPostRequestQuery | IGetRequestQuery | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPostRequestQuery | IGetRequestQuery | null = null;
  try {
    const session = await getSession(req, res);
    const { companyId } = session;

    // ToDo: (20240703 - Murky) Need to check Auth
    switch (req.method) {
      case 'GET': {
        payload = await handleGetRequest(companyId, req);
        statusMessage = STATUS_MESSAGE.CREATED;
        break;
      }
      case 'POST': {
        const { thisPeriodReportId, lastPeriodReportId } = await handlePostRequest(companyId, req);
        payload = { thisPeriodReportId, lastPeriodReportId };
        statusMessage = STATUS_MESSAGE.CREATED;
        break;
      }
      default: {
        break;
      }
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
  }
  const { httpCode, result } = formatApiResponse<IPostRequestQuery | IGetRequestQuery | null>(statusMessage, payload);
  res.status(httpCode).json(result);
}
