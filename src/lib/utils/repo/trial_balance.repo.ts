/* eslint-disable */
import prisma from '@/client';
import { pageToOffset } from '@/lib/utils/common';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { DEFAULT_PAGE_NUMBER } from '@/constants/display';
import { SortOrder, SortBy } from '@/constants/sort';
import { loggerError } from '@/lib/utils/logger_back';
import { ITrialBalancePayload } from '@/interfaces/trial_balance';
import { PUBLIC_COMPANY_ID } from '@/constants/company';
import { STATUS_MESSAGE } from '@/constants/status_code';
import {
  buildAccountForestForUser,
  transformLineItemsFromDBToMap,
  updateAccountAmountsForTrialBalance,
} from '@/lib/utils/account/common';
import { IAccountNode } from '@/interfaces/accounting_account';
import fs from 'fs';
import path from 'path';
import { zodFilterSectionSortingOptions } from '@/lib/utils/zod_schema/common';

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

const DEFAULT_SORT_OPTIONS = [
  { sortBy: SortBy.BEGINNING_CREDIT_AMOUNT, sortOrder: SortOrder.DESC },
];

function parseSortOption(sortOption: string | undefined): {
  sortBy: SortBy;
  sortOrder: SortOrder;
}[] {
  try {
    if (!sortOption) {
      return DEFAULT_SORT_OPTIONS;
    }

    const optionsString = sortOption.startsWith('sortOption=')
      ? sortOption.substring('sortOption='.length)
      : sortOption;

    const parseResult = zodFilterSectionSortingOptions().safeParse(optionsString);
    if (!parseResult.success) {
      return DEFAULT_SORT_OPTIONS;
    }
    const sortOptionParsed = parseResult.data;
    return sortOptionParsed;
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

function calculateTrialBalance({
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

  const endingCreditAmount = beginningCreditAmount + midtermCreditAmount;
  const endingDebitAmount = beginningDebitAmount + midtermDebitAmount;

  const subAccounts = account.subAccounts.map((subAccount) =>
    calculateTrialBalance({ startDate, endDate, account: subAccount })
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

/**
 * 將期初和期中帳戶樹合併，並計算期末的借方和貸方金額
 * @param beginningForest 期初的帳戶樹
 * @param midtermForest 期中的帳戶樹
 * @returns 合併後的試算平衡結果
 */
function combineAccountForests(
  beginningForest: IAccountNode[],
  midtermForest: IAccountNode[]
): AccountWithSubResult1[] {
  const mergedResult: AccountWithSubResult1[] = [];

  // 建立期中帳戶的映射，以便快速查找
  const midtermMap = new Map<string, IAccountNode>();
  midtermForest.forEach((account) => {
    midtermMap.set(account.code, account);
  });

  beginningForest.forEach((beginAcc) => {
    const midAcc = midtermMap.get(beginAcc.code);
    if (midAcc) {
      // 根據 debit 屬性分類金額
      const beginningCreditAmount = beginAcc.debit ? 0 : beginAcc.amount;
      const beginningDebitAmount = beginAcc.debit ? beginAcc.amount : 0;

      const midtermCreditAmount = midAcc.debit ? 0 : midAcc.amount;
      const midtermDebitAmount = midAcc.debit ? midAcc.amount : 0;

      const endingCreditAmount = beginningCreditAmount + midtermCreditAmount;
      const endingDebitAmount = beginningDebitAmount + midtermDebitAmount;

      // 遞迴處理子科目
      const subAccounts = combineAccountForests(beginAcc.children, midAcc.children);

      mergedResult.push({
        id: beginAcc.id,
        no: beginAcc.code,
        accountingTitle: beginAcc.name,
        beginningCreditAmount, // 根據 debit 分類后的期初貸方金額
        beginningDebitAmount, // 根據 debit 分類后的期初借方金額
        midtermCreditAmount, // 根據 debit 分類后的期中貸方金額
        midtermDebitAmount, // 根據 debit 分類后的期中借方金額
        endingCreditAmount, // 期末貸方金額
        endingDebitAmount, // 期末借方金額
        subAccounts,
        createAt: 0,
        updateAt: 0,
        parentCode: beginAcc.parentCode,
      });
    } else {
      // 若期中沒有對應的科目，僅使用期初數據並根據 debit 分類
      const beginningCreditAmount = beginAcc.debit ? 0 : beginAcc.amount;
      const beginningDebitAmount = beginAcc.debit ? beginAcc.amount : 0;

      mergedResult.push({
        id: beginAcc.id,
        no: beginAcc.code,
        accountingTitle: beginAcc.name,
        beginningCreditAmount,
        beginningDebitAmount,
        midtermCreditAmount: 0,
        midtermDebitAmount: 0,
        endingCreditAmount: beginningCreditAmount,
        endingDebitAmount: beginningDebitAmount,
        subAccounts: combineAccountForests(beginAcc.children, []),
        createAt: 0,
        updateAt: 0,
        parentCode: beginAcc.parentCode,
      });
    }
  });

  // 處理期中有但期初沒有的科目，並根據 debit 分類
  midtermForest.forEach((midAcc) => {
    const found = beginningForest.find((beginAcc) => beginAcc.code === midAcc.code);
    if (!found) {
      const midtermCreditAmount = midAcc.debit ? 0 : midAcc.amount;
      const midtermDebitAmount = midAcc.debit ? midAcc.amount : 0;

      mergedResult.push({
        id: midAcc.id,
        no: midAcc.code,
        accountingTitle: midAcc.name,
        beginningCreditAmount: 0,
        beginningDebitAmount: 0,
        midtermCreditAmount,
        midtermDebitAmount,
        endingCreditAmount: midtermCreditAmount,
        endingDebitAmount: midtermDebitAmount,
        subAccounts: combineAccountForests([], midAcc.children),
        createAt: 0,
        updateAt: 0,
        parentCode: midAcc.parentCode,
      });
    }
  });

  return mergedResult;
}
// function combineAccountForests(
//   beginningForest: IAccountNode[],
//   midtermForest: IAccountNode[]
// ): AccountWithSubResult1[] {
//   const mergedResult: AccountWithSubResult1[] = [];

//   // 建立期中帳戶的映射，以便快速查找
//   const midtermMap = new Map<string, IAccountNode>();
//   midtermForest.forEach((account) => {
//     midtermMap.set(account.code, account);
//   });

//   beginningForest.forEach((beginAcc) => {
//     const midAcc = midtermMap.get(beginAcc.code);
//     if (midAcc) {
//       // 計算期末金額
//       const endingCreditAmount = beginAcc.amount + midAcc.amount;
//       const endingDebitAmount = beginAcc.amount + midAcc.amount; // 根據需求，這裡兩者相加，請確認是否為筆誤

//       // 遞迴處理子科目
//       const subAccounts = combineAccountForests(beginAcc.children, midAcc.children);

//       mergedResult.push({
//         id: beginAcc.id,
//         no: beginAcc.code,
//         accountingTitle: beginAcc.name,
//         beginningCreditAmount: beginAcc.amount, // 假設期初金額存於 amount
//         beginningDebitAmount: beginAcc.amount, // 根據需求，這裡兩者相同，請確認是否為筆誤
//         midtermCreditAmount: midAcc.amount,
//         midtermDebitAmount: midAcc.amount,
//         endingCreditAmount,
//         endingDebitAmount,
//         subAccounts,
//         createAt: 0,
//         updateAt: 0,
//         parentCode: beginAcc.parentCode,
//       });
//     } else {
//       // 若期中沒有對應的科目，僅使用期初數據
//       mergedResult.push({
//         id: beginAcc.id,
//         no: beginAcc.code,
//         accountingTitle: beginAcc.name,
//         beginningCreditAmount: beginAcc.amount,
//         beginningDebitAmount: beginAcc.amount,
//         midtermCreditAmount: 0,
//         midtermDebitAmount: 0,
//         endingCreditAmount: beginAcc.amount,
//         endingDebitAmount: beginAcc.amount,
//         subAccounts: combineAccountForests(beginAcc.children, []),
//         createAt: 0,
//         updateAt: 0,
//         parentCode: beginAcc.parentCode,
//       });
//     }
//   });

//   // 處理期中有但期初沒有的科目
//   midtermForest.forEach((midAcc) => {
//     const found = beginningForest.find((beginAcc) => beginAcc.code === midAcc.code);
//     if (!found) {
//       mergedResult.push({
//         id: midAcc.id,
//         no: midAcc.code,
//         accountingTitle: midAcc.name,
//         beginningCreditAmount: 0,
//         beginningDebitAmount: 0,
//         midtermCreditAmount: midAcc.amount,
//         midtermDebitAmount: midAcc.amount,
//         endingCreditAmount: midAcc.amount,
//         endingDebitAmount: midAcc.amount,
//         subAccounts: combineAccountForests([], midAcc.children),
//         createAt: 0,
//         updateAt: 0,
//         parentCode: midAcc.parentCode,
//       });
//     }
//   });

//   return mergedResult;
// }

const flattenTrialBalance = (items: AccountWithSubResult1[]): AccountWithSubResult1[] => {
  let flat: AccountWithSubResult1[] = [];
  items.forEach((item) => {
    flat.push(item);
    if (item.subAccounts && item.subAccounts.length > 0) {
      flat = flat.concat(flattenTrialBalance(item.subAccounts));
    }
  });
  return flat;
};

const sortTrialBalance = (
  items: AccountWithSubResult1[],
  sortOption: {
    sortBy: SortBy;
    sortOrder: SortOrder;
  }[]
): AccountWithSubResult1[] => {
  if (sortOption.length > 0) {
    items.sort((a, b) => {
      return sortOption.reduce((acc, option) => {
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
        sortTrialBalance(item.subAccounts, sortOption);
      }
    });
  }
  return items;
};

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
  let size: number | undefined;
  const skip = pageToOffset(pageNumber, pageSize);

  let trialBalancePayload: ITrialBalancePayload | null = null;

  try {
    if (pageNumber < 1) {
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    }

    // 解析 sortOption
    const parsedSortOption = parseSortOption(sortOption);

    // 1. 搜尋 accounting setting table 取得貨幣別
    const accountingSettingData = await prisma.accountingSetting.findFirst({
      where: { companyId },
    });

    let currencyAlias = 'TWD';

    if (accountingSettingData) {
      currencyAlias = accountingSettingData.currency || 'TWD';
    }

    // 2. 用 public company id & my company id 搜尋 account table 取得所有會計科目
    const accounts = await prisma.account.findMany({
      where: {
        OR: [
          { companyId, deletedAt: null },
          { companyId: PUBLIC_COMPANY_ID, deletedAt: null },
        ],
        forUser: true,
      },
    });

    // 3. 用 companyId 搜尋 voucher table 取得所有憑證
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

    console.log('allVoucherIds', allVoucherIds);

    // 4. 用憑證 id 搜尋 line item table 取得所有憑證對應的 line item
    const lineItems = await prisma.lineItem.findMany({
      where: {
        voucherId: { in: allVoucherIds },
        deletedAt: null,
        createdAt: {
          // gte: startDate,
          lte: endDate,
        },
      },
      include: {
        voucher: true,
        account: true,
      },
    });

    const accountsWithLineItemProperties = accounts.map((account) => ({
      ...account,
      lineItem: [] as LineItem[],
    }));

    // 合併 account 表中的 line items 與 voucher 表中的 line items
    accountsWithLineItemProperties.forEach((account) => {
      const voucherLineItems = lineItems.filter((item) => item.accountId === account.id);
      account.lineItem.push(...voucherLineItems);
    });

    // 2.1 整理 account 資料結構，依照 parent code 追溯
    const accountMap: { [key: string]: AccountWithSub } = {};
    accountsWithLineItemProperties.forEach((account) => {
      accountMap[account.code] = {
        ...account,
        subAccounts: [],
      };
    });

    /**
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
    const accountForest = buildAccountForestForUser(accountsWithLineItemProperties);
    const accountWithSub = transformAccountForestToAccountWithSub(accountForest);
    const accountWithSubWithVoucherLineItem = addVoucherLineItemToAccount(
      accountWithSub,
      lineItems
    );

    // FIXME: 將樹狀結構的 account 更新 amount
    // separate lineItemsMap by startDate
    const beginningLineItems = lineItems.filter((item) => item.voucher.date < startDate);
    const midtermLineItems = lineItems.filter(
      (item) => item.voucher.date >= startDate && item.voucher.date <= endDate
    );
    /* eslint-disable */
    console.log('beginningLineItems', beginningLineItems);
    console.log('midtermLineItems', midtermLineItems);

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
    /*
    const lineItemsMap = transformLineItemsFromDBToMap(lineItems);
    const updatedForest = updateAccountAmountsForTrialBalance(accountForest, lineItemsMap);
    */
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

    const tempResultFromTree = {
      data: sortedTrialBalanceFromTree,
      total: totalFromTree,
    };

    const DIR_NAME = 'tmp';
    const NEW_FILE_NAME = 'beginningAccountForest.json';
    const logDir = path.join(process.cwd(), DIR_NAME);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logPath = path.join(logDir, NEW_FILE_NAME);
    fs.writeFileSync(logPath, JSON.stringify(beginningAccountForest, null, 2), 'utf-8');

    const NEW_FILE_NAME_2 = 'midtermAccountForest.json';
    const logPath2 = path.join(logDir, NEW_FILE_NAME_2);
    fs.writeFileSync(logPath2, JSON.stringify(midtermAccountForest, null, 2), 'utf-8');

    const NEW_FILE_NAME_3 = 'trialBalanceResultFromTree.json';
    const logPath3 = path.join(logDir, NEW_FILE_NAME_3);
    fs.writeFileSync(logPath3, JSON.stringify(trialBalanceAccountsFromTree, null, 2), 'utf-8');

    const NEW_FILE_NAME_5 = 'flattenTrialBalanceFromTree.json';
    const logPath5 = path.join(logDir, NEW_FILE_NAME_5);
    fs.writeFileSync(logPath5, JSON.stringify(flattenTrialBalanceFromTree, null, 2), 'utf-8');

    const NEW_FILE_NAME_6 = 'tempResultFromTree.json';
    const logPath6 = path.join(logDir, NEW_FILE_NAME_6);
    fs.writeFileSync(logPath6, JSON.stringify(tempResultFromTree, null, 2), 'utf-8');

    // FIXME:----
    // const trialBalance1 = accountWithSubWithVoucherLineItem
    //   .filter((account) => account.lineItem.length > 0)
    //   .map((account) =>
    //     calculateTrialBalance({
    //       startDate,
    //       endDate,
    //       account,
    //     })
    //   );

    // const flattenedTrialBalance1 = flattenTrialBalance(trialBalance1 as AccountWithSubResult1[]);
    // const total1 = {
    //   beginningCreditAmount: flattenedTrialBalance1.reduce(
    //     (sum, item) => sum + item.beginningCreditAmount,
    //     0
    //   ),
    //   beginningDebitAmount: flattenedTrialBalance1.reduce(
    //     (sum, item) => sum + item.beginningDebitAmount,
    //     0
    //   ),
    //   midtermCreditAmount: flattenedTrialBalance1.reduce(
    //     (sum, item) => sum + item.midtermCreditAmount,
    //     0
    //   ),
    //   midtermDebitAmount: flattenedTrialBalance1.reduce(
    //     (sum, item) => sum + item.midtermDebitAmount,
    //     0
    //   ),
    //   endingCreditAmount: flattenedTrialBalance1.reduce(
    //     (sum, item) => sum + item.endingCreditAmount,
    //     0
    //   ),
    //   endingDebitAmount: flattenedTrialBalance1.reduce(
    //     (sum, item) => sum + item.endingDebitAmount,
    //     0
    //   ),
    //   createAt: Math.floor(Date.now() / 1000),
    //   updateAt: Math.floor(Date.now() / 1000),
    // };
    // const sortedTrialBalance1 = sortTrialBalance(flattenedTrialBalance1, parsedSortOption);

    let paginatedData = sortedTrialBalanceFromTree;
    let totalCount = sortedTrialBalanceFromTree.length;
    let totalPages = 1;
    let hasNextPage = false;
    let hasPreviousPage = false;

    paginatedData = sortedTrialBalanceFromTree.slice(skip, skip + (size || DEFAULT_PAGE_LIMIT));
    totalCount = sortedTrialBalanceFromTree.length;
    totalPages = Math.ceil(totalCount / (size || DEFAULT_PAGE_LIMIT));
    hasNextPage = skip + (size || DEFAULT_PAGE_LIMIT) < totalCount;
    hasPreviousPage = pageNumber > 1;

    trialBalancePayload = {
      currencyAlias,
      items: {
        data: paginatedData,
        page: pageNumber,
        totalPages,
        totalCount,
        pageSize,
        hasNextPage,
        hasPreviousPage,
        sort: parsedSortOption,
      },
      total: totalFromTree,
    };

    const NEW_FILE_NAME_4 = 'trialBalancePayload.json';
    const logPath4 = path.join(logDir, NEW_FILE_NAME_4);
    fs.writeFileSync(logPath4, JSON.stringify(trialBalancePayload, null, 2), 'utf-8');
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
