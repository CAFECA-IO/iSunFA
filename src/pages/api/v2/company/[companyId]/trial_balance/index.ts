import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import {
  ILineItemInTrialBalanceItem,
  ITrialBalanceTotal,
  TrialBalanceItem,
} from '@/interfaces/trial_balance';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { IPaginatedData } from '@/interfaces/pagination';
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

export const handleGetRequest: IHandleRequest<
  APIName.TRIAL_BALANCE_LIST,
  {
    currencyAlias: string;
    items: IPaginatedData<TrialBalanceItem[]>;
    total: ITrialBalanceTotal;
  }
> = async ({ query }) => {
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
   * 11. 將三個帳戶樹根據 beginning、midterm、ending 的 creditAmount 跟 debitAmount，整理成 ITrialBalanceData 資料格式，然後排序
   * 12. 整理資料為 API 回傳格式
   * 13. 整理可能發生的例外情形
   * 14. 回傳 API 回應
   */
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: {
    currencyAlias: string;
    items: IPaginatedData<TrialBalanceItem[]>;
    total: ITrialBalanceTotal;
  } | null = null;
  try {
    // Info: (20250102 - Shirley) Step 1
    const { periodBegin, periodEnd } = getCurrent401Period();

    const updatedQuery = {
      ...query,
      startDate: query.startDate || periodBegin,
      endDate: query.endDate || periodEnd,
    };

    const { companyId, sortOption, page, pageSize } = updatedQuery;

    const parsedSortOption = parseSortOption(DEFAULT_SORT_OPTIONS, sortOption);

    // Info: (20250102 - Shirley) Step 2
    let currencyAlias = CurrencyType.TWD;
    const accountingSettingData = await getAccountingSettingByCompanyId(companyId);
    if (accountingSettingData?.currency) {
      currencyAlias = accountingSettingData.currency as CurrencyType;
    }

    // Info: (20250102 - Shirley) Step 3 撈出在 endDate 之前的所有 line items
    const lineItems = await getAllLineItemsInPrisma(companyId, 0, updatedQuery.endDate);

    // Info: (20250102 - Shirley) Step 3 撈出所有會計科目
    const accounts = await findManyAccountsInPrisma({
      companyId,
      includeDefaultAccount: true,
      page: 1,
      limit: 9999999,
      sortBy: 'code',
      sortOrder: SortOrder.ASC,
      forUser: true,
    });

    // Info: (20250106 - Shirley) Step 4 整理資料
    const lineItemsWithDebitCredit: ILineItemInTrialBalanceItem[] = lineItems.map((item) => ({
      ...item,
      debitAmount: item.debit ? item.amount : 0,
      creditAmount: !item.debit ? item.amount : 0,
    }));

    // Info: (20250102 - Shirley) Step 4, 5, 6, 7, 8, 9, 10, 11
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
    // Info: (20250106 - Shirley) Step 12
    const APIData = convertToAPIFormat(threeStagesOfTrialBalance, parsedSortOption);

    if (APIData) {
      const paginatedTrialBalance = formatPaginatedTrialBalance(
        APIData.items,
        parsedSortOption,
        page ?? DEFAULT_PAGE_NUMBER,
        pageSize ?? DEFAULT_PAGE_LIMIT
      );
      payload = {
        currencyAlias,
        items: paginatedTrialBalance,
        total: APIData.total,
      };
      statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
    }
  } catch (error) {
    // Info: (20250106 - Shirley) Step 13
    const err = error as Error;
    statusMessage = err.message || STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  }

  // Info: (20250106 - Shirley) Step 14
  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{
    statusMessage: string;
    payload: {
      currencyAlias: string;
      items: IPaginatedData<TrialBalanceItem[]>;
      total: ITrialBalanceTotal;
    } | null;
  }>;
} = {
  GET: (req) => withRequestValidation(APIName.TRIAL_BALANCE_LIST, req, handleGetRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    IResponseData<{
      currencyAlias: string;
      items: IPaginatedData<TrialBalanceItem[]>;
      total: ITrialBalanceTotal;
    } | null>
  >
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: {
    currencyAlias: string;
    items: IPaginatedData<TrialBalanceItem[]>;
    total: ITrialBalanceTotal;
  } | null = null;

  try {
    const handleRequest = methodHandlers[req.method || ''];
    if (handleRequest) {
      ({ statusMessage, payload } = await handleRequest(req, res));
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
    payload = null;
  } finally {
    const { httpCode, result } = formatApiResponse<{
      currencyAlias: string;
      items: IPaginatedData<TrialBalanceItem[]>;
      total: ITrialBalanceTotal;
    } | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
