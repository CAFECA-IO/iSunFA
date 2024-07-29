import type { NextApiRequest, NextApiResponse } from 'next';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { getSession } from '@/lib/utils/session';
import {
  formatApiResponse,
  getTimestampOfSameDateOfLastYear,
  isParamNumeric,
} from '@/lib/utils/common';
import { findUniqueReportById } from '@/lib/utils/repo/report.repo';
import { ReportSheetType } from '@/constants/report';
import { formatIReport } from '@/lib/utils/formatter/report.formatter';
import { IReport, FinancialReport, balanceSheetOtherInfo, incomeStatementOtherInfo, cashFlowStatementOtherInfo } from '@/interfaces/report';
import { IAccountReadyForFrontend } from '@/interfaces/accounting_account';
import balanceSheetLiteMapping from '@/constants/account_sheet_mapping/balance_sheet_lite_mapping.json';
import cashFlowStatementLiteMapping from '@/constants/account_sheet_mapping/cash_flow_statement_lite_mapping.json';
import incomeStatementLiteMapping from '@/constants/account_sheet_mapping/income_statement_lite_mapping.json';

export function formatGetRequestQueryParams(req: NextApiRequest) {
  const { reportId } = req.query;
  let reportIdNumber = null;
  if (isParamNumeric(reportId)) {
    reportIdNumber = parseInt(reportId as string, 10);
  }
  return {
    reportIdNumber,
  };
}

// Deprecated: (20240703 - Murky) These function is not used
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

// export async function getCurrentAndLastPeriodReport(reportId: number) {
//   const curPeriodReportFromDB = await findUniqueReportById(reportId);
//   let curPeriodReport: IReport | null = null;
//   let lastPeriodReport: IReport | null = null;

//   if (curPeriodReportFromDB) {
//     curPeriodReport = formatIReport(curPeriodReportFromDB);
//     const { companyId, from, to, reportType } = curPeriodReport;
//     const { lastPeriodStartDateInSecond, lastPeriodEndDateInSecond } = getLastPeriodStartAndEndDate(
//       reportType,
//       from,
//       to
//     );

//     const lastPeriodReportFromDB = await findFirstReportByFromTo(
//       companyId,
//       lastPeriodStartDateInSecond,
//       lastPeriodEndDateInSecond,
//       reportType
//     );
//     if (lastPeriodReportFromDB) {
//       lastPeriodReport = formatIReport(lastPeriodReportFromDB);
//     }
//   }
//   return { curPeriodReport, lastPeriodReport };
// }

// export function generateIAccountReadyForFrontendArray(
//   curPeriodReport: IReport | null,
//   prePeriodReport: IReport | null
// ): IAccountReadyForFrontend[] {
//   const curPeriodAccountReadyForFrontendArray: IAccountReadyForFrontend[] = [];

//   if (
//     curPeriodReport &&
//     prePeriodReport &&
//     curPeriodReport.reportType === prePeriodReport.reportType
//   ) {
//     const { content: curPeriodContent } = curPeriodReport;
//     const { content: prePeriodContent } = prePeriodReport;

//     if (
//       curPeriodContent &&
//       prePeriodContent &&
//       curPeriodContent.length > 0 &&
//       prePeriodContent.length > 0 &&
//       curPeriodContent.length === prePeriodContent.length
//     ) {
//       curPeriodContent.forEach((curPeriodAccount, index) => {
//         const lastPeriodAccount = prePeriodContent[index];
//         const curPeriodAmount = curPeriodAccount.amount || 0;
//         const prePeriodAmount = lastPeriodAccount.amount || 0;
//         const curPeriodAmountString = formatNumberSeparateByComma(curPeriodAmount);
//         const prePeriodAmountString = formatNumberSeparateByComma(prePeriodAmount);
//         const curPeriodPercentage = curPeriodAccount?.percentage
//           ? Math.round(curPeriodAccount.percentage * 100)
//           : 0;
//         const prePeriodPercentage = lastPeriodAccount?.percentage
//           ? Math.round(lastPeriodAccount.percentage * 100)
//           : 0;
//         const accountReadyForFrontend: IAccountReadyForFrontend = {
//           code: curPeriodAccount.code,
//           name: curPeriodAccount.name,
//           curPeriodAmount,
//           curPeriodPercentage,
//           curPeriodAmountString,
//           prePeriodAmount,
//           prePeriodPercentage,
//           prePeriodAmountString,
//           indent: curPeriodAccount.indent,
//         };
//         curPeriodAccountReadyForFrontendArray.push(accountReadyForFrontend);
//       });
//     }
//   }
//   return curPeriodAccountReadyForFrontendArray;
// }
export function getReportTypeFromReport(report: IReport | null) {
  let reportType = ReportSheetType.BALANCE_SHEET;
  if (report) {
    reportType = report.reportType;
  }
  return reportType;
}

export async function getPeriodReport(reportId: number) {
  const curPeriodReportFromDB = await findUniqueReportById(reportId);
  let curPeriodReport: IReport | null = null;

  if (curPeriodReportFromDB) {
    curPeriodReport = formatIReport(curPeriodReportFromDB);
  }
  return curPeriodReport;
}

export function getMappingByReportType(reportType: ReportSheetType): {
  code: string;
  name: string;
  indent: number;
}[] {
  let mapping = balanceSheetLiteMapping;
  switch (reportType) {
    case ReportSheetType.BALANCE_SHEET:
      mapping = balanceSheetLiteMapping;
      break;
    case ReportSheetType.CASH_FLOW_STATEMENT:
      mapping = cashFlowStatementLiteMapping;
      break;
    case ReportSheetType.INCOME_STATEMENT:
      mapping = incomeStatementLiteMapping;
      break;
    default:
      break;
  }
  return mapping;
}

export function transformDetailsIntoGeneral(
  reportType: ReportSheetType,
  accounts: IAccountReadyForFrontend[]
): IAccountReadyForFrontend[] {
  const mapping = getMappingByReportType(reportType);
  const accountMap = new Map<string, IAccountReadyForFrontend>();
  accounts.forEach((account) => {
    if (account.code.length > 0) {
      accountMap.set(account.code, account);
    }
  });

  const general: IAccountReadyForFrontend[] = mapping.map((account) => {
    const accountCode = account.code;
    const accountInfo = accountMap.get(accountCode);
    if (accountInfo) {
      return accountInfo;
    }
    return {
      code: accountCode,
      name: account.name,
      curPeriodAmount: 0,
      curPeriodAmountString: '0',
      curPeriodPercentage: 0,
      prePeriodAmount: 0,
      prePeriodAmountString: '0',
      prePeriodPercentage: 0,
      indent: account.indent,
    };
  });
  return general;
}

export async function formatPayloadFromIReport(report: IReport): Promise<FinancialReport> {
  const { reportType } = report;
  const details = report.content;
  const general = transformDetailsIntoGeneral(reportType, details);
  const curFrom = report.from;
  const curTo = report.to;

  const preFrom = getTimestampOfSameDateOfLastYear(curFrom);
  const preTo = getTimestampOfSameDateOfLastYear(curTo);
  return {
    reportType,
    preDate: {
      from: preFrom,
      to: preTo,
    },
    curDate: {
      from: curFrom,
      to: curTo,
    },
    details,
    general,
    otherInfo: null,
  };
}

export function addBalanceSheetInfo(report: IReport): balanceSheetOtherInfo {
  // eslint-disable-next-line no-console
  console.log(report.reportType);
  return {};
}

export function addIncomeStatementInfo(report: IReport): incomeStatementOtherInfo {
  // eslint-disable-next-line no-console
  console.log(report.reportType);
  return {};
}

export function addCashFlowStatementInfo(report: IReport): cashFlowStatementOtherInfo {
  // eslint-disable-next-line no-console
  console.log(report.reportType);
  return {};
}

export function getAdditionalInfo(report: IReport): balanceSheetOtherInfo | incomeStatementOtherInfo | cashFlowStatementOtherInfo | null {
  const { reportType } = report;

  let otherInfo = null;
  switch (reportType) {
    case ReportSheetType.BALANCE_SHEET:
      otherInfo = addBalanceSheetInfo(report);
      break;
    case ReportSheetType.CASH_FLOW_STATEMENT:
      otherInfo = addCashFlowStatementInfo(report);
      break;
    case ReportSheetType.INCOME_STATEMENT:
      otherInfo = addIncomeStatementInfo(report);
      break;
    default:
      break;
  }

  return otherInfo;
}

export async function handleGETRequest(companyId: number, req: NextApiRequest) {
  const { reportIdNumber } = formatGetRequestQueryParams(req);

  let payload = null;

  if (reportIdNumber !== null) {
    const curPeriodReport = await getPeriodReport(reportIdNumber);

    if (curPeriodReport) {
      payload = await formatPayloadFromIReport(curPeriodReport);
      payload.otherInfo = getAdditionalInfo(curPeriodReport);
    }
  }

  return payload;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<FinancialReport | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: FinancialReport | null = null;
  try {
    const session = await getSession(req, res);
    const { companyId } = session;

    // ToDo: (20240703 - Murky) Need to check Auth
    switch (req.method) {
      case 'GET': {
        payload = await handleGETRequest(companyId, req);

        statusMessage = STATUS_MESSAGE.SUCCESS;
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
  const { httpCode, result } = formatApiResponse<FinancialReport | null>(statusMessage, payload);
  res.status(httpCode).json(result);
}
