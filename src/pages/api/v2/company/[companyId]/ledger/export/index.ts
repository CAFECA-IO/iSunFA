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
import { formatApiResponse, formatTimestampByTZ } from '@/lib/utils/common';
import {
  convertLedgerItemToCsvData,
  fetchLineItems,
  filterByAccountRange,
  filterByLabelType,
  sortAndCalculateBalances,
} from '@/lib/utils/ledger';
import { DEFAULT_TIMEZONE } from '@/constants/common';
import { ledgerAvailableFields, LedgerFieldsMap } from '@/constants/export_ledger';
import { findVouchersByVoucherIds } from '@/lib/utils/repo/voucher.repo';
import { LabelType } from '@/constants/ledger';
import { getCompanyById } from '@/lib/utils/repo/company.repo';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { TeamRole } from '@/interfaces/team';
import { TeamPermissionAction } from '@/interfaces/permissions';

const handlePostRequest = async (req: NextApiRequest, res: NextApiResponse) => {
  const { fileType, filters, options } = req.body;
  const { companyId } = req.query;
  const { startDate, endDate, labelType, startAccountNo, endAccountNo } = filters;

  if (!companyId) {
    throw new Error(STATUS_MESSAGE.INVALID_COMPANY_ID);
  }

  if ((!startDate && startDate !== 0) || (!endDate && endDate !== 0)) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  if (fileType !== 'csv') {
    throw new Error(STATUS_MESSAGE.INVALID_FILE_TYPE);
  }

  let lineItems = await fetchLineItems(+companyId, +startDate, +endDate);
  lineItems = filterByAccountRange(lineItems, startAccountNo, endAccountNo);
  lineItems = filterByLabelType(lineItems, labelType as LabelType);
  const processedLineItems = sortAndCalculateBalances(lineItems);

  const voucherIds = processedLineItems.map((ledger) => ledger.voucherId);
  const vouchers = await findVouchersByVoucherIds(voucherIds);
  const vouchersWithTz = vouchers.map((voucher) => ({
    ...voucher,
    date: formatTimestampByTZ(voucher.date, options?.timezone || DEFAULT_TIMEZONE, 'YYYY-MM-DD'),
  }));
  const vouchersMap = new Map(vouchersWithTz.map((voucher) => [voucher.id, voucher]));

  const ledgerCsvData = convertLedgerItemToCsvData(processedLineItems, vouchersMap);

  const data = ledgerCsvData;

  // Info: (20241212 - Shirley) 處理欄位選擇
  const fields = options?.fields || ledgerAvailableFields;

  const csv = convertToCSV(fields, data, LedgerFieldsMap);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=ledger_${Date.now()}.csv`);
  res.send(csv);
};

const methodHandlers: {
  [key: string]: (req: NextApiRequest, res: NextApiResponse) => Promise<void>;
} = {
  POST: handlePostRequest,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let statusMessage = STATUS_MESSAGE.BAD_REQUEST;

  const session = await getSession(req);
  try {
    const isLogin = await checkSessionUser(session, APIName.LEDGER_EXPORT, req);
    if (!isLogin) {
      statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
      throw new Error(statusMessage);
    }

    const isAuth = await checkUserAuthorization(APIName.LEDGER_EXPORT, req, session);
    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
      throw new Error(statusMessage);
    }

    const { query, body } = checkRequestData(APIName.LEDGER_EXPORT, req, session);
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

    // Info: (20250416 - Shirley) 添加團隊權限檢查邏輯
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
      canDo: TeamPermissionAction.VIEW_LEDGER,
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
      errorType: `Handler Request Error for ${APIName.LEDGER_EXPORT} in middleware.ts`,
      errorMessage: err.message,
    });
    res.status(httpCode).json(result);
  } finally {
    await logUserAction(session, APIName.LEDGER_EXPORT, req, statusMessage);
  }
}
