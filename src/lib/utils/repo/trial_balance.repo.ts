import prisma from '@/client';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { loggerError } from '@/lib/utils/logger_back';
import { ITrialBalancePayload } from '@/interfaces/trial_balance';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { convertAccountBookJsonToTrialBalanceItem } from '@/lib/utils/trial_balance';
import { DEFAULT_SORT_OPTIONS } from '@/constants/trial_balance';
import { formatPaginatedTrialBalance } from '@/lib/utils/formatter/trial_balance.formatter';
import { getAccountBook } from '@/lib/utils/repo/account_book.repo';
import { DefaultValue } from '@/constants/default_value';
import { parseSortOption } from '@/lib/utils/sort';
import { SortBy, SortOrder } from '@/constants/sort';

/* Info: (20241105 - Shirley) Trial balance repository 實作
company id (public company || targeted company) 去找 account table 拿到所有會計科目 -> voucher -> item -> account
1. 搜尋 accounting setting table 取得貨幣別
2. 用 public company id & my company id 搜尋 account table 取得所有會計科目
  2.1 整理 account 資料結構
3. 用 my company id 搜尋 voucher table 取得所有憑證
4. 用我的 company id & 所有憑證 id 搜尋 line item table 取得所有憑證對應的 line item
5. 依照期初、期中、期末分別計算所有會計科目的借方跟貸方金額
6. 處理子科目
7. 加總所有子科目金額
*/

interface ListTrialBalanceParams {
  companyId: number;
  startDate: number;
  endDate: number;
  sortOption?: string;
  page?: number;
  pageSize?: number;
}

export const initTrialBalanceData = async (
  companyId: number,
  startDate: number,
  endDate: number,
  sort: {
    by: SortBy;
    order: SortOrder;
  }[]
) => {
  const beginningAccountBook = await getAccountBook(companyId, 0, startDate);
  const midtermAccountBook = await getAccountBook(companyId, startDate, endDate);
  const endingAccountBook = await getAccountBook(companyId, 0, endDate);

  const beginningAccountBookJSON = beginningAccountBook.toJSON();
  const midtermAccountBookJSON = midtermAccountBook.toJSON();
  const endingAccountBookJSON = endingAccountBook.toJSON();

  const convertedSortOption = sort.map((item) => `${item.by}:${item.order}`).join('-');
  const parsedSortOption = parseSortOption(DEFAULT_SORT_OPTIONS, convertedSortOption);

  const trialBalanceData = convertAccountBookJsonToTrialBalanceItem(
    beginningAccountBookJSON,
    midtermAccountBookJSON,
    endingAccountBookJSON,
    parsedSortOption
  );

  return trialBalanceData;
};

export async function listTrialBalance(
  params: ListTrialBalanceParams
): Promise<ITrialBalancePayload | null> {
  const {
    companyId,
    startDate,
    endDate,
    sortOption,
    page = DEFAULT_PAGE_NUMBER,
    pageSize = DEFAULT_PAGE_LIMIT,
  } = params;

  const pageNumber = page;
  let trialBalancePayload: ITrialBalancePayload | null = null;

  try {
    if (pageNumber < 1) {
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    }

    const parsedSortOption = parseSortOption(DEFAULT_SORT_OPTIONS, sortOption);

    const accountingSettingData = await prisma.accountingSetting.findFirst({
      where: { companyId },
    });

    let currencyAlias = 'TWD';

    if (accountingSettingData) {
      currencyAlias = accountingSettingData.currency || 'TWD';
    }

    const beginningAccountBook = await getAccountBook(companyId, 0, startDate);
    const midtermAccountBook = await getAccountBook(companyId, startDate, endDate);
    const endingAccountBook = await getAccountBook(companyId, 0, endDate);

    const beginningAccountBookJSON = beginningAccountBook.toJSON();
    const midtermAccountBookJSON = midtermAccountBook.toJSON();
    const endingAccountBookJSON = endingAccountBook.toJSON();

    const trialBalanceData = convertAccountBookJsonToTrialBalanceItem(
      beginningAccountBookJSON,
      midtermAccountBookJSON,
      endingAccountBookJSON,
      parsedSortOption
    );

    const paginatedTrialBalance = formatPaginatedTrialBalance(
      trialBalanceData.items,
      parsedSortOption,
      pageNumber,
      pageSize
    );

    trialBalancePayload = {
      currencyAlias,
      items: paginatedTrialBalance,
      total: trialBalanceData.total,
    };
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'listTrialBalance in trial_balance.repo.ts failed',
      errorMessage: error as Error,
    });
  }

  return trialBalancePayload;
}
