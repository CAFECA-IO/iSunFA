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
import { createReport, findManyReports, getReportIdByFromTo } from '@/lib/utils/repo/report.repo';
import { formatIPaginatedReport } from '@/lib/utils/formatter/report.formatter';
import { getSession } from '@/lib/utils/session';
import { BalanceSheetOtherInfo, IPaginatedReport, IReportContent } from '@/interfaces/report';
import { getCompanyById } from '@/lib/utils/repo/account_book.repo';
import { ReportLanguagesKey } from '@/interfaces/report_language';
import {
  convertStringToReportSheetType,
  convertStringToReportType,
  isReportLanguagesKey,
  isReportSheetType,
} from '@/lib/utils/type_guard/report';
import ReportGeneratorFactory from '@/lib/utils/report/report_generator_factory';
import { SortOrder } from '@/constants/sort';
import { loggerError } from '@/lib/utils/logger_back';
import { DefaultValue } from '@/constants/default_value';

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
  let sortOrderString: SortOrder.DESC | SortOrder.ASC = SortOrder.DESC;

  if (isParamString(sortOrder)) {
    sortOrderString = sortOrder === SortOrder.ASC ? SortOrder.ASC : SortOrder.DESC;
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

  return {
    startDateInSecond,
    endDateInSecond,
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

export function formatReportTypeFromQuery(reportType: string): ReportType {
  const reportTypeString = convertStringToReportType(reportType);
  return reportTypeString;
}

export function formatPostRequestQuery(req: NextApiRequest) {
  const { projectId, type, reportLanguage, from, to, reportType } = req.body;

  const projectIdNumber = formatProjectIdFromQuery(projectId);

  const reportLanguageString = formatReportLanguageFromQuery(reportLanguage);

  const reportSheetType = formatReportSheetTypeFromQuery(type);

  const { startDateInSecond, endDateInSecond } = formatStartAndEndDateFromQuery(
    reportSheetType,
    from,
    to
  );

  const formattedReportType = formatReportTypeFromQuery(reportType);

  return {
    projectIdNumber,
    reportLanguageString,
    reportSheetType,
    startDateInSecond,
    endDateInSecond,
    formattedReportType,
  };
}

async function generateReport(
  companyId: number,
  startDateInSecond: number,
  endDateInSecond: number,
  reportSheetType: ReportSheetType
): Promise<IReportContent> {
  // Info: (20240710 - Murky) Report Generator
  let reportContent: IReportContent = {
    content: {
      content: [],
      otherInfo: {} as BalanceSheetOtherInfo,
    },
  };
  try {
    const financialReportGenerator = await ReportGeneratorFactory.createGenerator(
      companyId,
      startDateInSecond,
      endDateInSecond,
      reportSheetType
    );

    reportContent = await financialReportGenerator.generateReport();
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'generateReport failed',
      errorMessage: (error as Error).message,
    });
  }
  return reportContent;
}

async function generateReportName(
  companyId: number,
  reportSheetType: ReportSheetType,
  reportLanguage: string,
  endDateInSecond: number
) {
  const company = await getCompanyById(companyId);
  const reportSheetForDisplay = ReportSheetTypeDisplayMap[reportSheetType];
  const dateString = timestampToString(endDateInSecond).date.replace(/-/g, '');
  const reportName = `${company?.taxId}_${reportSheetForDisplay}_${reportLanguage}_${dateString}`;
  return reportName;
}

export async function generateReportIfNotExist(
  companyId: number,
  projectId: number | null,
  startDateInSecond: number,
  endDateInSecond: number,
  reportType: ReportType,
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
    const { content } = await generateReport(
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
      reportType,
      reportSheetType,
      content,
      ReportStatusType.GENERATED
    );
    reportId = reportCreated?.id || -1;
  }
  return reportId;
}

export async function handleGetRequest(
  req: NextApiRequest
): Promise<{ statusMessage: string; payload: IPaginatedReport | null }> {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPaginatedReport | null = null;

  const session = await getSession(req);
  const { userId, accountBookId: companyId } = session;
  if (!userId) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
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

export async function handlePostRequest(req: NextApiRequest) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: number | null = null;
  const session = await getSession(req);
  const { userId, accountBookId: companyId } = session;
  if (!userId) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
    return { statusMessage, payload };
  }

  const {
    projectIdNumber,
    reportLanguageString,
    reportSheetType,
    startDateInSecond,
    endDateInSecond,
    formattedReportType,
  } = formatPostRequestQuery(req);
  let thisPeriodReportId = -1;
  thisPeriodReportId = await generateReportIfNotExist(
    companyId,
    projectIdNumber,
    startDateInSecond,
    endDateInSecond,
    formattedReportType,
    reportSheetType,
    reportLanguageString
  );
  statusMessage = STATUS_MESSAGE.CREATED;
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
