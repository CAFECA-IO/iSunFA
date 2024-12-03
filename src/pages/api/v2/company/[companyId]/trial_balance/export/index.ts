import { STATUS_MESSAGE } from '@/constants/status_code';
import { convertToCSV } from '@/lib/utils/export_file';
import { NextApiRequest, NextApiResponse } from 'next';
import { checkRequestData, checkSessionUser, logUserAction } from '@/lib/utils/middleware';
import { getSession } from '@/lib/utils/session';
import { APIName } from '@/constants/api_connection';
import { loggerError } from '@/lib/utils/logger_back';
import { formatApiResponse } from '@/lib/utils/common';

// TODO: (20241203 - Shirley) 模擬資料
const MOCK_TRIAL_BALANCE = [
  {
    accountingTitle: '現金',
    beginningCreditAmount: 0,
    beginningDebitAmount: 100000,
    midtermCreditAmount: 50000,
    midtermDebitAmount: 30000,
    endingCreditAmount: 0,
    endingDebitAmount: 80000,
  },
  {
    accountingTitle: '應付帳款',
    beginningCreditAmount: 50000,
    beginningDebitAmount: 0,
    midtermCreditAmount: 20000,
    midtermDebitAmount: 30000,
    endingCreditAmount: 40000,
    endingDebitAmount: 0,
  },
];

export async function handlePostRequest(req: NextApiRequest, res: NextApiResponse) {
  // TODO: (20241203 - Shirley) implement the param and query validation when dev the API
  // Deprecated: (20241214 - Shirley) remove the unused params
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { fileType, filters, sort, options } = req.body;

  // TODO: (20241203 - Shirley) 從資料庫獲取資產資料
  const data = MOCK_TRIAL_BALANCE;

  // TODO: (20241203 - Shirley) 處理欄位選擇
  const fields = options?.fields || [
    'accountingTitle',
    'beginningCreditAmount',
    'beginningDebitAmount',
    'midtermCreditAmount',
    'midtermDebitAmount',
    'endingCreditAmount',
    'endingDebitAmount',
  ];

  const FIELD_NAME_MAP = {
    accountingTitle: '會計科目',
    beginningCreditAmount: '期初借方餘額',
    beginningDebitAmount: '期初貸方餘額',
    midtermCreditAmount: '期中借方餘額',
    midtermDebitAmount: '期中貸方餘額',
    endingCreditAmount: '期末借方餘額',
    endingDebitAmount: '期末貸方餘額',
  };

  const csv = convertToCSV(fields, data, FIELD_NAME_MAP);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=trial_balance_${Date.now()}.csv`);
  res.send(csv);
}

const methodHandlers: {
  [key: string]: (req: NextApiRequest, res: NextApiResponse) => Promise<void>;
} = {
  POST: handlePostRequest,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let statusMessage = STATUS_MESSAGE.BAD_REQUEST;

  const session = await getSession(req, res);
  try {
    const isLogin = await checkSessionUser(session, APIName.TRIAL_BALANCE_EXPORT, req);
    if (!isLogin) {
      statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
      throw new Error(statusMessage);
    }

    const { query, body } = checkRequestData(APIName.TRIAL_BALANCE_EXPORT, req, session);
    if (query === null || body === null) {
      statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
      throw new Error(statusMessage);
    }

    res.setHeader('Content-Type', 'text/csv');
    if (!res.getHeader('Content-Type') || res.getHeader('Content-Type') !== 'text/csv') {
      throw new Error(STATUS_MESSAGE.INVALID_CONTENT_TYPE);
    }

    const handleRequest = methodHandlers[req.method || ''];
    if (handleRequest) {
      await handleRequest(req, res);
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
      throw new Error(statusMessage);
    }

    const responseBody = res.getHeader('Content-Disposition');
    if (!responseBody || typeof responseBody !== 'string' || !responseBody.endsWith('.csv"')) {
      throw new Error(STATUS_MESSAGE.INVALID_FILE_FORMAT);
    }
  } catch (error) {
    const err = error as Error;
    const { httpCode, result } = formatApiResponse<null>(
      statusMessage || STATUS_MESSAGE[err.message as keyof typeof STATUS_MESSAGE],
      null
    );
    loggerError({
      userId: session.userId,
      errorType: `Handler Request Error for ${APIName.TRIAL_BALANCE_EXPORT} in middleware.ts`,
      errorMessage: err.message,
    });
    res.status(httpCode).json(result);
  } finally {
    await logUserAction(session, APIName.TRIAL_BALANCE_EXPORT, req, statusMessage);
  }
}
