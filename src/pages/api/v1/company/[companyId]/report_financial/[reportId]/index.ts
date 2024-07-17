import type { NextApiRequest, NextApiResponse } from 'next';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { getSession } from '@/lib/utils/session';
import {
  formatApiResponse,
  formatNumberSeparateByComma,
  getTimestampOfSameDateOfLastYear,
  isParamNumeric,
} from '@/lib/utils/common';
import { findFirstReportByFromTo, findUniqueReportById } from '@/lib/utils/repo/report.repo';
import { ReportSheetType } from '@/constants/report';
import { formatIReport } from '@/lib/utils/formatter/report.formatter';
import { IReport } from '@/interfaces/report';
import { IAccountReadyForFrontend } from '@/interfaces/accounting_account';

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

export async function getCurrentAndLastPeriodReport(reportId: number) {
  const curPeriodReportFromDB = await findUniqueReportById(reportId);
  let curPeriodReport: IReport | null = null;
  let lastPeriodReport: IReport | null = null;

  if (curPeriodReportFromDB) {
    curPeriodReport = formatIReport(curPeriodReportFromDB);
    const { companyId, from, to, reportType } = curPeriodReport;
    const { lastPeriodStartDateInSecond, lastPeriodEndDateInSecond } = getLastPeriodStartAndEndDate(
      reportType,
      from,
      to
    );

    const lastPeriodReportFromDB = await findFirstReportByFromTo(
      companyId,
      lastPeriodStartDateInSecond,
      lastPeriodEndDateInSecond,
      reportType
    );
    if (lastPeriodReportFromDB) {
      lastPeriodReport = formatIReport(lastPeriodReportFromDB);
    }
  }
  return { curPeriodReport, lastPeriodReport };
}

export function generateIAccountReadyForFrontendArray(
  curPeriodReport: IReport | null,
  prePeriodReport: IReport | null
): IAccountReadyForFrontend[] {
  const curPeriodAccountReadyForFrontendArray: IAccountReadyForFrontend[] = [];

  if (
    curPeriodReport &&
    prePeriodReport &&
    curPeriodReport.reportType === prePeriodReport.reportType
  ) {
    const { content: curPeriodContent } = curPeriodReport;
    const { content: prePeriodContent } = prePeriodReport;

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
  }
  return curPeriodAccountReadyForFrontendArray;
}

export function generateIAccountReadyForFrontendMap(
  accounts: IAccountReadyForFrontend[]
): Map<string, IAccountReadyForFrontend> {
  const accountMap = new Map<string, IAccountReadyForFrontend>();
  accounts.forEach((account) => {
    if (account.code.length > 0) {
      accountMap.set(account.code, account);
    }
  });
  return accountMap;
}

export async function handleGETRequest(companyId: number, req: NextApiRequest) {
  let resultReportArray: IAccountReadyForFrontend[] = [];

  const { reportIdNumber } = formatGetRequestQueryParams(req);

  if (reportIdNumber !== null) {
    const { curPeriodReport, lastPeriodReport } =
      await getCurrentAndLastPeriodReport(reportIdNumber);

    resultReportArray = generateIAccountReadyForFrontendArray(curPeriodReport, lastPeriodReport);
  }

  const resultReportMap = generateIAccountReadyForFrontendMap(resultReportArray);

  return {
    resultReportArray,
    resultReportMap,
  };
}

interface APIResponse {
  resultReportArray: IAccountReadyForFrontend[];
  resultReportMap: Map<string, IAccountReadyForFrontend>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<APIResponse>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  const payload: APIResponse = {
    resultReportArray: [],
    resultReportMap: new Map<string, IAccountReadyForFrontend>(),
  };
  try {
    const session = await getSession(req, res);
    const { companyId } = session;

    // ToDo: (20240703 - Murky) Need to check Auth
    switch (req.method) {
      case 'GET': {
        const { resultReportArray, resultReportMap } = await handleGETRequest(companyId, req);
        payload.resultReportArray = resultReportArray;
        payload.resultReportMap = resultReportMap;
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
  const { httpCode, result } = formatApiResponse<APIResponse>(statusMessage, payload);
  res.status(httpCode).json(result);
}
