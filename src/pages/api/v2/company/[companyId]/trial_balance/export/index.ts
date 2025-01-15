import { STATUS_MESSAGE } from '@/constants/status_code';
import { convertToCSV } from '@/lib/utils/export_file';
import { NextApiRequest, NextApiResponse } from 'next';
import {
  checkRequestData,
  checkSessionUser,
  checkUserAuthorization,
  logUserAction,
} from '@/lib/utils/middleware';
import { getSession } from '@/lib/utils/session';
import { APIName } from '@/constants/api_connection';
import { loggerError } from '@/lib/utils/logger_back';
import { formatApiResponse } from '@/lib/utils/common';
import { initTrialBalanceData } from '@/lib/utils/repo/trial_balance.repo';
import {
  processLineItems,
  convertToTrialBalanceItem,
  transformTrialBalanceData,
  convertToAPIFormat,
} from '@/lib/utils/trial_balance';
import {
  trialBalanceAvailableFields,
  TrialBalanceFieldsMap,
} from '@/constants/export_trial_balance';
import { getAllLineItemsInPrisma } from '@/lib/utils/repo/line_item.repo';
import { findManyAccountsInPrisma } from '@/lib/utils/repo/account.repo';
import { SortOrder } from '@/constants/sort';
import { ILineItemInTrialBalanceItem } from '@/interfaces/trial_balance';
import { DEFAULT_SORT_OPTIONS } from '@/constants/trial_balance';
import { parseSortOption } from '@/lib/utils/sort';

export async function handlePostRequest(req: NextApiRequest, res: NextApiResponse) {
  const { fileType, filters, sort, options } = req.body;
  // sortOption
  const { companyId } = req.query;
  const { startDate, endDate } = filters;

  if (!companyId) {
    throw new Error(STATUS_MESSAGE.INVALID_COMPANY_ID);
  }

  if ((!startDate && startDate !== 0) || (!endDate && endDate !== 0)) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  if (fileType !== 'csv') {
    throw new Error(STATUS_MESSAGE.INVALID_FILE_TYPE);
  }

  // const { periodBegin, periodEnd } = getCurrent401Period();

  const parsedSortOption = parseSortOption(DEFAULT_SORT_OPTIONS, sort);

  const lineItems = await getAllLineItemsInPrisma(+companyId, 0, +endDate);

  const accounts = await findManyAccountsInPrisma({
    companyId: +companyId,
    includeDefaultAccount: true,
    page: 1,
    limit: 9999999,
    sortBy: 'code',
    sortOrder: SortOrder.ASC,
    forUser: true,
  });

  const lineItemsWithDebitCredit: ILineItemInTrialBalanceItem[] = lineItems.map((item) => ({
    ...item,
    debitAmount: item.debit ? item.amount : 0,
    creditAmount: !item.debit ? item.amount : 0,
  }));

  const threeStagesOfLineItems = convertToTrialBalanceItem(
    lineItemsWithDebitCredit,
    +startDate,
    +endDate
  );

  const threeStagesOfTrialBalance = {
    beginning: processLineItems(threeStagesOfLineItems.beginning, accounts.data).arrWithCopySelf,
    midterm: processLineItems(threeStagesOfLineItems.midterm, accounts.data).arrWithCopySelf,
    ending: processLineItems(threeStagesOfLineItems.ending, accounts.data).arrWithCopySelf,
  };

  const trialBalance = convertToAPIFormat(threeStagesOfTrialBalance, parsedSortOption);

  // const trialBalance = await initTrialBalanceData(+companyId, +startDate, +endDate, sort);
  const trialBalanceData = transformTrialBalanceData(trialBalance.items);

  // TODO: (20241213 - Shirley) 刪掉 API wiki 裡的時區切換
  // TODO: (20241213 - Shirley) 將 sort 去重構成公版的樣子 (refer to FilterSection.tsx)
  const data = trialBalanceData;

  // TODO: (20241203 - Shirley) 處理欄位選擇
  const fields = options?.fields || trialBalanceAvailableFields;

  const csv = convertToCSV(fields, data, TrialBalanceFieldsMap);

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

  const session = await getSession(req);
  try {
    const isLogin = await checkSessionUser(session, APIName.TRIAL_BALANCE_EXPORT, req);
    // TODO: (20241213 - Shirley) after the dev is done, remove the following code
    // const isLogin = true;
    if (!isLogin) {
      statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
      throw new Error(statusMessage);
    }

    const isAuth = await checkUserAuthorization(APIName.TRIAL_BALANCE_EXPORT, req, session);
    // TODO: (20241213 - Shirley) after the dev is done, remove the following code
    // const isAuth = true;
    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
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
