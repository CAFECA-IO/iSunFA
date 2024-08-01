import type { NextApiRequest, NextApiResponse } from 'next';
import { IResponseData } from '@/interfaces/response_data';
import {
  formatApiResponse,
  getTimestampOfFirstDateOfThisYear,
  getTimestampOfLastSecondOfDate,
  isParamNumeric,
  timestampInSeconds,
  timestampToString,
} from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IAccountReadyForFrontend } from '@/interfaces/accounting_account';
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
import { BalanceSheetOtherInfo, CashFlowStatementOtherInfo, IncomeStatementOtherInfo } from '@/interfaces/report';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { AuthFunctionsKeyStr } from '@/constants/auth';

// Info: (20240710 - Murky) Down below are Post related functions

export function formatReportSheetTypeFromQuery(reportType: unknown) {
  let reportSheetType = ReportSheetType.BALANCE_SHEET;

  if (typeof reportType === 'string' && isReportSheetType(reportType)) {
    reportSheetType = convertStringToReportSheetType(reportType);
  }
  return reportSheetType;
}

// Deprecate: (20240729 - Murky) Move to financial report
// export function getLastPeriodStartAndEndDate(
//   reportSheetType: ReportSheetType,
//   startDateInSecond: number,
//   endDateInSecond: number
// ) {
//   const lastPeriodStartDateInSecond =
//     reportSheetType === ReportSheetType.BALANCE_SHEET
//       ? 0
//       : Math.max(getTimestampOfSameDateOfLastYear(startDateInSecond), 0);
//   const lastPeriodEndDateInSecond = Math.max(getTimestampOfSameDateOfLastYear(endDateInSecond), 0);
//   return { lastPeriodStartDateInSecond, lastPeriodEndDateInSecond };
// }

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

export function formatStatusFromQuery(status: unknown): ReportStatusType {
  let statusString = ReportStatusType.GENERATED;

  if (typeof status === 'string' && isReportStatusType(status)) {
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
  let otherInfo: BalanceSheetOtherInfo | IncomeStatementOtherInfo | CashFlowStatementOtherInfo | null = null;
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

// Deprecate: (20240729 - Murky) Move to financial report
// export function generateIAccountReadyForFrontendArray(
//   curPeriodContent: IAccountForSheetDisplay[],
//   prePeriodContent: IAccountForSheetDisplay[]
// ): IAccountReadyForFrontend[] {
//   const curPeriodAccountReadyForFrontendArray: IAccountReadyForFrontend[] = [];

//   if (
//     curPeriodContent &&
//     prePeriodContent &&
//     curPeriodContent.length > 0 &&
//     prePeriodContent.length > 0 &&
//     curPeriodContent.length === prePeriodContent.length
//   ) {
//     curPeriodContent.forEach((curPeriodAccount, index) => {
//       const lastPeriodAccount = prePeriodContent[index];
//       const curPeriodAmount = curPeriodAccount.amount || 0;
//       const prePeriodAmount = lastPeriodAccount.amount || 0;
//       const curPeriodAmountString = formatNumberSeparateByComma(curPeriodAmount);
//       const prePeriodAmountString = formatNumberSeparateByComma(prePeriodAmount);
//       const curPeriodPercentage = curPeriodAccount?.percentage
//         ? Math.round(curPeriodAccount.percentage * 100)
//         : 0;
//       const prePeriodPercentage = lastPeriodAccount?.percentage
//         ? Math.round(lastPeriodAccount.percentage * 100)
//         : 0;
//       const accountReadyForFrontend: IAccountReadyForFrontend = {
//         code: curPeriodAccount.code,
//         name: curPeriodAccount.name,
//         curPeriodAmount,
//         curPeriodPercentage,
//         curPeriodAmountString,
//         prePeriodAmount,
//         prePeriodPercentage,
//         prePeriodAmountString,
//         indent: curPeriodAccount.indent,
//       };
//       curPeriodAccountReadyForFrontendArray.push(accountReadyForFrontend);
//     });
//   }
//   if (
//     curPeriodContent &&
//     prePeriodContent &&
//     curPeriodContent.length > 0 &&
//     prePeriodContent.length > 0 &&
//     curPeriodContent.length === prePeriodContent.length
//   ) {
//     curPeriodContent.forEach((curPeriodAccount, index) => {
//       const lastPeriodAccount = prePeriodContent[index];
//       const curPeriodAmount = curPeriodAccount.amount || 0;
//       const prePeriodAmount = lastPeriodAccount.amount || 0;
//       const curPeriodAmountString = formatNumberSeparateByComma(curPeriodAmount);
//       const prePeriodAmountString = formatNumberSeparateByComma(prePeriodAmount);
//       const curPeriodPercentage = curPeriodAccount?.percentage
//         ? Math.round(curPeriodAccount.percentage * 100)
//         : 0;
//       const prePeriodPercentage = lastPeriodAccount?.percentage
//         ? Math.round(lastPeriodAccount.percentage * 100)
//         : 0;
//       const accountReadyForFrontend: IAccountReadyForFrontend = {
//         code: curPeriodAccount.code,
//         name: curPeriodAccount.name,
//         curPeriodAmount,
//         curPeriodPercentage,
//         curPeriodAmountString,
//         prePeriodAmount,
//         prePeriodPercentage,
//         prePeriodAmountString,
//         indent: curPeriodAccount.indent,
//       };
//       curPeriodAccountReadyForFrontendArray.push(accountReadyForFrontend);
//     });
//   }
//   return curPeriodAccountReadyForFrontendArray;
// }

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

export async function handlePostRequest(companyId: number, req: NextApiRequest) {
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
    case 'financial': {
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<number | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: number | null = null;

  try {
    const session = await getSession(req, res);
    const { userId, companyId } = session;
    // const companyId = 10000001;

    const isAuth = await checkAuthorization([AuthFunctionsKeyStr.admin], { userId, companyId });
    // const isAuth = true;
    if (isAuth) {
      switch (req.method) {
        case 'POST': {
          payload = await handlePostRequest(companyId, req);

          statusMessage = STATUS_MESSAGE.CREATED;
          break;
        }
        default: {
          break;
        }
      }
    }
  } catch (_error) {
    const error = _error as Error;
    // Deprecate: (20240710 - Murky) Debug
    // eslint-disable-next-line no-console
    console.log(error);
    statusMessage = error.message;
  }
  const { httpCode, result } = formatApiResponse<number | null>(statusMessage, payload);
  res.status(httpCode).json(result);
}
