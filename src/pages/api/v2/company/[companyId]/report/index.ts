import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
// import { AuthFunctionsKeys } from '@/interfaces/auth';
// import { checkAuthorization } from '@/lib/utils/auth_check';
import { formatApiResponse } from '@/lib/utils/common';
import { getSession } from '@/lib/utils/session';
import { NextApiRequest, NextApiResponse } from 'next';
import { validateRequest } from '@/lib/utils/request_validator';
import { APIName } from '@/constants/api_connection';

import { loggerError } from '@/lib/utils/logger_back';
import { FinancialReportTypesKey } from '@/interfaces/report_type';
import { IAccountReadyForFrontend } from '@/interfaces/accounting_account';

type ReportObject = {
  [code: string]: IAccountReadyForFrontend;
};

type ReportReturnType = {
  general: ReportObject;
  detail: ReportObject;
} | null;

type APIResponse = object | null;

export async function balanceSheetHandler({
  // ToDo: (20241007 - Murky) Use these param in function
  /* eslint-disable @typescript-eslint/no-unused-vars */
  startDate,
  endDate,
  language,
  /* eslint-enable @typescript-eslint/no-unused-vars */
}: {
  startDate: number;
  endDate: number;
  language: string;
}) {
  const statusMessage: string = STATUS_MESSAGE.SUCCESS_GET;

  // ToDo: (20241007 - Murky) negative number need to be in brackets
  // ToDo: (20241007 - Murky) Maybe IAccountReadyForFrontEnd need to have "string" version of percentage

  const general: ReportObject = {
    '11XX': {
      code: '11XX',
      name: '流動資產合計',
      curPeriodAmount: 2194032910,
      curPeriodAmountString: '2,194,032,910',
      curPeriodPercentage: 40,
      curPeriodPercentageString: '40',
      prePeriodAmount: 2052896744,
      prePeriodAmountString: '2,052,896,744',
      prePeriodPercentage: 41,
      prePeriodPercentageString: '41',
      indent: 3,
      children: {},
    },
  };

  const detail: ReportObject = {
    1100: {
      code: '1100',
      name: '現金及約當現金',
      curPeriodAmount: 20000,
      curPeriodAmountString: '20,000',
      curPeriodPercentage: 10,
      curPeriodPercentageString: '10',
      prePeriodAmount: 10000,
      prePeriodAmountString: '10,000',
      prePeriodPercentage: 5,
      prePeriodPercentageString: '5',
      indent: 3,
      children: {
        1101: {
          code: '1101',
          name: '庫存現金',
          curPeriodAmount: 10000,
          curPeriodAmountString: '10,000',
          curPeriodPercentage: 5,
          curPeriodPercentageString: '5',
          prePeriodAmount: 5000,
          prePeriodAmountString: '5,000',
          prePeriodPercentage: 2.5,
          prePeriodPercentageString: '2.5',
          indent: 4,
          children: {},
        },
        1102: {
          code: '1102',
          name: '零用金∕週轉金',
          curPeriodAmount: 10000,
          curPeriodAmountString: '10,000',
          curPeriodPercentage: 5,
          curPeriodPercentageString: '5',
          prePeriodAmount: 5000,
          prePeriodAmountString: '5,000',
          prePeriodPercentage: 2.5,
          prePeriodPercentageString: '2.5',
          indent: 4,
          children: {},
        },
      },
    },
  };

  const payload: ReportReturnType = {
    general,
    detail,
  };

  return {
    statusMessage,
    payload,
  };
}

export async function incomeStatementHandler({
  // ToDo: (20241007 - Murky) Use these param in function
  /* eslint-disable @typescript-eslint/no-unused-vars */
  startDate,
  endDate,
  language,
  /* eslint-enable @typescript-eslint/no-unused-vars */
}: {
  startDate: number;
  endDate: number;
  language: string;
}) {
  const statusMessage: string = STATUS_MESSAGE.SUCCESS_GET;

  // ToDo: (20241007 - Murky) negative number need to be in brackets
  // ToDo: (20241007 - Murky) Maybe IAccountReadyForFrontEnd need to have "string" version of percentage

  const general: ReportObject = {
    5950: {
      code: '5950',
      name: '營業毛利（毛損）淨額流動',
      curPeriodAmount: 2194032910,
      curPeriodAmountString: '2,194,032,910',
      curPeriodPercentage: 40,
      curPeriodPercentageString: '40',
      prePeriodAmount: 2052896744,
      prePeriodAmountString: '2,052,896,744',
      prePeriodPercentage: 41,
      prePeriodPercentageString: '41',
      indent: 3,
      children: {},
    },
  };

  const detail: ReportObject = {
    4110: {
      code: '4110',
      name: '銷貨收入',
      curPeriodAmount: 20000,
      curPeriodAmountString: '20,000',
      curPeriodPercentage: 10,
      curPeriodPercentageString: '10',
      prePeriodAmount: 10000,
      prePeriodAmountString: '10,000',
      prePeriodPercentage: 5,
      prePeriodPercentageString: '5',
      indent: 3,
      children: {
        4111: {
          code: '4111',
          name: '銷貨收入',
          curPeriodAmount: 10000,
          curPeriodAmountString: '10,000',
          curPeriodPercentage: 5,
          curPeriodPercentageString: '5',
          prePeriodAmount: 5000,
          prePeriodAmountString: '5,000',
          prePeriodPercentage: 2.5,
          prePeriodPercentageString: '2.5',
          indent: 4,
          children: {},
        },
        4112: {
          code: '4112',
          name: '天然氣銷貨收入（天然氣業）',
          curPeriodAmount: 10000,
          curPeriodAmountString: '10,000',
          curPeriodPercentage: 5,
          curPeriodPercentageString: '5',
          prePeriodAmount: 5000,
          prePeriodAmountString: '5,000',
          prePeriodPercentage: 2.5,
          prePeriodPercentageString: '2.5',
          indent: 4,
          children: {},
        },
      },
    },
  };

  const payload: ReportReturnType = {
    general,
    detail,
  };

  return {
    statusMessage,
    payload,
  };
}

export async function cashFlowHandler({
  // ToDo: (20241007 - Murky) Use these param in function
  /* eslint-disable @typescript-eslint/no-unused-vars */
  startDate,
  endDate,
  language,
  /* eslint-enable @typescript-eslint/no-unused-vars */
}: {
  startDate: number;
  endDate: number;
  language: string;
}) {
  const statusMessage: string = STATUS_MESSAGE.SUCCESS_GET;

  // ToDo: (20241007 - Murky) negative number need to be in brackets
  // ToDo: (20241007 - Murky) Maybe IAccountReadyForFrontEnd need to have "string" version of percentage

  const general: ReportObject = {
    A20010: {
      code: 'A200105950',
      name: '收益費損項目合計',
      curPeriodAmount: 2194032910,
      curPeriodAmountString: '2,194,032,910',
      curPeriodPercentage: 40,
      curPeriodPercentageString: '40',
      prePeriodAmount: 2052896744,
      prePeriodAmountString: '2,052,896,744',
      prePeriodPercentage: 41,
      prePeriodPercentageString: '41',
      indent: 3,
      children: {},
    },
  };

  const detail: ReportObject = {
    4110: {
      code: '4110',
      name: '銷貨收入',
      curPeriodAmount: 20000,
      curPeriodAmountString: '20,000',
      curPeriodPercentage: 10,
      curPeriodPercentageString: '10',
      prePeriodAmount: 10000,
      prePeriodAmountString: '10,000',
      prePeriodPercentage: 5,
      prePeriodPercentageString: '5',
      indent: 3,
      children: {},
    },
  };

  const payload: ReportReturnType = {
    general,
    detail,
  };

  return {
    statusMessage,
    payload,
  };
}

export async function report401Handler({
  // ToDo: (20241007 - Murky) Use these param in function
  /* eslint-disable @typescript-eslint/no-unused-vars */
  startDate,
  endDate,
  language,
  /* eslint-enable @typescript-eslint/no-unused-vars */
}: {
  startDate: number;
  endDate: number;
  language: string;
}) {
  const statusMessage: string = STATUS_MESSAGE.SUCCESS_UPDATE;
  const payload = null;
  return {
    statusMessage,
    payload,
  };
}

type ReportHandlers = {
  [K in FinancialReportTypesKey]: ({
    startDate,
    endDate,
    language,
  }: {
    startDate: number;
    endDate: number;
    language: string;
  }) => Promise<{ statusMessage: string; payload: ReportReturnType }>;
};

const reportHandlers: ReportHandlers = {
  [FinancialReportTypesKey.balance_sheet]: balanceSheetHandler,
  [FinancialReportTypesKey.comprehensive_income_statement]: incomeStatementHandler,
  [FinancialReportTypesKey.cash_flow_statement]: cashFlowHandler,
  [FinancialReportTypesKey.report_401]: report401Handler,
};

export async function handleGetRequest(req: NextApiRequest, res: NextApiResponse<APIResponse>) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: object | null = null;

  const session = await getSession(req, res);
  const { userId } = session;

  // ToDo: (20240924 - Murky) We need to check auth
  const { query } = validateRequest(APIName.REPORT_GET_V2, req, userId);

  if (query) {
    // ToDo: (20240924 - Murky) Remember to use sortBy, sortOrder, startDate, endDate, searchQuery, hasBeenUsed
    const { startDate, endDate, language, reportType } = query;
    const reportHandler = reportHandlers[reportType];

    ({ payload, statusMessage } = await reportHandler({
      startDate,
      endDate,
      language,
    }));
  }

  return {
    statusMessage,
    payload,
    userId,
  };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: APIResponse; userId: number }>;
} = {
  GET: handleGetRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<APIResponse>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: APIResponse = null;
  let userId = -1;
  try {
    const handleRequest = methodHandlers[req.method || ''];
    if (handleRequest) {
      ({ statusMessage, payload, userId } = await handleRequest(req, res));
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    const error = _error as Error;
    const logger = loggerError(userId, error.name, error.message);
    logger.error(error);
    statusMessage = error.message;
  }
  const { httpCode, result } = formatApiResponse<APIResponse>(statusMessage, payload);
  res.status(httpCode).json(result);
}
