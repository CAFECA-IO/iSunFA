import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { ILineItemInTrialBalanceItem, ITrialBalancePayload } from '@/interfaces/trial_balance';
import { APIName, HttpMethod } from '@/constants/api_connection';
import {
  convertToAPIFormat,
  convertToTrialBalanceItem,
  getCurrent401Period,
  processLineItems,
} from '@/lib/utils/trial_balance';
import { getAllLineItemsInPrisma } from '@/lib/utils/repo/line_item.repo';
import { CurrencyType } from '@/constants/currency';
import { getAccountingSettingByCompanyId } from '@/lib/utils/repo/accounting_setting.repo';
import { formatPaginatedTrialBalance } from '@/lib/utils/formatter/trial_balance.formatter';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { DEFAULT_SORT_OPTIONS } from '@/constants/trial_balance';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { parseSortOption } from '@/lib/utils/sort';
import { findManyAccountsInPrisma } from '@/lib/utils/repo/account.repo';
import { SortOrder } from '@/constants/sort';
import { getCompanyById } from '@/lib/utils/repo/company.repo';
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
import { assertUserCanByAccountBook } from '@/lib/utils/permission/assert_user_team_permission';

/**
 * Info: (20250424 - Shirley) Handle GET request for trial balance data
 * This function follows the flat coding style, with clear steps:
 * 1. Get session
 * 2. Check if user is logged in
 * 3. Check user authorization
 * 4. Validate request data
 * 5. Verify team permission
 * 6. Process trial balance data
 * 7. Validate output data
 * 8. Log user action and return response
 */
async function handleGetRequest(req: NextApiRequest) {
  const apiName = APIName.TRIAL_BALANCE_LIST;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ITrialBalancePayload | null = null;

  // Info: (20250424 - Shirley) Get user session
  const session = await getSession(req);
  const { userId } = session;

  // Info: (20250424 - Shirley) Check if user is logged in
  await checkSessionUser(session, apiName, req);

  // Info: (20250424 - Shirley) Check user authorization
  await checkUserAuthorization(apiName, req, session);

  // Info: (20250424 - Shirley) Validate request data
  const { query } = checkRequestData(apiName, req, session);
  if (!query || !query.accountBookId) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const { accountBookId } = query;

  loggerBack.info(`User ${userId} requesting trial balance for companyId: ${accountBookId}`);

  // Info: (20250424 - Shirley) Check company and team permissions
  const company = await getCompanyById(accountBookId);
  if (!company) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }

  const { teamId: accountBookTeamId } = company;
  if (!accountBookTeamId) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }

  const assertResult = await assertUserCanByAccountBook({
    userId,
    accountBookId,
    action: TeamPermissionAction.VIEW_TRIAL_BALANCE,
  });

  if (!assertResult.can) {
    loggerBack.info(
      `User ${userId} does not have permission to view trial balance for company ${accountBookId}`
    );
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }

  try {
    /* Info: (20241227 - Luphia) 指定期間取得有變動的會計科目，分析期初、期中、期末的借方與貸方金額，並總計餘額。
     * 0.1. 需求：取得當下 401 申報週期 (每兩個月為一期，例如當下時間點為 2024/11/01 ~ 2024/12/31)
     * 0.2. 需求：輸入會計分錄清單，將重複的分錄合併並加總其借貸金額，輸出合併後的會計分錄清單
     * 0.3. 需求：輸入會計分錄清單，若科目具有子科目，且該科目借方或貸方金額不為 0，則新增一個「預設科目名字-虛擬會計科目（原科目編號）」，將該科目借方或貸方金額加入虛擬科目，列為其子科目，並將自身的金額歸零，輸出整理後的會計分錄清單
     *      e.g. 1101 庫存現金 借方 8,500 貸方 7,000 totalDebit 10,500 totalCredit 10,500、1101-1 庫存現金_行政部門 借方 2,000 貸方 3,500 totalDebit 2,000 totalCredit 3,500
     *      處理後 1101 庫存現金 借方 0 貸方 0 totalDebit 10,500 totalCredit 10,500、1101-0 庫存現金（其他） 借方 8,500 貸方 7,000 totalDebit 8,500 totalCredit 7,000、1101-1 庫存現金_行政部門 借方 2,000 貸方 3,500 totalDebit 2,000 totalCredit 3,500
     *      原本例子
     *      1101 庫存現金           借方 8,500 貸方 7,000 totalDebit 10,500 totalCredit 10,500
     *      1101-1 庫存現金_行政部門 借方 2,000 貸方 3,500 totalDebit 2,000 totalCredit 3,500
     *
     *      原本例子隱含的意思
     *      1101 庫存現金           借方 8,500 貸方 7,000 totalDebit 8,500+2,000 totalCredit 7,000+3,500
     *      1101-1 庫存現金_行政部門 借方 2,000 貸方 3,500 totalDebit 2,000 totalCredit 3,500
     *
     *      新例子
     *      1101 庫存現金           借方 0     貸方 0     totalDebit 10,500 totalCredit 10,500
     *      1101-0 庫存現金（其他）  借方 8,500 貸方 7,000 totalDebit 8,500 totalCredit 7,000
     *      1101-1 庫存現金_行政部門 借方 2,000 貸方 3,500 totalDebit 2,000 totalCredit 3,500
     * 1. 整理用戶輸入參數，取得指定期初時間點 periodBegin、期末時間點 periodEnd，若無指定則預設為當下 401 申報週期
     * 2. 獲得公司貨幣設定
     * 3. 撈公司的 line items，使用 line_item.repo；撈公司的會計科目，使用 account.repo
     * 4. 依照 line items 的 accountId 根據從屬關係組成會計科目結構，並且在有子科目的會計科目底下新增一個虛擬科目，將該科目借方或貸方金額加入虛擬科目，列為其子科目，並將自身的金額改為該子科目的加總
     * 5. 依照該公司所有會計科目，在只用子科目記帳時，將子科目的父科目放進會計科目結構裡，從下往上組成會計科目從屬關係
     * 6. 依照 periodBegin 為區分點，將所有會計分錄分為期初到期中 beginning、期中到期末 midterm 二個部分
     * 7. 合併 beginning line items 並計算其借方貸方金額，統計總額 totalDebit、totalCredit
     * 8. 合併 midterm line items 並計算其借方貸方金額，統計總額 totalDebit、totalCredit
     * 9. 將 beginning 與 midterm 的科目合併加總為期末部份 ending，並計算其借方貸方金額，統計總額 totalDebit、totalCredit
     * 10. 複製出三個帳戶樹，為 beginning、midterm、ending，依照 accountId 分別跟 beginning、midterm、ending 的 Line Items 合併，實作加總子科目
     * 11. 將三個帳戶樹根據 beginning、midterm、ending 的 creditAmount 跟 debitAmount，整理成 ITrialBalancePayload 資料格式，然後排序
     * 12. 整理資料為 API 回傳格式
     * 13. 整理可能發生的例外情形
     * 14. 回傳 API 回應
     */
    // Info: (20250424 - Shirley) Step 1
    const { periodBegin, periodEnd } = getCurrent401Period();

    const updatedQuery = {
      ...query,
      startDate: query.startDate || periodBegin,
      endDate: query.endDate || periodEnd,
    };

    const { sortOption, page, pageSize } = updatedQuery;

    const parsedSortOption = parseSortOption(DEFAULT_SORT_OPTIONS, sortOption);

    // Info: (20250424 - Shirley) Step 2
    let currencyAlias = CurrencyType.TWD;
    const accountingSettingData = await getAccountingSettingByCompanyId(accountBookId);
    if (accountingSettingData?.currency) {
      currencyAlias = accountingSettingData.currency as CurrencyType;
    }

    // Info: (20250424 - Shirley) Step 3 撈出在 endDate 之前的所有 line items
    const lineItems = await getAllLineItemsInPrisma(accountBookId, 0, updatedQuery.endDate);

    // Info: (20250424 - Shirley) Step 3 撈出所有會計科目
    const accounts = await findManyAccountsInPrisma({
      companyId: accountBookId,
      includeDefaultAccount: true,
      page: 1,
      limit: 9999999,
      sortBy: 'code',
      sortOrder: SortOrder.ASC,
      forUser: true,
    });

    // Info: (20250424 - Shirley) Step 4 整理資料
    const lineItemsWithDebitCredit: ILineItemInTrialBalanceItem[] = lineItems.map((item) => ({
      ...item,
      debitAmount: item.debit ? item.amount : 0,
      creditAmount: !item.debit ? item.amount : 0,
    }));

    // Info: (20250424 - Shirley) Step 4, 5, 6, 7, 8, 9, 10, 11
    const threeStagesOfLineItems = convertToTrialBalanceItem(
      lineItemsWithDebitCredit,
      updatedQuery.startDate,
      updatedQuery.endDate
    );
    const threeStagesOfTrialBalance = {
      beginning: processLineItems(threeStagesOfLineItems.beginning, accounts.data).arrWithCopySelf,
      midterm: processLineItems(threeStagesOfLineItems.midterm, accounts.data).arrWithCopySelf,
      ending: processLineItems(threeStagesOfLineItems.ending, accounts.data).arrWithCopySelf,
    };
    // Info: (20250424 - Shirley) Step 12
    const APIData = convertToAPIFormat(threeStagesOfTrialBalance, parsedSortOption);

    if (APIData) {
      const paginatedTrialBalance = formatPaginatedTrialBalance(
        APIData.items,
        parsedSortOption,
        page ?? DEFAULT_PAGE_NUMBER,
        pageSize ?? DEFAULT_PAGE_LIMIT
      );

      const note = {
        currencyAlias,
        total: APIData.total,
      };

      payload = {
        ...paginatedTrialBalance,
        note: JSON.stringify(note),
      };

      statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
      loggerBack.info(
        `Successfully retrieved trial balance for company ${accountBookId}, found ${APIData.items.length} items`
      );
    }
  } catch (error) {
    // Info: (20250424 - Shirley) Step 13
    const err = error as Error;
    loggerBack.error(`Failed to retrieve trial balance for company ${accountBookId}`, {
      error: err,
      errorMessage: err.message,
    });
    statusMessage = err.message || STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  }

  // Info: (20250424 - Shirley) Validate output data
  const { isOutputDataValid } = validateOutputData(apiName, payload);
  if (!isOutputDataValid) {
    statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
    loggerBack.error(`Invalid output data format for trial balance of company ${accountBookId}`);
  }

  // Info: (20250424 - Shirley) Format response and log user action
  const result = formatApiResponse(statusMessage, payload);
  await logUserAction(session, apiName, req, statusMessage);

  return { httpCode: result.httpCode, result: result.result };
}

/**
 * Info: (20250424 - Shirley) Export default handler function
 * This follows the flat coding style API pattern:
 * 1. Define a switch-case for different HTTP methods
 * 2. Call the appropriate handler based on method
 * 3. Handle errors and return consistent response format
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ITrialBalancePayload | null>>
) {
  let httpCode: number = HTTP_STATUS.BAD_REQUEST;
  let result: IResponseData<ITrialBalancePayload | null>;

  try {
    // Info: (20250424 - Shirley) Handle different HTTP methods
    const method = req.method || '';
    switch (method) {
      case HttpMethod.GET:
        ({ httpCode, result } = await handleGetRequest(req));
        break;
      default:
        // Info: (20250424 - Shirley) Method not allowed
        ({ httpCode, result } = formatApiResponse(STATUS_MESSAGE.METHOD_NOT_ALLOWED, null));
    }
  } catch (_error) {
    // Info: (20250424 - Shirley) Error handling
    const error = _error as Error;
    const statusMessage = error.message;
    loggerBack.error(`Error handling trial balance operation: ${statusMessage}`);
    ({ httpCode, result } = formatApiResponse(statusMessage, null));
  }

  // Info: (20250424 - Shirley) Send response
  res.status(httpCode).json(result);
}
