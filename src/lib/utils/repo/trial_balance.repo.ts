import prisma from '@/client';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { loggerError } from '@/lib/utils/logger_back';
import { ITrialBalancePayload } from '@/interfaces/trial_balance';
import { PUBLIC_COMPANY_ID } from '@/constants/company';
import { STATUS_MESSAGE } from '@/constants/status_code';
import {
  buildAccountForestForUser,
  transformLineItemsFromDBToMap,
  updateAccountAmountsForTrialBalance,
} from '@/lib/utils/account/common';
import {
  combineAccountForests,
  flattenTrialBalance,
  formatAccountsWithLineItemProperties,
  parseSortOption,
  sortTrialBalance,
} from '@/lib/utils/trial_balance';
import { DEFAULT_SORT_OPTIONS } from '@/constants/trial_balance';
import { formatPaginatedTrialBalance } from '@/lib/utils/formatter/trial_balance.formatter';
import { DefaultValue } from '@/constants/default_value';

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

    /** Info: (20241118 - Shirley)
     * 1. 解析 sortOption
     * 2. 將 accountForest 轉為 AccountWithSub
     *   2.1 將 voucher 的 line item 合併到 account 的 line item 裡
     * 3. 根據 startDate, endDate 計算試算表項目
     * 4. 將 trialBalance 展平，獲得 flattenTrialBalance
     * 5. 將 flattenTrialBalance 加總，獲得 total
     * 6. 將 trialBalance 排序，注意 subAccounts 也要排序，獲得 sortedTrialBalance
     * 7. 將 sortedTrialBalance 分頁，獲得 paginatedTrialBalance
     * 8. 將 total 放到 trialBalancePayload 裡
     * 9. 將餘額全部為 0 的科目過濾掉
     */

    const parsedSortOption = parseSortOption(DEFAULT_SORT_OPTIONS, sortOption);

    // Info: (20241118 - Shirley) 1. 搜尋 accounting setting table 取得貨幣別
    const accountingSettingData = await prisma.accountingSetting.findFirst({
      where: { companyId },
    });

    let currencyAlias = 'TWD';

    if (accountingSettingData) {
      currencyAlias = accountingSettingData.currency || 'TWD';
    }

    // Info: (20241118 - Shirley) 2. 用 public company id & my company id 搜尋 account table 取得所有會計科目
    const accounts = await prisma.account.findMany({
      where: {
        OR: [
          { companyId, deletedAt: null },
          { companyId: PUBLIC_COMPANY_ID, deletedAt: null },
        ],
        forUser: true,
      },
    });

    // Info: (20241118 - Shirley) 3. 用 companyId 搜尋 voucher table 取得所有憑證
    const vouchers = await prisma.voucher.findMany({
      where: {
        companyId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    const allVoucherIds = vouchers.map((voucher) => voucher.id);

    // Info: (20241118 - Shirley) 4. 用憑證 id 搜尋 line item table 取得所有憑證對應的 line item
    const lineItems = await prisma.lineItem.findMany({
      where: {
        voucherId: { in: allVoucherIds },
        deletedAt: null,
        createdAt: {
          lte: endDate,
        },
      },
      include: {
        voucher: true,
        account: true,
      },
    });

    const accountsWithLineItemProperties = formatAccountsWithLineItemProperties(
      accounts,
      lineItems
    );

    const accountForest = buildAccountForestForUser(accountsWithLineItemProperties);

    const beginningLineItems = lineItems.filter((item) => item.voucher.date < startDate);
    const midtermLineItems = lineItems.filter(
      (item) => item.voucher.date >= startDate && item.voucher.date <= endDate
    );

    const beginningLineItemsMap = transformLineItemsFromDBToMap(beginningLineItems);
    const midtermLineItemsMap = transformLineItemsFromDBToMap(midtermLineItems);

    const beginningAccountForest = updateAccountAmountsForTrialBalance(
      accountForest,
      beginningLineItemsMap
    );
    const midtermAccountForest = updateAccountAmountsForTrialBalance(
      accountForest,
      midtermLineItemsMap
    );
    const trialBalanceAccountsFromTree = combineAccountForests(
      beginningAccountForest,
      midtermAccountForest
    );

    const flattenTrialBalanceFromTree = flattenTrialBalance(trialBalanceAccountsFromTree);

    const totalFromTree = {
      beginningCreditAmount: flattenTrialBalanceFromTree.reduce(
        (sum, item) => sum + item.beginningCreditAmount,
        0
      ),
      beginningDebitAmount: flattenTrialBalanceFromTree.reduce(
        (sum, item) => sum + item.beginningDebitAmount,
        0
      ),
      midtermCreditAmount: flattenTrialBalanceFromTree.reduce(
        (sum, item) => sum + item.midtermCreditAmount,
        0
      ),
      midtermDebitAmount: flattenTrialBalanceFromTree.reduce(
        (sum, item) => sum + item.midtermDebitAmount,
        0
      ),
      endingCreditAmount: flattenTrialBalanceFromTree.reduce(
        (sum, item) => sum + item.endingCreditAmount,
        0
      ),
      endingDebitAmount: flattenTrialBalanceFromTree.reduce(
        (sum, item) => sum + item.endingDebitAmount,
        0
      ),
      createAt: Math.floor(Date.now() / 1000),
      updateAt: Math.floor(Date.now() / 1000),
    };

    const sortedTrialBalanceFromTree = sortTrialBalance(
      flattenTrialBalanceFromTree,
      parsedSortOption
    ).filter(
      (account) =>
        account.beginningCreditAmount !== 0 ||
        account.beginningDebitAmount !== 0 ||
        account.midtermCreditAmount !== 0 ||
        account.midtermDebitAmount !== 0 ||
        account.endingCreditAmount !== 0 ||
        account.endingDebitAmount !== 0
    );

    const paginatedTrialBalance = formatPaginatedTrialBalance(
      sortedTrialBalanceFromTree,
      parsedSortOption,
      pageNumber,
      pageSize
    );

    trialBalancePayload = {
      currencyAlias,
      items: paginatedTrialBalance,
      total: totalFromTree,
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
