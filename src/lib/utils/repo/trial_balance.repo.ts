import prisma from '@/client';
import { getTimestampNow, pageToOffset } from '@/lib/utils/common';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { SortOrder } from '@/constants/sort';
import { loggerError } from '@/lib/utils/logger_back';
import { SortBy } from '@/constants/journal';
import { ITrialBalancePayload } from '@/interfaces/trial_balance';
import { PUBLIC_COMPANY_ID } from '@/constants/company';
import { STATUS_MESSAGE } from '@/constants/status_code';

/* Info: (20241105 - Shirley) Trial balance repository 實作
company id (public company || targeted company) 去找 account table 拿到所有會計科目 -> voucher -> item -> account
1. 搜尋 accounting setting table 取得貨幣別
2. 用 public company id & my company id 搜尋 account table 取得所有會計科目
  2.1 整理 account 資料結構
3. 用 my company id 搜尋 voucher table 取得所有憑證
4. 用 my company id & 所有憑證 id 搜尋 line item table 取得所有憑證對應的 line item
5. 依照期初、期中、期末分別計算所有會計科目的借方跟貸方金額
6. 處理子科目
7. 加總所有子科目金額
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

  _total?: {
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

interface ListTrialBalanceParams {
  companyId: number;
  startDate: number;
  endDate: number;
  sortBy?: SortBy;
  sortOrder?: SortOrder;
  page?: number;
  pageSize?: number | 'infinity';
}

export async function listTrialBalance(
  params: ListTrialBalanceParams
): Promise<ITrialBalancePayload | null> {
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
  let size: number | undefined;
  let skip: number = 0;

  if (pageSize !== 'infinity') {
    size = pageSize;
    skip = pageToOffset(pageNumber, size);
  }

  let trialBalancePayload: ITrialBalancePayload | null = null;

  try {
    if (pageNumber < 1 && pageSize !== 'infinity') {
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    }

    // Info: (20241105 - Shirley) 1. 搜尋 accounting setting table 取得貨幣別
    const accountingSettingData = await prisma.accountingSetting.findFirst({
      where: { id: companyId },
    });

    let currencyAlias = 'TWD';

    if (accountingSettingData) {
      currencyAlias = accountingSettingData.currency || 'TWD';
    }

    // Info: (20241105 - Shirley) 2. 用 public company id & my company id 搜尋 account table 取得所有會計科目
    const accounts = await prisma.account.findMany({
      where: {
        OR: [
          { companyId, deletedAt: null },
          { companyId: PUBLIC_COMPANY_ID, deletedAt: null },
        ],
      },
      include: {
        lineItem: {
          where: {
            deletedAt: null,
            voucher: {
              date: {
                lte: endDate,
                gte: 0, // 取得所有日期的資料以計算期初
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

    const allVoucherData = await prisma.voucher.findMany({
      where: {
        companyId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    const allVoucherIds = allVoucherData.map((voucher) => voucher.id);

    // Info: (20241105 - Shirley) 4. 用所有憑證 id 搜尋 line item table 取得所有憑證對應的 line item（補充）
    const additionalLineItems = await prisma.lineItem.findMany({
      where: {
        voucherId: { in: allVoucherIds },
        deletedAt: null,
      },
      include: {
        voucher: true,
      },
    });

    // Info: (20241105 - Shirley) 合併 account 表中的 line items 與 voucher 表中的 line items
    accounts.forEach((account) => {
      const voucherLineItems = additionalLineItems.filter(
        (item) => item.accountId === account.id && !account.lineItem.some((li) => li.id === item.id)
      );
      account.lineItem.push(...voucherLineItems);
    });

    // Info: (20241105 - Shirley) 2.1 整理 account 資料結構，依照 parent code 追溯
    const accountMap: { [key: string]: AccountWithSub } = {};
    accounts.forEach((account) => {
      accountMap[account.code] = {
        ...account,
        subAccounts: [],
      };
    });

    // Info: (20241105 - Shirley) 建立科目樹狀結構，透過 parent code 追溯
    const rootAccounts: AccountWithSub[] = [];
    accounts.forEach((account) => {
      if (account.parentCode) {
        const parent = accountMap[account.parentCode];
        if (parent && account.code !== account.parentCode) {
          parent.subAccounts.push(accountMap[account.code]);
        } else {
          // Info: (20241105 - Shirley) 當 code === parentCode 或找不到父代碼時，視為最頂層
          rootAccounts.push(accountMap[account.code]);
        }
      } else {
        // Info: (20241105 - Shirley) 沒有 parentCode 時，視為最頂層
        rootAccounts.push(accountMap[account.code]);
      }
    });

    // Info: (20241105 - Shirley) 計算試算表項目
    const calculateTrialBalance = (account: AccountWithSub): AccountWithSubResult => {
      // Info: (20241105 - Shirley) 計算期初金額
      const beginningCreditAmount = account.lineItem
        .filter((item: LineItem) => !item.debit && item.voucher.date < startDate)
        .reduce((sum: number, item: LineItem) => sum + item.amount, 0);
      const beginningDebitAmount = account.lineItem
        .filter((item: LineItem) => item.debit && item.voucher.date < startDate)
        .reduce((sum: number, item: LineItem) => sum + item.amount, 0);

      // Info: (20241105 - Shirley) 計算期中金額
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

      // Info: (20241105 - Shirley) 處理子科目
      const subAccounts = account.subAccounts.map(calculateTrialBalance);

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
      };
    };

    const trialBalanceItems = rootAccounts.map(calculateTrialBalance);

    // Info: (20241105 - Shirley) 扁平化所有試算表項目以便計算總金額
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

    // Info: (20241105 - Shirley) 計算總金額

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

    let paginatedData = trialBalanceItems;
    let totalCount = trialBalanceItems.length;
    let totalPages = 1;
    let hasNextPage = false;
    let hasPreviousPage = false;

    if (pageSize !== 'infinity') {
      paginatedData = trialBalanceItems.slice(skip, skip + (size || DEFAULT_PAGE_LIMIT));
      totalCount = trialBalanceItems.length;
      totalPages = Math.ceil(totalCount / (size || DEFAULT_PAGE_LIMIT));
      hasNextPage = skip + (size || DEFAULT_PAGE_LIMIT) < totalCount;
      hasPreviousPage = pageNumber > 1;
    }

    const sort = [{ sortBy, sortOrder }];

    const responseItems = paginatedData.map((item) => {
      const { subAccounts, ...rest } = item;
      return {
        ...rest,
        subAccounts: subAccounts.map((sub: AccountWithSubResult) => {
          const { subAccounts: subSub, ...subRest } = sub;
          return {
            ...subRest,
            subAccounts: subSub,
          };
        }),
      };
    });

    trialBalancePayload = {
      currencyAlias,
      items: {
        data: responseItems,
        page: pageNumber,
        totalPages,
        totalCount,
        pageSize: pageSize === 'infinity' ? totalCount : size || DEFAULT_PAGE_LIMIT,
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
  }

  return trialBalancePayload;
}
