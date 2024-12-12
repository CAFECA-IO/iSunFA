import { STATUS_MESSAGE } from '@/constants/status_code';
import { convertToCSV } from '@/lib/utils/export_file';
import { NextApiRequest, NextApiResponse } from 'next';
import { checkRequestData, checkSessionUser, logUserAction } from '@/lib/utils/middleware';
import { getSession } from '@/lib/utils/session';
import { APIName } from '@/constants/api_connection';
import { loggerError } from '@/lib/utils/logger_back';
import { formatApiResponse } from '@/lib/utils/common';

// TODO: (20241212 - Shirley) 模擬資料
const MOCK_LEDGER = [
  {
    accountId: 1001,
    no: '1001', // Info: (20241212 - Shirley) account number
    voucherNumber: '1234567890',
    accountingTitle: '現金',
    voucherDate: 1717728000,
    particulars: 'particulars',
    debitAmount: 100000,
    creditAmount: 0,
    balance: 100000,
  },
  {
    accountId: 1002,
    no: '1002',
    voucherNumber: '2234567890',
    accountingTitle: '應收帳款',
    voucherDate: 1757728000,
    particulars: 'particulars',
    debitAmount: 0,
    creditAmount: 100000,
    balance: -100000,
  },
];

export async function handlePostRequest(req: NextApiRequest, res: NextApiResponse) {
  // TODO: (20241212 - Shirley) implement the param and query validation when dev the API
  // Deprecated: (20241214 - Shirley) remove the unused params
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { fileType, filters, options } = req.body;

  // TODO: (20241212 - Shirley) 從資料庫、account book 取得 ledger資料
  const data = MOCK_LEDGER;

  // TODO: (20241212 - Shirley) 處理欄位選擇
  const fields = options?.fields || [
    'accountId',
    'no',
    'voucherNumber',
    'accountingTitle',
    'voucherDate',
    'particulars',
    'debitAmount',
    'creditAmount',
    'balance',
  ];

  const FIELD_NAME_MAP = {
    accountId: '會計科目編號',
    no: '會計科目代號',
    voucherNumber: '傳票編號',
    accountingTitle: '會計科目',
    voucherDate: '傳票日期',
    particulars: '摘要',
    debitAmount: '借方金額',
    creditAmount: '貸方金額',
    balance: '餘額',
  };

  const csv = convertToCSV(fields, data, FIELD_NAME_MAP);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=ledger_${Date.now()}.csv`);
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
    const isLogin = await checkSessionUser(session, APIName.LEDGER_EXPORT, req);
    if (!isLogin) {
      statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
      throw new Error(statusMessage);
    }

    /* TODO: (20241212 - Shirley) 權限檢查
    const isAuth = await checkUserAuthorization(APIName.LEDGER_EXPORT, req, session);
    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
    }
    */

    const { query, body } = checkRequestData(APIName.LEDGER_EXPORT, req, session);
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
      errorType: `Handler Request Error for ${APIName.LEDGER_EXPORT} in middleware.ts`,
      errorMessage: err.message,
    });
    res.status(httpCode).json(result);
  } finally {
    await logUserAction(session, APIName.LEDGER_EXPORT, req, statusMessage);
  }
}
