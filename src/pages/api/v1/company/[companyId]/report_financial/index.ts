import type { NextApiRequest, NextApiResponse } from 'next';
import { IResponseData } from '@/interfaces/response_data';
import {
  formatApiResponse,
  getTimestampOfFirstDateOfThisYear,
  isParamNumeric,
  isParamString,
  timestampInSeconds,
} from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IAccountForSheetDisplay } from '@/interfaces/accounting_account';
import { getSession } from '@/lib/utils/session';
import { AccountSheetType } from '@/constants/account';
import {
  convertStringToAccountSheetType,
  isAccountSheetType,
} from '@/lib/utils/type_guard/account';
import FinancialReportGeneratorFactory from '@/lib/utils/financial_report/financial_report_generator_factory';

export function formatGetRequestQuery(req: NextApiRequest) {
  const { startDate, endDate, sheet } = req.query;

  const today = new Date();
  const todayInTimestamp = today.getTime();

  let startDateInSecond = getTimestampOfFirstDateOfThisYear();
  let endDateInSecond = timestampInSeconds(todayInTimestamp);
  let accountSheet = AccountSheetType.BALANCE_SHEET;

  if (startDate && isParamNumeric(startDate)) {
    const startDateInSecondString = parseInt(startDate as string, 10);
    startDateInSecond = timestampInSeconds(startDateInSecondString);
  }

  if (endDate && isParamNumeric(endDate)) {
    const endDateInSecondString = parseInt(endDate as string, 10);
    endDateInSecond = timestampInSeconds(endDateInSecondString);
  }

  if (isParamString(sheet) && isAccountSheetType(sheet)) {
    accountSheet = convertStringToAccountSheetType(sheet);
  }
  return { startDateInSecond, endDateInSecond, accountSheet };
}

export async function generateFinancialReport(
  companyId: number,
  startDateInSecond: number,
  endDateInSecond: number,
  accountSheet: AccountSheetType
) {
  // Info: (20240710 - Murky) Financial Report Generator
  let sheetDisplay: IAccountForSheetDisplay[] = [];
  try {
    const financialReportGenerator = await FinancialReportGeneratorFactory.createGenerator(
      companyId,
      startDateInSecond,
      endDateInSecond,
      accountSheet
    );

    sheetDisplay = await financialReportGenerator.generateFinancialReportArray();
  } catch (error) {
    // Deprecate: (20240710 - Murky) console.error
    // eslint-disable-next-line no-console
    console.error(error);
  }
  return sheetDisplay;
}

export async function handleGetRequest(
  companyId: number,
  req: NextApiRequest
): Promise<IAccountForSheetDisplay[]> {
  const { startDateInSecond, endDateInSecond, accountSheet } = formatGetRequestQuery(req);
  const sheetDisplay = await generateFinancialReport(
    companyId,
    startDateInSecond,
    endDateInSecond,
    accountSheet
  );
  return sheetDisplay;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAccountForSheetDisplay[]>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccountForSheetDisplay[] = [];
  try {
    const session = await getSession(req, res);
    const { companyId } = session;

    // ToDo: (20240703 - Murky) Need to check Auth
    switch (req.method) {
      case 'GET': {
        payload = await handleGetRequest(companyId, req);
        statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
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
  const { httpCode, result } = formatApiResponse<IAccountForSheetDisplay[]>(statusMessage, payload);
  res.status(httpCode).json(result);
}
