import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { ILedgerPayload, ILedgerNote } from '@/interfaces/ledger';
import { APIName, HttpMethod } from '@/constants/api_connection';
import { formatPaginatedLedger } from '@/lib/utils/formatter/ledger.formatter';
import { getAccountingSettingByCompanyId } from '@/lib/utils/repo/accounting_setting.repo';
import { LabelType } from '@/constants/ledger';
import {
  calculateTotals,
  filterByAccountRange,
  fetchLineItems,
  filterByLabelType,
  sortAndCalculateBalances,
} from '@/lib/utils/ledger';
import { CurrencyType } from '@/constants/currency';
import { getCompanyById } from '@/lib/utils/repo/account_book.repo';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { TeamRole } from '@/interfaces/team';
import { TeamPermissionAction } from '@/interfaces/permissions';
import {
  checkSessionUser,
  checkUserAuthorization,
  checkRequestData,
  logUserAction,
} from '@/lib/utils/middleware';
import { getSession } from '@/lib/utils/session';
import { validateOutputData } from '@/lib/utils/validator';
import loggerBack from '@/lib/utils/logger_back';
import { HTTP_STATUS } from '@/constants/http';

/**
 * Info: (20250425 - Shirley) Handle GET request for ledger data
 * This function follows the flat coding style, with clear steps:
 * 1. Get session
 * 2. Check if user is logged in
 * 3. Check user authorization
 * 4. Validate request data
 * 5. Verify team permission
 * 6. Process ledger data
 * 7. Validate output data
 * 8. Log user action and return response
 */
async function handleGetRequest(req: NextApiRequest) {
  const apiName = APIName.LEDGER_LIST;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ILedgerPayload | null = null;

  // Info: (20250425 - Shirley) Get user session
  const session = await getSession(req);
  const { userId, teams } = session;

  // Info: (20250425 - Shirley) Check if user is logged in
  await checkSessionUser(session, apiName, req);

  // Info: (20250425 - Shirley) Check user authorization
  await checkUserAuthorization(apiName, req, session);

  // Info: (20250425 - Shirley) Validate request data
  const { query } = checkRequestData(apiName, req, session);
  if (!query || !query.accountBookId) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const {
    accountBookId,
    startDate,
    endDate,
    page,
    pageSize,
    labelType,
    startAccountNo,
    endAccountNo,
  } = query;

  loggerBack.info(
    `User ${userId} requesting ledger for companyId: ${accountBookId}, period: ${startDate} to ${endDate}`
  );

  // Info: (20250425 - Shirley) Check company and team permissions
  const company = await getCompanyById(accountBookId);
  if (!company) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }

  const { teamId: companyTeamId } = company;
  if (!companyTeamId) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }

  const userTeam = teams?.find((team) => team.id === companyTeamId);
  if (!userTeam) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }

  const assertResult = convertTeamRoleCanDo({
    teamRole: userTeam.role as TeamRole,
    canDo: TeamPermissionAction.VIEW_LEDGER,
  });

  if (!assertResult.can) {
    loggerBack.info(
      `User ${userId} does not have permission to view ledger for company ${accountBookId}`
    );
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }

  const pageNumber = page;

  try {
    /**
     * Info: (20241224 - Shirley)
     * - 取得分類帳資料的主要功能：
     *    1. 驗證分頁參數是否有效
     *    2. 獲取公司的會計幣別設定
     *    3. 根據指定的日期範圍獲取分錄明細
     *
     * - 資料處理流程：
     *    1. 篩選分錄（lineItem）根據開始日期和結束日期
     *    2. 篩選會計科目根據科目代號範圍（startAccountNo ~ endAccountNo）
     *    3. 根據標籤類型（labelType）進一步篩選會計科目：
     *       - GENERAL: 顯示不包含 '-' 的科目
     *       - DETAILED: 顯示包含 '-' 的科目
     *       - ALL: 顯示所有科目
     *    4. 按照科目代號和傳票日期排序分錄（lineItem），並計算每個科目的餘額變化
     *    5. 計算所有科目的借方和貸方總額
     *    6. 對處理後的分錄（lineItem）進行分頁處理
     */
    // TODO: (20241224 - Shirley) 寫測試
    if (pageNumber < 1) {
      loggerBack.warn(`Invalid page number ${pageNumber} for ledger request`);
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    }

    let currencyAlias = CurrencyType.TWD;
    const accountingSettingData = await getAccountingSettingByCompanyId(accountBookId);
    if (accountingSettingData?.currency) {
      currencyAlias = accountingSettingData.currency as CurrencyType;
    }

    let lineItems = await fetchLineItems(accountBookId, startDate, endDate);
    lineItems = filterByAccountRange(lineItems, startAccountNo, endAccountNo);
    lineItems = filterByLabelType(lineItems, labelType as LabelType);
    const processedLineItems = sortAndCalculateBalances(lineItems);
    const sumUpData = calculateTotals(processedLineItems);
    const note: ILedgerNote = {
      currencyAlias,
      total: sumUpData,
    };

    const paginatedLedger = formatPaginatedLedger(processedLineItems, pageNumber, pageSize);
    const noteString = JSON.stringify(note);

    payload = {
      data: paginatedLedger.data,
      page: paginatedLedger.page,
      totalPages: paginatedLedger.totalPages,
      totalCount: paginatedLedger.totalCount,
      pageSize: paginatedLedger.pageSize,
      hasNextPage: paginatedLedger.hasNextPage,
      hasPreviousPage: paginatedLedger.hasPreviousPage,
      sort: paginatedLedger.sort,
      note: noteString,
    } as ILedgerPayload;

    statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
    loggerBack.info(
      `Successfully retrieved ledger for company ${accountBookId}, found ${paginatedLedger.totalCount} items`
    );
  } catch (error) {
    const err = error as Error;
    loggerBack.error(`Failed to retrieve ledger for company ${accountBookId}`);
    loggerBack.error(error);
    statusMessage = err.message || STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  }

  // Info: (20250425 - Shirley) Validate output data
  const { isOutputDataValid } = validateOutputData(apiName, payload);
  if (!isOutputDataValid) {
    statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
    loggerBack.error(`Invalid output data format for ledger of company ${accountBookId}`);
  }

  // Info: (20250425 - Shirley) Format response and log user action
  const result = formatApiResponse(statusMessage, payload);
  await logUserAction(session, apiName, req, statusMessage);

  return { httpCode: result.httpCode, result: result.result };
}

/**
 * Info: (20250425 - Shirley) Export default handler function
 * This follows the flat coding style API pattern:
 * 1. Define a switch-case for different HTTP methods
 * 2. Call the appropriate handler based on method
 * 3. Handle errors and return consistent response format
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ILedgerPayload | null>>
) {
  let httpCode: number = HTTP_STATUS.BAD_REQUEST;
  let result: IResponseData<ILedgerPayload | null>;

  try {
    // Info: (20250425 - Shirley) Handle different HTTP methods
    const method = req.method || '';
    switch (method) {
      case HttpMethod.GET:
        ({ httpCode, result } = await handleGetRequest(req));
        break;
      default:
        // Info: (20250425 - Shirley) Method not allowed
        ({ httpCode, result } = formatApiResponse(STATUS_MESSAGE.METHOD_NOT_ALLOWED, null));
    }
  } catch (_error) {
    // Info: (20250425 - Shirley) Error handling
    const error = _error as Error;
    const statusMessage = error.message;
    loggerBack.error(`Error handling ledger operation: ${statusMessage}`);
    ({ httpCode, result } = formatApiResponse(statusMessage, null));
  }

  // Info: (20250425 - Shirley) Send response
  res.status(httpCode).json(result);
}
