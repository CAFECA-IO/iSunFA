import type { NextApiRequest, NextApiResponse } from 'next';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import {
  formatApiResponse,
  getTimestampOfFirstDateOfThisYear,
  getTimestampOfLastSecondOfDate,
  isParamNumeric,
  isParamString,
  timestampInSeconds,
  timestampToString,
} from '@/lib/utils/common';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import {
  ReportSheetType,
  ReportSheetTypeDisplayMap,
  ReportStatusType,
  ReportType,
} from '@/constants/report';
import {
  createFinancialReport,
  findManyReports,
  getReportIdByFromTo,
} from '@/lib/utils/repo/report.repo';
import { formatIPaginatedReport } from '@/lib/utils/formatter/report.formatter';
import { getSession } from '@/lib/utils/session';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { AuthFunctionsKeys } from '@/interfaces/auth';
import {
  BalanceSheetOtherInfo,
  CashFlowStatementOtherInfo,
  IncomeStatementOtherInfo,
  IPaginatedReport,
} from '@/interfaces/report';
import { getCompanyById } from '@/lib/utils/repo/company.repo';
import { IAccountReadyForFrontend } from '@/interfaces/accounting_account';
import { ReportLanguagesKey } from '@/interfaces/report_language';
import FinancialReportGeneratorFactory from '@/lib/utils/financial_report/financial_report_generator_factory';
import {
  convertStringToReportSheetType,
  isReportLanguagesKey,
  isReportSheetType,
} from '@/lib/utils/type_guard/report';

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

export function formatStatusFromQuery(status: string | string[] | undefined) {
  let statusString: ReportStatusType | undefined;

  if (
    isParamString(status) &&
    Object.values(ReportStatusType).includes(status as ReportStatusType)
  ) {
    statusString = status as ReportStatusType;
  }
  return statusString;
}

export function formatGetRequestQuery(req: NextApiRequest) {
  const {
    status,
    targetPage,
    pageSize,
    sortBy,
    sortOrder,
    startDateInSecond,
    endDateInSecond,
    searchQuery,
  } = req.query;

  const statusString = formatStatusFromQuery(status);
  const targetPageNumber = formatTargetPageFromQuery(targetPage);
  const pageSizeNumber = formatPageSizeFromQuery(pageSize);
  const sortByString = formatSortByFromQuery(sortBy);
  const sortOrderString = formatSortOrderFromQuery(sortOrder);
  const startDateInSecondFromQuery = formatDateInSecondFromQuery(startDateInSecond);
  const endDateInSecondFromQuery = formatDateInSecondFromQuery(endDateInSecond);
  const searchQueryString = formatSearchQueryFromQuery(searchQuery);
  return {
    statusString,
    targetPageNumber,
    pageSizeNumber,
    sortByString,
    sortOrderString,
    startDateInSecondFromQuery,
    endDateInSecondFromQuery,
    searchQueryString,
  };
}

export function formatReportSheetTypeFromQuery(reportType: unknown) {
  let reportSheetType = ReportSheetType.BALANCE_SHEET;

  if (typeof reportType === 'string' && isReportSheetType(reportType)) {
    reportSheetType = convertStringToReportSheetType(reportType);
  }
  return reportSheetType;
}

export function formatStartAndEndDateFromQuery(
  reportSheetType: ReportSheetType,
  startDate: unknown,
  endDate: unknown
) {
  const today = new Date();
  const todayInTimestamp = today.getTime();

  // Info: (20240710 - Murky) 如果是Balance Sheet，default開始時間為0，否則為今年的第一天
  let startDateInSecond =
    reportSheetType === ReportSheetType.BALANCE_SHEET ? 0 : getTimestampOfFirstDateOfThisYear();
  let endDateInSecond = getTimestampOfLastSecondOfDate(todayInTimestamp);

  if (startDate && typeof startDate === 'number') {
    startDateInSecond = timestampInSeconds(startDate);
  }

  if (endDate && typeof endDate === 'number') {
    endDateInSecond = timestampInSeconds(endDate);
  }

  // Deprecate: (20240729 - Murky) Move to financial report
  // const { lastPeriodStartDateInSecond, lastPeriodEndDateInSecond } = getLastPeriodStartAndEndDate(
  //   reportSheetType,
  //   startDateInSecond,
  //   endDateInSecond
  // );

  return {
    startDateInSecond,
    endDateInSecond,

    // Deprecate: (20240729 - Murky) Move to financial report
    // lastPeriodStartDateInSecond,
    // lastPeriodEndDateInSecond,
  };
}

export function formatProjectIdFromQuery(projectId: unknown): number | null {
  let projectIdNumber = null;

  if (typeof projectId === 'string' && isParamNumeric(projectId)) {
    projectIdNumber = parseInt(projectId as string, 10);
  }
  return projectIdNumber;
}

export function formatReportLanguageFromQuery(
  reportLanguage: string | string[] | undefined
): ReportLanguagesKey {
  let reportLanguageString = ReportLanguagesKey.tw;

  if (typeof reportLanguage === 'string' && isReportLanguagesKey(reportLanguage)) {
    reportLanguageString = reportLanguage;
  }
  return reportLanguageString;
}

export function formatFinancialOrAnalysisFromQuery(financialOrAnalysis: unknown): string {
  // Deprecate: (20240710 - Murky) this function is to separate financial and analysis temperately
  let financialOrAnalysisString = 'financial';

  if (typeof financialOrAnalysis === 'string') {
    financialOrAnalysisString = financialOrAnalysis as string;
  }
  return financialOrAnalysisString;
}

export function formatPostRequestQuery(req: NextApiRequest) {
  const { projectId, reportType, reportLanguage, startDate, endDate, financialOrAnalysis } =
    req.body;

  const projectIdNumber = formatProjectIdFromQuery(projectId);

  const reportLanguageString = formatReportLanguageFromQuery(reportLanguage);

  const reportSheetType = formatReportSheetTypeFromQuery(reportType);

  const {
    startDateInSecond,
    endDateInSecond,

    // Deprecate: (20240729 - Murky) Move to financial report
    // lastPeriodStartDateInSecond,
    // lastPeriodEndDateInSecond,
  } = formatStartAndEndDateFromQuery(reportSheetType, startDate, endDate);

  const financialOrAnalysisString = formatFinancialOrAnalysisFromQuery(financialOrAnalysis);

  return {
    projectIdNumber,
    reportLanguageString,
    reportSheetType,
    startDateInSecond,
    endDateInSecond,

    // Deprecate: (20240729 - Murky) Move to financial report
    // lastPeriodStartDateInSecond,
    // lastPeriodEndDateInSecond,
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
  let content: IAccountReadyForFrontend[] = [];
  let otherInfo:
    | BalanceSheetOtherInfo
    | IncomeStatementOtherInfo
    | CashFlowStatementOtherInfo
    | null = null;
  try {
    const financialReportGenerator = await FinancialReportGeneratorFactory.createGenerator(
      companyId,
      startDateInSecond,
      endDateInSecond,
      reportSheetType
    );

    const report = await financialReportGenerator.generateReport();
    content = report.content;
    otherInfo = report.otherInfo;
  } catch (error) {
    // Deprecate: (20240710 - Murky) console.error
    // eslint-disable-next-line no-console
    console.error(error);
  }
  return {
    content,
    otherInfo,
  };
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
  // Deprecate: (20240729 - Murky) Move to financial report
  // lastPeriodStartDateInSecond: number,
  // lastPeriodEndDateInSecond: number,
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
    const { content, otherInfo } = await generateFinancialReport(
      companyId,
      startDateInSecond,
      endDateInSecond,
      reportSheetType
    );

    const reportContentSavingToDB = {
      content,
      otherInfo,
    };

    const name = await generateReportName(
      companyId,
      reportSheetType,
      reportLanguageString,
      endDateInSecond
    );

    const reportCreated = await createFinancialReport(
      companyId,
      projectId,
      name,
      startDateInSecond,
      endDateInSecond,
      ReportType.FINANCIAL,
      reportSheetType,
      reportContentSavingToDB,
      ReportStatusType.GENERATED
    );
    reportId = reportCreated?.id || -1;
  }
  return reportId;
}

export async function handleGetRequest(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<{ statusMessage: string; payload: IPaginatedReport | null }> {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPaginatedReport | null = null;

  const session = await getSession(req, res);
  const { userId, companyId } = session;
  const isAuth = await checkAuthorization([AuthFunctionsKeys.admin], { userId, companyId });
  if (!isAuth) {
    statusMessage = STATUS_MESSAGE.FORBIDDEN;
    return { statusMessage, payload };
  }

  const {
    statusString,
    targetPageNumber,
    pageSizeNumber,
    sortByString,
    sortOrderString,
    startDateInSecondFromQuery,
    endDateInSecondFromQuery,
    searchQueryString,
  } = formatGetRequestQuery(req);

  const reportData = await findManyReports(
    companyId,
    statusString,
    targetPageNumber,
    pageSizeNumber,
    sortByString,
    sortOrderString,
    startDateInSecondFromQuery,
    endDateInSecondFromQuery,
    searchQueryString
  );
  payload = formatIPaginatedReport(reportData);
  statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
  return { statusMessage, payload };
}

export async function handlePostRequest(req: NextApiRequest, res: NextApiResponse) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: number | null = null;
  const session = await getSession(req, res);
  const { userId, companyId } = session;
  const isAuth = await checkAuthorization([AuthFunctionsKeys.admin], { userId, companyId });
  if (!isAuth) {
    statusMessage = STATUS_MESSAGE.FORBIDDEN;
    return { statusMessage, payload };
  }
  const {
    projectIdNumber,
    reportLanguageString,
    reportSheetType,
    startDateInSecond,
    endDateInSecond,
    // Deprecate: (20240729 - Murky) Move to financial report
    // lastPeriodStartDateInSecond,
    // lastPeriodEndDateInSecond,
    financialOrAnalysisString,
  } = formatPostRequestQuery(req);

  let thisPeriodReportId = -1;
  switch (financialOrAnalysisString) {
    case ReportType.FINANCIAL: {
      thisPeriodReportId = await generateReportIfNotExist(
        companyId,
        projectIdNumber,
        startDateInSecond,
        endDateInSecond,
        // Deprecate: (20240729 - Murky) Move to financial report
        // lastPeriodStartDateInSecond,
        // lastPeriodEndDateInSecond,
        reportSheetType,
        reportLanguageString
      );
      statusMessage = STATUS_MESSAGE.CREATED;
      break;
    }
    case ReportType.ANALYSIS: {
      // ToDo: (20240710 - Murky) Analysis Report Generator
      break;
    }
    default: {
      break;
    }
  }
  payload = thisPeriodReportId;
  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: IPaginatedReport | number | null }>;
} = {
  GET: handleGetRequest,
  POST: handlePostRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IPaginatedReport | number | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPaginatedReport | number | null = null;
  try {
    const handleRequest = methodHandlers[req.method || ''];
    if (handleRequest) {
      ({ statusMessage, payload } = await handleRequest(req, res));
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
  }
  const { httpCode, result } = formatApiResponse<IPaginatedReport | number | null>(
    statusMessage,
    payload
  );
  res.status(httpCode).json(result);
}
