import type { NextApiRequest, NextApiResponse } from 'next';
import { IResponseData } from '@/interfaces/response_data';
import {
  formatApiResponse,
  formatNumberSeparateByComma,
  getTimestampOfFirstDateOfThisYear,
  getTimestampOfLastSecondOfDate,
  getTimestampOfSameDateOfLastYear,
  isParamNumeric,
  timestampInSeconds,
  timestampToString,
} from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IAccountForSheetDisplay, IAccountReadyForFrontend } from '@/interfaces/accounting_account';
import { getSession } from '@/lib/utils/session';
import {
  ReportSheetType,
  ReportSheetTypeDisplayMap,
  ReportStatusType,
  ReportType,
} from '@/constants/report';
import {
  isReportSheetType,
  convertStringToReportSheetType,
  isReportLanguagesKey,
  isReportStatusType,
} from '@/lib/utils/type_guard/report';
import FinancialReportGeneratorFactory from '@/lib/utils/financial_report/financial_report_generator_factory';
import { createFinancialReport, getReportIdByFromTo } from '@/lib/utils/repo/report.repo';
import { getCompanyById } from '@/lib/utils/repo/company.repo';

import { ReportLanguagesKey } from '@/interfaces/report_language';

// Info: (20240710 - Murky) Down below are Post related functions
//
export function formatReportSheetTypeFromQuery(reportType: unknown) {
  let reportSheetType = ReportSheetType.BALANCE_SHEET;

  if (typeof reportType === "string" && isReportSheetType(reportType)) {
    reportSheetType = convertStringToReportSheetType(reportType);
  }
  return reportSheetType;
}

export function getLastPeriodStartAndEndDate(
  reportSheetType: ReportSheetType,
  startDateInSecond: number,
  endDateInSecond: number
) {
  const lastPeriodStartDateInSecond =
    reportSheetType === ReportSheetType.BALANCE_SHEET
      ? 0
      : Math.max(getTimestampOfSameDateOfLastYear(startDateInSecond), 0);
  const lastPeriodEndDateInSecond = Math.max(getTimestampOfSameDateOfLastYear(endDateInSecond), 0);
  return { lastPeriodStartDateInSecond, lastPeriodEndDateInSecond };
export function getLastPeriodStartAndEndDate(
  reportSheetType: ReportSheetType,
  startDateInSecond: number,
  endDateInSecond: number
) {
  const lastPeriodStartDateInSecond =
    reportSheetType === ReportSheetType.BALANCE_SHEET
      ? 0
      : Math.max(getTimestampOfSameDateOfLastYear(startDateInSecond), 0);
  const lastPeriodEndDateInSecond = Math.max(getTimestampOfSameDateOfLastYear(endDateInSecond), 0);
  return { lastPeriodStartDateInSecond, lastPeriodEndDateInSecond };
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

  if (startDate && typeof startDate === 'string' && isParamNumeric(startDate)) {
    const startDateInSecondString = parseInt(startDate as string, 10);
    startDateInSecond = timestampInSeconds(startDateInSecondString);
  }

  if (endDate && typeof endDate === 'string' && isParamNumeric(endDate)) {
    const endDateInSecondString = parseInt(endDate as string, 10);
    endDateInSecond = timestampInSeconds(endDateInSecondString);
  }

  const { lastPeriodStartDateInSecond, lastPeriodEndDateInSecond } = getLastPeriodStartAndEndDate(
    reportSheetType,
    startDateInSecond,
    endDateInSecond
  );
  const { lastPeriodStartDateInSecond, lastPeriodEndDateInSecond } = getLastPeriodStartAndEndDate(
    reportSheetType,
    startDateInSecond,
    endDateInSecond
  );

  return {
    startDateInSecond,
    endDateInSecond,
    lastPeriodStartDateInSecond,
    lastPeriodEndDateInSecond,
  };
}

export function formatProjectIdFromQuery(projectId: unknown): number | null {
  let projectIdNumber = null;

  if (typeof projectId === "string" && isParamNumeric(projectId)) {
    projectIdNumber = parseInt(projectId as string, 10);
  }
  return projectIdNumber;
}

export function formatStatusFromQuery(status: unknown): ReportStatusType {
  let statusString = ReportStatusType.GENERATED;

  if (typeof status === "string" && isReportStatusType(status)) {
    statusString = status as ReportStatusType;
  }
  return statusString;
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

export function formatFinancialOrAnalysisFromQuery(
  financialOrAnalysis: unknown
): string {
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

export function generateIAccountReadyForFrontendArray(
  curPeriodContent: IAccountForSheetDisplay[],
  prePeriodContent: IAccountForSheetDisplay[]
): IAccountReadyForFrontend[] {
  const curPeriodAccountReadyForFrontendArray: IAccountReadyForFrontend[] = [];

  if (
    curPeriodContent &&
    prePeriodContent &&
    curPeriodContent.length > 0 &&
    prePeriodContent.length > 0 &&
    curPeriodContent.length === prePeriodContent.length
  ) {
    curPeriodContent.forEach((curPeriodAccount, index) => {
      const lastPeriodAccount = prePeriodContent[index];
      const curPeriodAmount = curPeriodAccount.amount || 0;
      const prePeriodAmount = lastPeriodAccount.amount || 0;
      const curPeriodAmountString = formatNumberSeparateByComma(curPeriodAmount);
      const prePeriodAmountString = formatNumberSeparateByComma(prePeriodAmount);
      const curPeriodPercentage = curPeriodAccount?.percentage
        ? Math.round(curPeriodAccount.percentage * 100)
        : 0;
      const prePeriodPercentage = lastPeriodAccount?.percentage
        ? Math.round(lastPeriodAccount.percentage * 100)
        : 0;
      const accountReadyForFrontend: IAccountReadyForFrontend = {
        code: curPeriodAccount.code,
        name: curPeriodAccount.name,
        curPeriodAmount,
        curPeriodPercentage,
        curPeriodAmountString,
        prePeriodAmount,
        prePeriodPercentage,
        prePeriodAmountString,
        indent: curPeriodAccount.indent,
      };
      curPeriodAccountReadyForFrontendArray.push(accountReadyForFrontend);
    });
  }
  if (
    curPeriodContent &&
    prePeriodContent &&
    curPeriodContent.length > 0 &&
    prePeriodContent.length > 0 &&
    curPeriodContent.length === prePeriodContent.length
  ) {
    curPeriodContent.forEach((curPeriodAccount, index) => {
      const lastPeriodAccount = prePeriodContent[index];
      const curPeriodAmount = curPeriodAccount.amount || 0;
      const prePeriodAmount = lastPeriodAccount.amount || 0;
      const curPeriodAmountString = formatNumberSeparateByComma(curPeriodAmount);
      const prePeriodAmountString = formatNumberSeparateByComma(prePeriodAmount);
      const curPeriodPercentage = curPeriodAccount?.percentage
        ? Math.round(curPeriodAccount.percentage * 100)
        : 0;
      const prePeriodPercentage = lastPeriodAccount?.percentage
        ? Math.round(lastPeriodAccount.percentage * 100)
        : 0;
      const accountReadyForFrontend: IAccountReadyForFrontend = {
        code: curPeriodAccount.code,
        name: curPeriodAccount.name,
        curPeriodAmount,
        curPeriodPercentage,
        curPeriodAmountString,
        prePeriodAmount,
        prePeriodPercentage,
        prePeriodAmountString,
        indent: curPeriodAccount.indent,
      };
      curPeriodAccountReadyForFrontendArray.push(accountReadyForFrontend);
    });
  }
  return curPeriodAccountReadyForFrontendArray;
}

export async function generateReportIfNotExist(
  companyId: number,
  projectId: number | null,
  startDateInSecond: number,
  endDateInSecond: number,
  lastPeriodStartDateInSecond: number,
  lastPeriodEndDateInSecond: number,
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
    const reportContentCurPeriodJSON = await generateFinancialReport(
      companyId,
      startDateInSecond,
      endDateInSecond,
      reportSheetType
    );

    const reportContentPastPeriodJson = await generateFinancialReport(
      companyId,
      lastPeriodStartDateInSecond,
      lastPeriodEndDateInSecond,
      reportSheetType
    );

    const reportContentSavingToDB = generateIAccountReadyForFrontendArray(
      reportContentCurPeriodJSON,
      reportContentPastPeriodJson
    );

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
  switch (financialOrAnalysisString) {
    case 'financial': {
      thisPeriodReportId = await generateReportIfNotExist(
        companyId,
        projectIdNumber,
        startDateInSecond,
        endDateInSecond,
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
  return thisPeriodReportId;
}
// Deprecated: (20240710 - Murky) Move to report generated and report pending
// Info: (20240710 - Murky) Post related functions end here

// export function formatTargetPageFromQuery(targetPage: string | string[] | undefined) {
//   let targetPageNumber = DEFAULT_PAGE_NUMBER;

//   if (isParamNumeric(targetPage)) {
//     targetPageNumber = parseInt(targetPage as string, 10);
//   }
//   return targetPageNumber;
// }

// export function formatPageSizeFromQuery(pageSize: string | string[] | undefined) {
//   let pageSizeNumber = DEFAULT_PAGE_LIMIT;

//   if (isParamNumeric(pageSize)) {
//     pageSizeNumber = parseInt(pageSize as string, 10);
//   }
//   return pageSizeNumber;
// }

// export function formatSortByFromQuery(sortBy: string | string[] | undefined) {
//   let sortByString: 'createdAt' | 'name' | 'type' | 'reportType' | 'status' = 'createdAt';
//   const allowSortBy = ['createdAt', 'name', 'type', 'reportType', 'status'];
//   if (isParamString(sortBy) && allowSortBy.includes(sortBy as string)) {
//     sortByString = sortBy as 'createdAt' | 'name' | 'type' | 'reportType' | 'status';
//   }
//   return sortByString;
// }

// export function formatSortOrderFromQuery(sortOrder: string | string[] | undefined) {
//   let sortOrderString: 'desc' | 'asc' = 'desc';

//   if (isParamString(sortOrder)) {
//     sortOrderString = sortOrder === 'asc' ? 'asc' : 'desc';
//   }
//   return sortOrderString;
// }

// export function formatDateInSecondFromQuery(dateInSecond: string | string[] | undefined) {
//   let dateInSecondNumber: number | undefined;

//   if (isParamNumeric(dateInSecond)) {
//     dateInSecondNumber = parseInt(dateInSecond as string, 10);
//   }
//   return dateInSecondNumber;
// }

// export function formatSearchQueryFromQuery(searchQuery: string | string[] | undefined) {
//   let searchQueryString: string | undefined;

//   if (isParamString(searchQuery)) {
//     searchQueryString = searchQuery as string;
//   }
//   return searchQueryString;
// }

// export function formatGetRequestQuery(req: NextApiRequest) {
//   const { status, targetPage, pageSize, sortBy, sortOrder, startDateInSecond, endDateInSecond, searchQuery } = req.query;

//   const statusString = formatStatusFromQuery(status);
//   const targetPageNumber = formatTargetPageFromQuery(targetPage);
//   const pageSizeNumber = formatPageSizeFromQuery(pageSize);
//   const sortByString = formatSortByFromQuery(sortBy);
//   const sortOrderString = formatSortOrderFromQuery(sortOrder);
//   const startDateInSecondFromQuery = formatDateInSecondFromQuery(startDateInSecond);
//   const endDateInSecondFromQuery = formatDateInSecondFromQuery(endDateInSecond);
//   const searchQueryString = formatSearchQueryFromQuery(searchQuery);
//   return { statusString, targetPageNumber, pageSizeNumber, sortByString, sortOrderString, startDateInSecondFromQuery, endDateInSecondFromQuery, searchQueryString };
// }

// function serializeMapKey(key: { from: number; to: number; companyId: number; type: string; reportType: string }) {
//   return JSON.stringify(key);
// }

// export function mappingReportByFromTo(pendingReports: IReportIncludeProject[], generatedReports: IReportIncludeProject[]): Map<string, IReportIncludeProject> {
//   const reportMap = new Map<string, IReportIncludeProject>();
//   pendingReports.forEach((report) => {
//     reportMap.set(serializeMapKey({ from: report.from, to: report.to, companyId: report.companyId, type: report.type, reportType: report.reportType }), report);
//   });
//   generatedReports.forEach((report) => {
//     reportMap.set(serializeMapKey({ from: report.from, to: report.to, companyId: report.companyId, type: report.type, reportType: report.reportType }), report);
//   });
//   return reportMap;
// }

// export function getReportHasPreviousReport(reportMap: Map<string, IReportIncludeProject>, reportsToBeFormat: IReportIncludeProject[]): Map<string, IReportIncludeProject> {
//   const reportHasPreviousReport = new Map<string, IReportIncludeProject>();
//   reportsToBeFormat.forEach((report) => {
//     const reportType = report.reportType as ReportSheetType;
//     const { lastPeriodStartDateInSecond, lastPeriodEndDateInSecond } = getLastPeriodStartAndEndDate(reportType, report.from, report.to);

//     const hasPreviousReport = reportMap.has(serializeMapKey({ from: lastPeriodStartDateInSecond, to: lastPeriodEndDateInSecond, companyId: report.companyId, type: report.type, reportType: report.reportType }));

//     if (hasPreviousReport) {
//       reportHasPreviousReport.set(serializeMapKey({ from: report.from, to: report.to, companyId: report.companyId, type: report.type, reportType: report.reportType }), report);
//     }
//   });
//   return reportHasPreviousReport;
// }

// export function generateIBasicReport(status: ReportStatusType, reports: Map<string, IReportIncludeProject>): IBasicReportItem[] {
//   const basicReportItems: IBasicReportItem[] = [];
//   reports.forEach((report) => {
//     switch (status) {
//       case ReportStatusType.PENDING: {
//         basicReportItems.push(formatIPendingReportItem(report));
//         break;
//       }
//       case ReportStatusType.GENERATED: {
//         basicReportItems.push(formatIGeneratedReportItem(report));
//         break;
//       }
//       default: {
//         break;
//       }
//     }
//   });
//   return basicReportItems;
// }

// // Info: (20240710 - Murky) Down below are Get related functions
// export async function handleGetRequest(companyId: number, req: NextApiRequest) {
//   const {
//     statusString,
//     targetPageNumber,
//     pageSizeNumber,
//     sortByString,
//     sortOrderString,
//     startDateInSecondFromQuery,
//     endDateInSecondFromQuery,
//     searchQueryString } = formatGetRequestQuery(req);
//   const pendingData = await findManyReports(companyId, ReportStatusType.PENDING, targetPageNumber, pageSizeNumber, sortByString, sortOrderString, startDateInSecondFromQuery, endDateInSecondFromQuery, searchQueryString);
//   const generatedData = await findManyReports(companyId, ReportStatusType.GENERATED, targetPageNumber, pageSizeNumber, sortByString, sortOrderString, startDateInSecondFromQuery, endDateInSecondFromQuery, searchQueryString);
//   const reportMap = mappingReportByFromTo(pendingData.data, generatedData.data);

//   const reportsToBeFormat = statusString === ReportStatusType.PENDING ? pendingData.data : generatedData.data;

//   const reportHasPreviousReport = getReportHasPreviousReport(reportMap, reportsToBeFormat);

//   const basicReportItems = generateIBasicReport(statusString, reportHasPreviousReport);
//   return {
//     basicReportItems,
//     targetPage: targetPageNumber,
//     pageSize: pageSizeNumber,
//     sortBy: sortByString,
//     sortOrder: sortOrderString,
//     startDateInSecond: startDateInSecondFromQuery,
//     endDateInSecond: endDateInSecondFromQuery,
//     searchQuery: searchQueryString,
//   };
// }

// interface IGetRequestQuery {
//   basicReportItems: IBasicReportItem[];
//   targetPage: number;
//   pageSize: number;
//   sortBy: "status" | "createdAt" | "name" | "type" | "reportType";
//   sortOrder: "desc" | "asc";
//   startDateInSecond: number | undefined;
//   endDateInSecond: number | undefined;
//   searchQuery: string | undefined;
// }

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<number | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: number | null = null;
  try {
    const session = await getSession(req, res);
    const { companyId } = session;

    // ToDo: (20240703 - Murky) Need to check Auth
    switch (req.method) {
      // Deprecated: (20240710 - Murky) Move to report generated and report pending
      // case 'GET': {
      //   payload = await handleGetRequest(companyId, req);
      //   statusMessage = STATUS_MESSAGE.CREATED;
      //   break;
      // }
      case 'POST': {
        payload = await handlePostRequest(companyId, req);

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
  const { httpCode, result } = formatApiResponse<number | null>(statusMessage, payload);
  res.status(httpCode).json(result);
}
