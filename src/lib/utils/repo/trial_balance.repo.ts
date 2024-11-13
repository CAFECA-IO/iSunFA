/* eslint-disable */
// FIXME: 拿掉 disable
import prisma from '@/client';
import { getTimestampNow, pageToOffset } from '@/lib/utils/common';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { SortOrder, SortBy } from '@/constants/sort';
import { loggerError } from '@/lib/utils/logger_back';
import { ITrialBalancePayload } from '@/interfaces/trial_balance';
import { PUBLIC_COMPANY_ID } from '@/constants/company';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { zodFilterSectionSortingOptions } from '@/lib/utils/zod_schema/common';
import { buildAccountForestForUser } from '@/lib/utils/account/common';
import { IAccountNode } from '@/interfaces/accounting_account';
import fs from 'fs';
import path from 'path';

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
  // FIXME: 改成 createdAt, updatedAt 或者刪掉
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

interface AccountWithSub1 {
  id: number;
  debit: boolean;
  amount: number;
  code: string;
  name: string;
  lineItem: LineItem[];
  subAccounts: AccountWithSub1[];

  parentCode: string;
}

interface AccountWithSubResult1 {
  id: number;
  no: string;
  accountingTitle: string;
  beginningCreditAmount: number;
  beginningDebitAmount: number;
  midtermCreditAmount: number;
  midtermDebitAmount: number;
  endingCreditAmount: number;
  endingDebitAmount: number;
  subAccounts: AccountWithSubResult1[];
  createAt: number;
  updateAt: number;

  parentCode: string;
}

const DEFAULT_SORT_OPTIONS = [{ sortBy: SortBy.BEGINNING_CREDIT_AMOUNT, sortOrder: SortOrder.ASC }];

// function parseSortOptions(sortOptions: string | undefined): {
//   sortBy: SortBy;
//   sortOrder: SortOrder;
// }[] {
//   const parseResult = zodFilterSectionSortingOptions().safeParse(sortOptions);
//   console.log('parseResult', JSON.stringify(parseResult, null, 2));
//   if (parseResult.success) {
//     return parseResult.data;
//   } else {
//     return DEFAULT_SORT_OPTIONS;
//     // throw new Error('Invalid sortOptions format');
//   }
// }

function parseSortOptions(sortOptions: string | undefined): {
  sortBy: SortBy;
  sortOrder: SortOrder;
}[] {
  if (!sortOptions) {
    return DEFAULT_SORT_OPTIONS;
  }

  // 檢查是否包含 'sortOption=' 前綴
  const optionsString = sortOptions.startsWith('sortOption=')
    ? sortOptions.substring('sortOption='.length)
    : sortOptions;

  try {
    // 將多個排序選項分割，例如 "field1:order1-field2:order2"
    const sortPairs = optionsString.split('-');

    return sortPairs.map((pair) => {
      const [field, order] = pair.split(':');

      // 驗證排序欄位和順序是否有效
      if (
        !Object.values(SortBy).includes(field as SortBy) ||
        !Object.values(SortOrder).includes(order as SortOrder)
      ) {
        throw new Error('Invalid sort parameters');
      }

      return {
        sortBy: field as SortBy,
        sortOrder: order as SortOrder,
      };
    });
  } catch (error) {
    return DEFAULT_SORT_OPTIONS;
  }
}

function transformAccountForestToAccountWithSub(accountForest: IAccountNode[]): AccountWithSub1[] {
  const accountWithSubResult = accountForest.map((account) => {
    const subAccounts = transformAccountForestToAccountWithSub(account.children);
    const { id, code, debit, amount, name, parentCode } = account;
    const lineItem: LineItem[] = [];

    const newAcc = {
      id,
      code,
      debit,
      amount,
      name,
      lineItem,
      subAccounts,

      parentCode,
    };

    return newAcc;
  });

  return accountWithSubResult;
}

function addVoucherLineItemToAccount(
  accounts: AccountWithSub1[],
  additionalLineItems: LineItem[]
): AccountWithSub1[] {
  const newAccounts = accounts.map((account) => {
    const voucherLineItems = additionalLineItems.filter(
      (item) => item.accountId === account.id && !account.lineItem.some((li) => li.id === item.id)
    );
    return {
      ...account,
      lineItem: [...account.lineItem, ...voucherLineItems],
    };
  });

  return newAccounts;
}

function calculateTrialBalance1({
  startDate,
  endDate,
  account,
}: {
  startDate: number;
  endDate: number;
  account: AccountWithSub1;
}): AccountWithSubResult1 {
  const beginningCreditAmount = account.lineItem
    .filter((item: LineItem) => !item.debit && item.voucher.date < startDate)
    .reduce((sum: number, item: LineItem) => sum + item.amount, 0);

  const beginningDebitAmount = account.lineItem
    .filter((item: LineItem) => item.debit && item.voucher.date < startDate)
    .reduce((sum: number, item: LineItem) => sum + item.amount, 0);

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

  const endingCreditAmount = account.lineItem
    .filter((item: LineItem) => !item.debit && item.voucher.date > endDate)
    .reduce((sum: number, item: LineItem) => sum + item.amount, 0);

  const endingDebitAmount = account.lineItem
    .filter((item: LineItem) => item.debit && item.voucher.date > endDate)
    .reduce((sum: number, item: LineItem) => sum + item.amount, 0);

  const subAccounts = account.subAccounts.map((subAccount) =>
    calculateTrialBalance1({ startDate, endDate, account: subAccount })
  );

  const now = 0;
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

    parentCode: account.parentCode,
  };
}

const flattenTrialBalance1 = (items: AccountWithSubResult1[]): AccountWithSubResult1[] => {
  let flat: AccountWithSubResult1[] = [];
  items.forEach((item) => {
    flat.push(item);
    if (item.subAccounts && item.subAccounts.length > 0) {
      flat = flat.concat(flattenTrialBalance1(item.subAccounts));
    }
  });
  return flat;
};

const sortTrialBalance1 = (
  items: AccountWithSubResult1[],
  sortOptions: {
    sortBy: SortBy;
    sortOrder: SortOrder;
  }[]
): AccountWithSubResult1[] => {
  if (sortOptions.length > 0) {
    items.sort((a, b) => {
      return sortOptions.reduce((acc, option) => {
        if (acc !== 0) return acc;

        let fieldA: number | string;
        let fieldB: number | string;

        switch (option.sortBy) {
          case SortBy.BEGINNING_CREDIT_AMOUNT:
            fieldA = a.beginningCreditAmount;
            fieldB = b.beginningCreditAmount;
            break;
          case SortBy.BEGINNING_DEBIT_AMOUNT:
            fieldA = a.beginningDebitAmount;
            fieldB = b.beginningDebitAmount;
            break;
          case SortBy.MIDTERM_CREDIT_AMOUNT:
            fieldA = a.midtermCreditAmount;
            fieldB = b.midtermCreditAmount;
            break;
          case SortBy.MIDTERM_DEBIT_AMOUNT:
            fieldA = a.midtermDebitAmount;
            fieldB = b.midtermDebitAmount;
            break;
          case SortBy.ENDING_CREDIT_AMOUNT:
            fieldA = a.endingCreditAmount;
            fieldB = b.endingCreditAmount;
            break;
          case SortBy.ENDING_DEBIT_AMOUNT:
            fieldA = a.endingDebitAmount;
            fieldB = b.endingDebitAmount;
            break;
          default:
            fieldA = a.accountingTitle;
            fieldB = b.accountingTitle;
            break;
        }

        if (fieldA < fieldB) {
          return option.sortOrder === SortOrder.ASC ? -1 : 1;
        }
        if (fieldA > fieldB) {
          return option.sortOrder === SortOrder.ASC ? 1 : -1;
        }
        return 0; // 若相等，繼續判斷下一個排序條件
      }, 0);
    });

    // 遞迴排序 subAccounts
    items.forEach((item) => {
      if (item.subAccounts && item.subAccounts.length > 0) {
        sortTrialBalance1(item.subAccounts, sortOptions);
      }
    });
  }
  return items;
};

interface ListTrialBalanceParams {
  companyId: number;
  startDate: number;
  endDate: number;
  sortOptions?: string;
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
    sortOptions,
    page = DEFAULT_PAGE_NUMBER,
    pageSize = DEFAULT_PAGE_LIMIT,
  } = params;

  const pageNumber = page;
  let size: number | undefined;
  const skip = pageToOffset(pageNumber, pageSize);

  let trialBalancePayload: ITrialBalancePayload | null = null;

  try {
    if (pageNumber < 1) {
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    }

    /** FIXME: DEV
     * 1. 解析 sortOptions
     * 2. 將 accountForest 轉為 AccountWithSub
     *   2.1 將 voucher 的 line item 合併到 account 的 line item 裡
     * 3. 根據 startDate, endDate 計算試算表項目
     * 4. 將 trialBalance 展平，獲得 flattenTrialBalance
     * 5. 將 flattenTrialBalance 加總，獲得 total
     * 6. 將 trialBalance 排序，注意 subAccounts 也要排序，獲得 sortedTrialBalance
     * 7. 將 sortedTrialBalance 分頁，獲得 paginatedTrialBalance
     * 8. 將 total 放到 trialBalancePayload 裡
     */

    // 解析 sortOptions 使用 zodFilterSectionSortingOptions
    let sortOptionsParsed = [];
    if (sortOptions) {
      const parseResult = zodFilterSectionSortingOptions().safeParse(sortOptions);
      if (parseResult.success) {
        sortOptionsParsed = parseResult.data;
      } else {
        // TODO: 修改錯誤訊息
        throw new Error('Invalid sortOptions format');
      }
    } else {
      sortOptionsParsed = [{ sortBy: SortBy.BEGINNING_CREDIT_AMOUNT, sortOrder: SortOrder.DESC }];
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
        forUser: true,
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

    // FIXME: DEV
    // const parsedSortOptions = parseSortOptions(sortOptions);
    const parsedSortOptions = parseSortOptions(
      `sortOption=${SortBy.BEGINNING_CREDIT_AMOUNT}:${SortOrder.ASC}`

      // `sortOption=${SortBy.BEGINNING_CREDIT_AMOUNT}:${SortOrder.DESC}-${SortBy.BEGINNING_DEBIT_AMOUNT}:${SortOrder.ASC}`
    );
    const accountForest = buildAccountForestForUser(accounts);
    const accountWithSub = transformAccountForestToAccountWithSub(accountForest);
    const accountWithSubWithVoucherLineItem = addVoucherLineItemToAccount(
      accountWithSub,
      additionalLineItems
    );
    const trialBalance1 = accountWithSubWithVoucherLineItem.map((account) =>
      calculateTrialBalance1({
        startDate,
        endDate,
        account,
      })
    );
    const flattenedTrialBalance1 = flattenTrialBalance1(trialBalance1);
    const total1 = {
      beginningCreditAmount: flattenedTrialBalance1.reduce(
        (sum, item) => sum + item.beginningCreditAmount,
        0
      ),
      beginningDebitAmount: flattenedTrialBalance1.reduce(
        (sum, item) => sum + item.beginningDebitAmount,
        0
      ),
      midtermCreditAmount: flattenedTrialBalance1.reduce(
        (sum, item) => sum + item.midtermCreditAmount,
        0
      ),
      midtermDebitAmount: flattenedTrialBalance1.reduce(
        (sum, item) => sum + item.midtermDebitAmount,
        0
      ),
      endingCreditAmount: flattenedTrialBalance1.reduce(
        (sum, item) => sum + item.endingCreditAmount,
        0
      ),
      endingDebitAmount: flattenedTrialBalance1.reduce(
        (sum, item) => sum + item.endingDebitAmount,
        0
      ),
      createAt: Math.floor(Date.now() / 1000),
      updateAt: Math.floor(Date.now() / 1000),
    };
    const sortedTrialBalance1 = sortTrialBalance1(flattenedTrialBalance1, parsedSortOptions);
    // const sortedTrialBalance1 = flattenedTrialBalance1;
    const newTrialBalancePayload = {
      sortedTrialBalance1,
      total1,
    };
    console.log(
      'parsedSortOptions',
      parsedSortOptions,
      'accountsFromPrismaLength',
      accounts.length,
      'accountForestLength',
      accountForest.length,
      'accountWithSubWithVoucherLineItemLength',
      accountWithSubWithVoucherLineItem.length,
      'trialBalance1Length',
      trialBalance1.length
    );
    // 寫入 sortedTrialBalance1 到 json 檔案裡
    const DIR_NAME = 'tmp';
    const NEW_FILE_NAME = 'sortedTrialBalance1.json';
    const logDir = path.join(process.cwd(), DIR_NAME);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logPath = path.join(logDir, NEW_FILE_NAME);
    fs.writeFileSync(logPath, JSON.stringify(newTrialBalancePayload, null, 2), 'utf-8');

    // 排序需要注意 subAccount 也要排序

    // const sortedTrialBalance1 = sortTrialBalance1(flattenedTrialBalance1, parsedSortOptions);

    // const
    // gather line item

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

    // Info: (20241105 - Shirley) 根據排序選項排序試算表項目

    if (sortOptionsParsed.length > 0) {
      trialBalanceItems.sort((a, b) => {
        return sortOptionsParsed.reduce((acc, option) => {
          if (acc !== 0) return acc;

          let fieldA: number | string;
          let fieldB: number | string;

          switch (option.sortBy) {
            case SortBy.BEGINNING_CREDIT_AMOUNT:
              fieldA = a.beginningCreditAmount;
              fieldB = b.beginningCreditAmount;
              break;
            case SortBy.BEGINNING_DEBIT_AMOUNT:
              fieldA = a.beginningDebitAmount;
              fieldB = b.beginningDebitAmount;
              break;
            case SortBy.MIDTERM_CREDIT_AMOUNT:
              fieldA = a.midtermCreditAmount;
              fieldB = b.midtermCreditAmount;
              break;
            case SortBy.MIDTERM_DEBIT_AMOUNT:
              fieldA = a.midtermDebitAmount;
              fieldB = b.midtermDebitAmount;
              break;
            case SortBy.ENDING_CREDIT_AMOUNT:
              fieldA = a.endingCreditAmount;
              fieldB = b.endingCreditAmount;
              break;
            case SortBy.ENDING_DEBIT_AMOUNT:
              fieldA = a.endingDebitAmount;
              fieldB = b.endingDebitAmount;
              break;
            default:
              fieldA = a.accountingTitle;
              fieldB = b.accountingTitle;
              break;
          }

          if (fieldA < fieldB) {
            return option.sortOrder === SortOrder.ASC ? -1 : 1;
          }
          if (fieldA > fieldB) {
            return option.sortOrder === SortOrder.ASC ? 1 : -1;
          }
          return 0; // 若相等，繼續判斷下一個排序條件
        }, 0);
      });
    }

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

    // eslint-disable-next-line no-console
    console.log('flatItemsLength in trialBalanceRepo', flatItems.length);

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

    paginatedData = trialBalanceItems.slice(skip, skip + (size || DEFAULT_PAGE_LIMIT));
    totalCount = trialBalanceItems.length;
    totalPages = Math.ceil(totalCount / (size || DEFAULT_PAGE_LIMIT));
    hasNextPage = skip + (size || DEFAULT_PAGE_LIMIT) < totalCount;
    hasPreviousPage = pageNumber > 1;

    // const sort = [{ sortBy, sortOrder }];
    // 修改排序部分
    const sort = sortOptionsParsed.map((option) => ({
      sortBy: option.sortBy,
      sortOrder: option.sortOrder,
    }));

    // eslint-disable-next-line no-console
    // console.log('sort in trial_balance_repo', sort);

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
        pageSize,
        hasNextPage,
        hasPreviousPage,
        sort,
      },
      total,
    };

    const NEW_FILE_NAME2 = 'beforeRefactorTrialBalance1.json';
    const logDir2 = path.join(process.cwd(), DIR_NAME);
    if (!fs.existsSync(logDir2)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logPath2 = path.join(logDir2, NEW_FILE_NAME2);
    fs.writeFileSync(logPath2, JSON.stringify(trialBalancePayload, null, 2), 'utf-8');
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
