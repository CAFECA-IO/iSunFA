import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { ITrialBalanceTotal, TrialBalanceItem } from '@/interfaces/trial_balance';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { IPaginatedData } from '@/interfaces/pagination';
import {
  convertToTrialBalanceAPIFormat,
  convertToTrialBalanceFormat,
  getCurrent401Period,
} from '@/lib/utils/trial_balance';
import { getAllLineItemsInPrisma } from '@/lib/utils/repo/line_item.repo';
import { CurrencyType } from '@/constants/currency';
import { getAccountingSettingByCompanyId } from '@/lib/utils/repo/accounting_setting.repo';
import { formatPaginatedTrialBalance } from '@/lib/utils/formatter/trial_balance.formatter';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { DEFAULT_SORT_OPTIONS } from '@/constants/trial_balance';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { parseSortOption } from '@/lib/utils/sort';

export const handleGetRequest: IHandleRequest<
  APIName.TRIAL_BALANCE_LIST,
  {
    currencyAlias: string;
    items: IPaginatedData<TrialBalanceItem[]>;
    total: ITrialBalanceTotal;
  }
> = async ({ query }) => {
  /* Info: (20241227 - Luphia) 指定期間ˊ取得有變動的會計科目，分析期初、期中、期末的借方與貸方金額，並總計餘額。
   * 5*60+30+10*12=450min (20241230 - Shirley)
   * 0.1. 30min)撰寫 common function 取得當下 401 申報週期 (每兩個月為一期，例如當下時間點為 2024/11/01 ~ 2024/12/31)
   * 0.2. 2h)撰寫 Utils 工具，輸入會計分錄清單，將重複的分錄合併並加總其借貸金額，輸出合併後的會計分錄清單
   * 0.3. 2h)撰寫 Utils 工具，輸入會計分錄清單，若科目具有子科目，且該科目借方或貸方金額不為 0，則新增一個「其他」虛擬科目，將該科目借方或貸方金額加入「其他」虛擬科目，列為其子科目，並將自身的金額歸零，輸出整理後的會計分錄清單
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
   * 1. 10min)整理用戶輸入參數，取得指定期初時間點 periodBegin、期末時間點 periodEnd，若無指定則預設為當下 401 申報週期
   * 2. 10min)直接撈公司的 line items，使用 line_item.repo
   * 3. 10min)獲取該公司所有會計科目，使用 account.repo
   * 4. 10min)依照 periodBegin 為區分點，將所有會計分錄分為期初到期中 begining、期中到期末 midterm 二個部分
   * 5. 10min)使用 Utils 工具合併 begining 並計算其借方貸方金額，統計總額 totalDebit、totalCredit
   * 6. 10min)使用 Utils 工具合併 midterm 並計算其借方貸方金額，統計總額 totalDebit、totalCredit
   * 7. 10min)使用 Utils 工具將 begining 與 midterm 的科目合併加總為期末部份 ending，並計算其借方貸方金額，統計總額 totalDebit、totalCredit
   * 8. 10min)篩除借方與貸方金額皆為 0 的科目
   * 9. 10min)使用 Utils 0.3. 工具增列虛擬科目
   * 10. 10min)整理資料為 API 回傳格式
   * 11. 2h)整理可能發生的例外情形
   * 12. 10min)回傳 API 回應
   */
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: {
    currencyAlias: string;
    items: IPaginatedData<TrialBalanceItem[]>;
    total: ITrialBalanceTotal;
  } | null = null;
  try {
    const { periodBegin, periodEnd } = getCurrent401Period();

    const updatedQuery = {
      ...query,
      startDate: query.startDate || periodBegin,
      endDate: query.endDate || periodEnd,
    };

    const { companyId, sortOption, page, pageSize } = updatedQuery;

    const parsedSortOption = parseSortOption(DEFAULT_SORT_OPTIONS, sortOption);

    let currencyAlias = CurrencyType.TWD;
    const accountingSettingData = await getAccountingSettingByCompanyId(companyId);
    if (accountingSettingData?.currency) {
      currencyAlias = accountingSettingData.currency as CurrencyType;
    }

    const lineItems = await getAllLineItemsInPrisma(companyId, 0, updatedQuery.endDate);

    const lineItemsInTrialBalance = lineItems.map((item) => ({
      ...item,
      debitAmount: item.debit ? item.amount : 0,
      creditAmount: !item.debit ? item.amount : 0,
    }));

    // TODO: (20241230 - Shirley) 虛擬科目

    const threeStagesOfTrialBalance = convertToTrialBalanceFormat(
      lineItemsInTrialBalance,
      updatedQuery.startDate,
      updatedQuery.endDate
    );

    const trialBalanceAPIFormat = convertToTrialBalanceAPIFormat(threeStagesOfTrialBalance);

    if (trialBalanceAPIFormat) {
      const paginatedTrialBalance = formatPaginatedTrialBalance(
        trialBalanceAPIFormat.items,
        parsedSortOption,
        page ?? DEFAULT_PAGE_NUMBER,
        pageSize ?? DEFAULT_PAGE_LIMIT
      );

      payload = {
        currencyAlias,
        items: paginatedTrialBalance,
        total: trialBalanceAPIFormat.total,
      };
      statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
    }
  } catch (error) {
    const err = error as Error;
    statusMessage = err.message || STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  }

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
  GET: (req, res) => withRequestValidation(APIName.TRIAL_BALANCE_LIST, req, res, handleGetRequest),
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
