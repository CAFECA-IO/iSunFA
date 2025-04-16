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
import { getCompanyById } from '@/lib/utils/repo/company.repo';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { TeamRole } from '@/interfaces/team';
import { TeamPermissionAction } from '@/interfaces/permissions';

export async function handlePostRequest(req: NextApiRequest, res: NextApiResponse) {
  const { fileType, filters, options } = req.body;
  const { companyId, sortOption } = req.query;
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

  const parsedSortOption = parseSortOption(DEFAULT_SORT_OPTIONS, sortOption as string);

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
  const trialBalanceData = transformTrialBalanceData(trialBalance.items);

  const data = trialBalanceData;

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
    if (!isLogin) {
      statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
      throw new Error(statusMessage);
    }

    const isAuth = await checkUserAuthorization(APIName.TRIAL_BALANCE_EXPORT, req, session);
    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
      throw new Error(statusMessage);
    }

    const { query, body } = checkRequestData(APIName.TRIAL_BALANCE_EXPORT, req, session);
    if (query === null || body === null) {
      statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
      throw new Error(statusMessage);
    }

    const { companyId } = req.query;
    if (!companyId || typeof companyId !== 'string') {
      statusMessage = STATUS_MESSAGE.INVALID_COMPANY_ID;
      throw new Error(statusMessage);
    }

    const { teams } = session;

    const company = await getCompanyById(+companyId);
    if (!company) {
      statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
      throw new Error(statusMessage);
    }

    const { teamId: companyTeamId } = company;
    if (!companyTeamId) {
      statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
      throw new Error(statusMessage);
    }

    const userTeam = teams?.find((team) => team.id === companyTeamId);
    if (!userTeam) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
      throw new Error(statusMessage);
    }

    const assertResult = convertTeamRoleCanDo({
      teamRole: userTeam?.role as TeamRole,
      canDo: TeamPermissionAction.VIEW_TRIAL_BALANCE,
    });

    if (!assertResult.can) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
      throw new Error(statusMessage);
    }

    res.setHeader('Content-Type', 'text/csv');
    if (!res.getHeader('Content-Type') || res.getHeader('Content-Type') !== 'text/csv') {
      statusMessage = STATUS_MESSAGE.INVALID_CONTENT_TYPE;
      throw new Error(statusMessage);
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
      statusMessage = STATUS_MESSAGE.INVALID_FILE_FORMAT;
      throw new Error(statusMessage);
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
