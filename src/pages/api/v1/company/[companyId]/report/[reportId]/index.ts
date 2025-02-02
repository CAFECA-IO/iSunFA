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
import {
  IReport,
  FinancialReport,
  BalanceSheetOtherInfo,
  IncomeStatementOtherInfo,
  CashFlowStatementOtherInfo,
} from '@/interfaces/report';
import { IAccountReadyForFrontend } from '@/interfaces/accounting_account';
import balanceSheetLiteMapping from '@/constants/account_sheet_mapping/v1/balance_sheet_lite_mapping.json';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { AuthFunctionsKeys } from '@/interfaces/auth';
import { Company } from '@prisma/client';
import {
  isBalanceSheetOtherInfo,
  isCashFlowStatementOtherInfo,
  isIncomeStatementOtherInfo,
} from '@/lib/utils/type_guard/report';
import cashFlowStatementLiteMapping from '@/constants/account_sheet_mapping/v1/cash_flow_statement_lite_mapping.json';
import incomeStatementLiteMapping from '@/constants/account_sheet_mapping/v1/income_statement_lite_mapping.json';

function formatGetRequestQueryParams(req: NextApiRequest) {
  const { reportId } = req.query;
  let reportIdNumber = null;
  if (isParamNumeric(reportId)) {
    reportIdNumber = parseInt(reportId as string, 10);
  }
  return {
    reportIdNumber,
  };
}

async function getPeriodReport(reportId: number) {
  const curPeriodReportFromDB = await findUniqueReportById(reportId);
  let curPeriodReport: IReport | null = null;
  let company: Company | null = null;
  if (curPeriodReportFromDB) {
    curPeriodReport = formatIReport(curPeriodReportFromDB);
    company = curPeriodReportFromDB.company;
  }

  return {
    curPeriodReport,
    company,
  };
}

function getMappingByReportType(reportType: ReportSheetType): {
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

function transformDetailsIntoGeneral(
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
      accountId: -1,
      code: accountCode,
      name: account.name,
      curPeriodAmount: 0,
      curPeriodAmountString: '0',
      curPeriodPercentage: 0,
      curPeriodPercentageString: '0',
      prePeriodAmount: 0,
      prePeriodAmountString: '0',
      prePeriodPercentage: 0,
      prePeriodPercentageString: '0',
      indent: account.indent,
      children: [],
    };
  });
  return general;
}

function addBalanceSheetInfo(report: IReport): BalanceSheetOtherInfo | null {
  let otherInfo = null;

  if (isBalanceSheetOtherInfo(report.otherInfo)) {
    otherInfo = report.otherInfo;
  }

  return otherInfo;
}

function addIncomeStatementInfo(report: IReport): IncomeStatementOtherInfo | null {
  let otherInfo = null;

  if (isIncomeStatementOtherInfo(report.otherInfo)) {
    otherInfo = report.otherInfo;
  }

  return otherInfo;
}

function addCashFlowStatementInfo(report: IReport): CashFlowStatementOtherInfo | null {
  let otherInfo = null;

  if (isCashFlowStatementOtherInfo(report.otherInfo)) {
    otherInfo = report.otherInfo;
  }

  return otherInfo;
}

function getAdditionalInfo(
  report: IReport
): BalanceSheetOtherInfo | IncomeStatementOtherInfo | CashFlowStatementOtherInfo | null {
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

function formatPayloadFromIReport(report: IReport, company: Company): FinancialReport {
  const { reportType } = report;
  const details = report.content;

  const general = transformDetailsIntoGeneral(reportType, details);
  const curFrom = report.from;
  const curTo = report.to;

  const preFrom = getTimestampOfSameDateOfLastYear(curFrom);
  const preTo = getTimestampOfSameDateOfLastYear(curTo);

  const otherInfo = getAdditionalInfo(report);

  return {
    company: {
      id: company.id,
      code: company.taxId,
      name: company.name,
    },
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
    otherInfo,
  };
}

async function handleGetRequest(
  req: NextApiRequest
): Promise<{ statusMessage: string; payload: FinancialReport | null | IReport }> {
  const { reportIdNumber } = formatGetRequestQueryParams(req);

  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload = null;
  const session = await getSession(req);
  const { userId, companyId } = session;

  const isAuth = await checkAuthorization([AuthFunctionsKeys.admin], { userId, companyId });
  if (isAuth) {
    if (reportIdNumber !== null) {
      const { curPeriodReport, company } = await getPeriodReport(reportIdNumber);
      if (curPeriodReport && company && curPeriodReport.reportType !== ReportSheetType.REPORT_401) {
        payload = formatPayloadFromIReport(curPeriodReport, company);
      } else {
        payload = curPeriodReport;
      }
    }
  }

  statusMessage = STATUS_MESSAGE.SUCCESS_GET;
  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: FinancialReport | null | IReport }>;
} = {
  GET: handleGetRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<FinancialReport | null | IReport>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: FinancialReport | null | IReport = null;
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
  const { httpCode, result } = formatApiResponse<FinancialReport | null | IReport>(
    statusMessage,
    payload
  );
  res.status(httpCode).json(result);
}
