import prisma from '@/client';
import { getTimestampNow, pageToOffset } from '@/lib/utils/common';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { SortOrder } from '@/constants/sort';
import { loggerError } from '@/lib/utils/logger_back';
import { SortBy } from '@/constants/journal';
import { ITrialBalancePayload } from '@/interfaces/trial_balance';

/* Info: (20241023 - Shirley) Trial balance repository 實作
WI:
company id in account -> ...

WII: (preferred)
company id (public company || targeted company) 去找 account table 拿到所有會計科目 -> voucher -> item -> account
*/

interface LineItem {
  id: number;
  amount: number;
  description: string;
  debit: boolean;
  accountId: number;
  voucherId: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  voucher: {
    id: number;
    date: number;
  };
}

// Info: (20241022 - Shirley)建立科目映射表
interface AccountWithSub {
  id: number;
  code: string;
  name: string;
  subAccounts: AccountWithSub[];
  lineItem: LineItem[];
}

interface AccountWithSubResult {
  id: number;
  no: string;
  accountingTitle: string;
  beginningCreditAmount: number;
  beginningDebitAmount: number;
  midtermCreditAmount: number;
  midtermDebitAmount: number;
  endingCreditAmount: number;
  endingDebitAmount: number;
  subAccounts: AccountWithSubResult[];
  createAt: number;
  updateAt: number;

  _total: {
    beginningCreditAmount: number;
    beginningDebitAmount: number;
    midtermCreditAmount: number;
    midtermDebitAmount: number;
    endingCreditAmount: number;
    endingDebitAmount: number;
    createAt: number;
    updateAt: number;
  };
}

/**
 * 取得分頁化的試算表資料
 */
interface ListTrialBalanceParams {
  companyId: number;
  startDate: number;
  endDate: number;
  sortBy?: SortBy;
  sortOrder?: SortOrder;
  page?: number;
  pageSize?: number | 'infinity';
}

/**
 * 列出所有試算表項目
 * @param params ListTrialBalanceParams
 * @returns Promise<ITrialBalancePayload>
 */
export async function listTrialBalance(
  params: ListTrialBalanceParams
  // ): Promise<ITrialBalanceResponse> {
): Promise<ITrialBalancePayload> {
  const {
    companyId,
    startDate,
    endDate,
    sortBy = SortBy.CREATED_AT,
    sortOrder = SortOrder.DESC,
    page = DEFAULT_PAGE_NUMBER,
    pageSize = DEFAULT_PAGE_LIMIT,
  } = params;

  const pageNumber = page;
  const size = pageSize === 'infinity' ? 1000000 : pageSize;
  const skip = pageToOffset(pageNumber, size);

  try {
    // Info: (20241022 - Shirley)取得公司會計設定中的貨幣別
    const company = await prisma.company.findFirst({
      where: { id: companyId, deletedAt: null },
      include: {
        accountingSettings: {
          take: 1,
        },
      },
    });

    if (!company) {
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }

    const currencyAlias = company.accountingSettings[0]?.currency || 'TWD';

    // Info: (20241022 - Shirley)取得所有相關會計科目
    const accounts = await prisma.account.findMany({
      where: {
        companyId,
        deletedAt: null,
      },
      include: {
        lineItem: {
          where: {
            deletedAt: null,
            voucher: {
              date: {
                lte: endDate,
                gte: 0, // Info: (20241022 - Shirley)取得所有日期的資料以計算期初
              },
            },
          },
          include: {
            voucher: true,
          },
        },
        child: {
          where: { deletedAt: null },
          include: {
            lineItem: {
              where: {
                deletedAt: null,
                voucher: {
                  date: {
                    lte: endDate,
                    gte: 0,
                  },
                },
              },
              include: {
                voucher: true,
              },
            },
          },
        },
      },
    });

    // Info: (20241022 - Shirley)建立科目映射表
    const accountMap: { [key: string]: AccountWithSub } = {};
    accounts.forEach((account) => {
      accountMap[account.code] = {
        ...account,
        subAccounts: [],
      };
    });

    // Info: (20241022 - Shirley)建立科目樹狀結構
    const rootAccounts: AccountWithSub[] = [];
    accounts.forEach((account) => {
      if (account.parentCode && accountMap[account.parentCode]) {
        accountMap[account.parentCode].subAccounts.push(accountMap[account.code]);
      } else {
        rootAccounts.push(accountMap[account.code]);
      }
    });

    // eslint-disable-next-line no-console
    console.log('rootAccounts', rootAccounts);

    // Info: (20241022 - Shirley)計算試算表項目
    const calculateTrialBalance = (account: AccountWithSub): AccountWithSubResult => {
      // Info: (20241022 - Shirley)計算期初金額
      const beginningCreditAmount = account.lineItem
        .filter((item: LineItem) => !item.debit && item.voucher.date < startDate)
        .reduce((sum: number, item: LineItem) => sum + item.amount, 0);
      const beginningDebitAmount = account.lineItem
        .filter((item: LineItem) => item.debit && item.voucher.date < startDate)
        .reduce((sum: number, item: LineItem) => sum + item.amount, 0);

      // Info: (20241022 - Shirley)計算期中金額
      const midtermCreditAmount = account.lineItem
        .filter(
          (item: LineItem) =>
            !item.debit && item.voucher.date >= startDate && item.voucher.date <= endDate
        )
        .reduce((sum: number, item: LineItem) => sum + item.amount, 0);
      const midtermDebitAmount = account.lineItem
        .filter(
          (item: LineItem) =>
            item.debit && item.voucher.date >= startDate && item.voucher.date <= endDate
        )
        .reduce((sum: number, item: LineItem) => sum + item.amount, 0);

      const endingCreditAmount = beginningCreditAmount + midtermCreditAmount;
      const endingDebitAmount = beginningDebitAmount + midtermDebitAmount;

      // Info: (20241022 - Shirley)處理子科目
      const subAccounts = account.subAccounts.map(calculateTrialBalance);

      // Info: (20241022 - Shirley)加總子科目金額
      let totalBeginningCredit = beginningCreditAmount;
      let totalBeginningDebit = beginningDebitAmount;
      let totalMidtermCredit = midtermCreditAmount;
      let totalMidtermDebit = midtermDebitAmount;
      let totalEndingCredit = endingCreditAmount;
      let totalEndingDebit = endingDebitAmount;

      subAccounts.forEach((sub) => {
        totalBeginningCredit += sub.beginningCreditAmount;
        totalBeginningDebit += sub.beginningDebitAmount;
        totalMidtermCredit += sub.midtermCreditAmount;
        totalMidtermDebit += sub.midtermDebitAmount;
        totalEndingCredit += sub.endingCreditAmount;
        totalEndingDebit += sub.endingDebitAmount;
      });

      const now = getTimestampNow();

      return {
        id: account.id,
        no: account.code,
        accountingTitle: account.name,
        beginningCreditAmount,
        beginningDebitAmount,
        midtermCreditAmount,
        midtermDebitAmount,
        endingCreditAmount,
        endingDebitAmount,
        subAccounts,
        createAt: now,
        updateAt: now,
        _total: {
          beginningCreditAmount: totalBeginningCredit,
          beginningDebitAmount: totalBeginningDebit,
          midtermCreditAmount: totalMidtermCredit,
          midtermDebitAmount: totalMidtermDebit,
          endingCreditAmount: totalEndingCredit,
          endingDebitAmount: totalEndingDebit,
          createAt: now,
          updateAt: now,
        },
      };
    };

    const trialBalanceItems = rootAccounts.map(calculateTrialBalance);

    // TODO: (20241022 - Shirley) 扁平化所有試算表項目以便計算總金額
    const flattenTrialBalance = (items: AccountWithSubResult[]): AccountWithSubResult[] => {
      let flat: AccountWithSubResult[] = [];
      items.forEach((item) => {
        flat.push(item);
        if (item.subAccounts && item.subAccounts.length > 0) {
          flat = flat.concat(flattenTrialBalance(item.subAccounts));
        }
      });
      return flat;
    };

    const flatItems = flattenTrialBalance(trialBalanceItems);

    // TODO: (20241022 - Shirley) 計算總金額
    const total = {
      beginningCreditAmount: flatItems.reduce((sum, item) => sum + item.beginningCreditAmount, 0),
      beginningDebitAmount: flatItems.reduce((sum, item) => sum + item.beginningDebitAmount, 0),
      midtermCreditAmount: flatItems.reduce((sum, item) => sum + item.midtermCreditAmount, 0),
      midtermDebitAmount: flatItems.reduce((sum, item) => sum + item.midtermDebitAmount, 0),
      endingCreditAmount: flatItems.reduce((sum, item) => sum + item.endingCreditAmount, 0),
      endingDebitAmount: flatItems.reduce((sum, item) => sum + item.endingDebitAmount, 0),
      createAt: Math.floor(Date.now() / 1000),
      updateAt: Math.floor(Date.now() / 1000),
    };

    // TODO: (20241022 - Shirley) 排序
    // const sortedItems = trialBalanceItems.sort((a, b) => {
    //   const fieldA = a[sortBy];
    //   const fieldB = b[sortBy];
    //   if (sortOrder === SortOrder.ASC) {
    //     return fieldA > fieldB ? 1 : -1;
    //   }
    //   return fieldA < fieldB ? 1 : -1;
    // });

    // TODO: (20241022 - Shirley) 分頁
    // const totalCount = sortedItems.length;
    // const paginatedData = sortedItems.slice(skip, skip + size);
    const paginatedData = trialBalanceItems.slice(skip, skip + size);
    const totalCount = trialBalanceItems.length;
    const totalPages = Math.ceil(totalCount / size);
    const hasNextPage = skip + size < totalCount;
    const hasPreviousPage = pageNumber > 1;

    const sort = [{ sortBy, sortOrder }];

    const responseItems = paginatedData.map((item) => {
      const { _total, subAccounts, ...rest } = item;

      return {
        ...rest,
        subAccounts: subAccounts.map((sub: AccountWithSubResult) => {
          const { _total: subTotal, subAccounts: subSub, ...subRest } = sub;
          return {
            ...subRest,
            subAccounts: subSub,
          };
        }),
      };
    });

    return {
      currencyAlias,
      items: {
        data: responseItems,
        page: pageNumber,
        totalPages,
        totalCount,
        pageSize: size,
        hasNextPage,
        hasPreviousPage,
        sort,
      },
      total,
    };
  } catch (error) {
    const logError = loggerError(
      0,
      'listTrialBalance in trial_balance.repo.ts failed',
      error as Error
    );
    logError.error('Prisma related listTrialBalance in trial_balance.repo.ts failed');
    throw new Error(STATUS_MESSAGE.BAD_REQUEST);
  } finally {
    await prisma.$disconnect();
  }
}
