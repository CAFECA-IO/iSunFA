import { IAccountNodeWithDebitAndCredit } from '@/interfaces/accounting_account';
import { SortBy, SortOrder } from '@/constants/sort';
import { Prisma, Account } from '@prisma/client';
import { ILineItemSimpleAccountVoucher } from '@/interfaces/line_item';
import {
  ILineItemInTrialBalanceItem,
  ILineItemInTrialBalanceItemWithHierarchy,
  IMergedAccounts,
  ITrialBalancePayload,
  ITrialBalanceTotal,
  TrialBalanceItem,
} from '@/interfaces/trial_balance';
import { DecimalOperations } from '@/lib/utils/decimal_operations';

export function sortTrialBalanceItem(
  items: TrialBalanceItem[],
  sortOption: {
    sortBy: SortBy;
    sortOrder: SortOrder;
  }[]
): TrialBalanceItem[] {
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

        // Info: (20250820 - Shirley) Use decimal comparison for amount fields
        if (typeof fieldA === 'string' && typeof fieldB === 'string') {
          const compareResult = DecimalOperations.compare(fieldA, fieldB);
          if (compareResult !== 0) {
            return option.sortOrder === SortOrder.ASC ? compareResult : -compareResult;
          }
        } else {
          if (fieldA < fieldB) {
            return option.sortOrder === SortOrder.ASC ? -1 : 1;
          }
          if (fieldA > fieldB) {
            return option.sortOrder === SortOrder.ASC ? 1 : -1;
          }
        }
        return 0; // Info: (20241118 - Shirley) 若相等，繼續判斷下一個排序條件
      }, 0);
    });

    // Info: (20241118 - Shirley) 遞迴排序 subAccounts
    items.forEach((item) => {
      if (item.subAccounts && item.subAccounts.length > 0) {
        sortTrialBalanceItem(item.subAccounts, sortOption);
      }
    });
  }
  return items;
}

const calculateTotal = (items: TrialBalanceItem[]): ITrialBalanceTotal => {
  const result = items.reduce(
    (total, item) => ({
      beginningCreditAmount: DecimalOperations.add(total.beginningCreditAmount, item.beginningCreditAmount),
      beginningDebitAmount: DecimalOperations.add(total.beginningDebitAmount, item.beginningDebitAmount),
      midtermCreditAmount: DecimalOperations.add(total.midtermCreditAmount, item.midtermCreditAmount),
      midtermDebitAmount: DecimalOperations.add(total.midtermDebitAmount, item.midtermDebitAmount),
      endingCreditAmount: DecimalOperations.add(total.endingCreditAmount, item.endingCreditAmount),
      endingDebitAmount: DecimalOperations.add(total.endingDebitAmount, item.endingDebitAmount),
      createAt: 0,
      updateAt: 0,
    }),
    {
      beginningCreditAmount: '0',
      beginningDebitAmount: '0',
      midtermCreditAmount: '0',
      midtermDebitAmount: '0',
      endingCreditAmount: '0',
      endingDebitAmount: '0',
      createAt: 0,
      updateAt: 0,
    }
  );

  return result;
};

const filterZeroAmounts = (items: TrialBalanceItem[]): TrialBalanceItem[] => {
  const result = items.filter((item) => {
    const hasNonZeroAmount =
      !DecimalOperations.isZero(item.beginningCreditAmount) ||
      !DecimalOperations.isZero(item.beginningDebitAmount) ||
      !DecimalOperations.isZero(item.midtermCreditAmount) ||
      !DecimalOperations.isZero(item.midtermDebitAmount) ||
      !DecimalOperations.isZero(item.endingCreditAmount) ||
      !DecimalOperations.isZero(item.endingDebitAmount);

    const filteredSubAccounts =
      item.subAccounts?.length > 0 ? filterZeroAmounts(item.subAccounts) : [];

    // Info: (20241129 - Shirley) 如果自身有非零金額或有非空的子項目，則保留
    return hasNonZeroAmount || filteredSubAccounts.length > 0
      ? {
          ...item,
          subAccounts: filteredSubAccounts,
        }
      : false;
  }) as TrialBalanceItem[];

  return result;
};

/* Info: (20241130 - Shirley)
 * 將排序後的試算表項目轉換為 ITrialBalancePayload 格式
 * @param sortedItems 排序後的試算表項目
 * @returns ITrialBalancePayload 格式的資料
 */
export function convertToTrialBalanceData(sortedItems: TrialBalanceItem[]): ITrialBalancePayload {
  const filteredItems = filterZeroAmounts(sortedItems);
  const total = calculateTotal(filteredItems);

  return {
    data: filteredItems,
    page: 1,
    totalPages: 1,
    totalCount: filteredItems.length,
    pageSize: filteredItems.length,
    hasNextPage: false,
    hasPreviousPage: false,
    sort: [],
    note: JSON.stringify({ total }),
  };
}

export const convertTrialBalanceDataToCsvData = (trialBalanceData: ITrialBalancePayload) => {
  const csvData = trialBalanceData.data.map((item) => {
    return {
      accountingTitle: item.accountingTitle,
    };
  });
  return csvData;
};

export function transformTrialBalanceData(
  items: TrialBalanceItem[]
): Record<string, string | number>[] {
  const data = items.map((item) => {
    return {
      no: item.no,
      accountingTitle: item.accountingTitle,
      beginningDebitAmount: item.beginningDebitAmount,
      beginningCreditAmount: item.beginningCreditAmount,
      midtermDebitAmount: item.midtermDebitAmount,
      midtermCreditAmount: item.midtermCreditAmount,
      endingDebitAmount: item.endingDebitAmount,
      endingCreditAmount: item.endingCreditAmount,
    };
  });
  return data;
}

/* Info: (20241230 - Shirley)
 * 取得當前401申報週期的期初和期末時間點
 */
export function getCurrent401Period(): {
  periodBegin: number;
  periodEnd: number;
} {
  const currentDate = new Date();
  const month = currentDate.getMonth() + 1; // Info: (20250107 - Shirley) 月份從0開始
  const year = currentDate.getFullYear();

  let periodStartMonth: number;
  let periodEndMonth: number;

  if (month <= 2) {
    periodStartMonth = 1;
    periodEndMonth = 2;
  } else if (month <= 4) {
    periodStartMonth = 3;
    periodEndMonth = 4;
  } else if (month <= 6) {
    periodStartMonth = 5;
    periodEndMonth = 6;
  } else if (month <= 8) {
    periodStartMonth = 7;
    periodEndMonth = 8;
  } else if (month <= 10) {
    periodStartMonth = 9;
    periodEndMonth = 10;
  } else {
    periodStartMonth = 11;
    periodEndMonth = 12;
  }

  const periodBegin = new Date(year, periodStartMonth - 1, 1).getTime() / 1000;
  const periodEndDate = new Date(year, periodEndMonth, 0); // Info: (20250107 - Shirley) 該月的最後一天
  const periodEnd =
    new Date(
      periodEndDate.getFullYear(),
      periodEndDate.getMonth(),
      periodEndDate.getDate(),
      23,
      59,
      59
    ).getTime() / 1000;

  return { periodBegin, periodEnd };
}

/* Info: (20250107 - Shirley)
 * 合併會計分錄，將相同科目的借方和貸方金額加總
 * @param lineItems 會計分錄列表
 * @returns 合併後的試算表項目
 */
export function mergeLineItems(
  lineItems: ILineItemSimpleAccountVoucher[]
): ILineItemInTrialBalanceItem[] {
  const map: { [key: number]: ILineItemInTrialBalanceItem } = {};

  lineItems.forEach((item) => {
    if (!map[item.accountId]) {
      const itemAmount =
        typeof item.amount === 'string' ? item.amount : item.amount.toString();
      map[item.accountId] = {
        ...item,
        debitAmount: item.debit ? itemAmount : '0',
        creditAmount: !item.debit ? itemAmount : '0',
      };
    } else {
      const itemAmount =
        typeof item.amount === 'string' ? item.amount : item.amount.toString();
      map[item.accountId].debitAmount = item.debit 
        ? DecimalOperations.add(map[item.accountId].debitAmount, itemAmount)
        : map[item.accountId].debitAmount;
      map[item.accountId].creditAmount = !item.debit 
        ? DecimalOperations.add(map[item.accountId].creditAmount, itemAmount)
        : map[item.accountId].creditAmount;
    }
  });

  return Object.values(map);
}

/* Info: (20250102 - Shirley)
 * 將會計分錄依照會計科目合併跟加總
 * @param lineItems 會計分錄列表
 * @returns 合併後的會計分錄
 */
export function mergeLineItemsByAccount(
  lineItems: ILineItemInTrialBalanceItem[]
): ILineItemInTrialBalanceItem[] {
  // Info: (20250102 - Shirley) 使用 Map 來儲存每個 accountId 的合計金額
  const accountSummary = new Map<number, IMergedAccounts>();

  // Info: (20250102 - Shirley) 遍歷所有分錄並加總
  lineItems.forEach((item) => {
    const existingSummary = accountSummary.get(item.accountId);

    if (existingSummary) {
      // Info: (20250102 - Shirley) 如果該科目已存在，則加總金額
      const itemAmount =
        typeof item.amount === 'string' ? item.amount : item.amount.toString();
      if (item.debit) {
        existingSummary.debitAmount = DecimalOperations.add(existingSummary.debitAmount, itemAmount);
      } else {
        existingSummary.creditAmount = DecimalOperations.add(existingSummary.creditAmount, itemAmount);
      }
    } else {
      // Info: (20250102 - Shirley) 如果該科目不存在，則建立新的紀錄
      const itemAmount =
        typeof item.amount === 'string' ? item.amount : item.amount.toString();
      accountSummary.set(item.accountId, {
        ...item,
        // accountId: item.accountId,
        debitAmount: item.debit ? itemAmount : '0',
        creditAmount: !item.debit ? itemAmount : '0',
        accountCode: item.account.code,
        accountName: item.account.name,
        // debit: item.debit,
        // amount: item.amount,
        // account: item.account,
      });
    }
  });

  // Info: (20250102 - Shirley) 將 Map 轉換為陣列並返回
  return Array.from(accountSummary.values()).map((summary) => ({
    accountId: summary.accountId,
    accountCode: summary.accountCode,
    accountName: summary.accountName,
    debitAmount: summary.debitAmount,
    creditAmount: summary.creditAmount,
    amount: summary.amount,
    debit: summary.debit,
    account: {
      id: summary.accountId,
      code: summary.accountCode,
      name: summary.accountName,
      parentId: summary.account.parentId,
    },
    voucher: {
      id: 0,
      date: 0,
      type: '',
      no: '',
    },
    id: 0,
    createdAt: 0,
    updatedAt: 0,
    deletedAt: null,
    description: '',
    voucherId: 0,
  }));
}

/* Info: (20250102 - Shirley)
 * 將會計分錄依據時間區間分類並合併
 * @param lineItems 會計分錄列表
 * @param periodBegin 期初時間
 * @param periodEnd 期末時間
 * @returns 分類後的會計分錄
 */
export function categorizeAndMergeLineItems(
  lineItems: ILineItemInTrialBalanceItem[],
  periodBegin: number,
  periodEnd: number
) {
  // Info: (20250102 - Shirley) 分類會計分錄
  const beginningItems: ILineItemInTrialBalanceItem[] = [];
  const midtermItems: ILineItemInTrialBalanceItem[] = [];

  lineItems.forEach((item) => {
    if (item.voucher.date < periodBegin) {
      beginningItems.push(item);
    } else if (item.voucher.date <= periodEnd) {
      midtermItems.push(item);
    }
  });

  // Info: (20250102 - Shirley) 合併各時期的會計分錄
  const beginningMerged = mergeLineItemsByAccount(beginningItems);
  const midtermMerged = mergeLineItemsByAccount(midtermItems);

  return {
    beginning: beginningMerged,
    midterm: midtermMerged,
  };
}

/* Info: (20250102 - Shirley)
 * 計算期末餘額
 * @param beginning 期初餘額
 * @param midterm 本期發生額
 * @returns 期末餘額
 */
export function calculateEndingBalance(
  beginning: ILineItemInTrialBalanceItem[],
  midterm: ILineItemInTrialBalanceItem[]
): ILineItemInTrialBalanceItem[] {
  const endingMap = new Map<number, ILineItemInTrialBalanceItem>();

  // Info: (20250102 - Shirley) 處理期初餘額
  beginning.forEach((item) => {
    endingMap.set(item.accountId, {
      ...item,
      debitAmount: item.debitAmount,
      creditAmount: item.creditAmount,
    });
  });

  // Info: (20250102 - Shirley) 加入本期發生額
  midterm.forEach((item) => {
    const existingItem = endingMap.get(item.accountId);
    if (existingItem) {
      existingItem.debitAmount = DecimalOperations.add(existingItem.debitAmount, item.debitAmount);
      existingItem.creditAmount = DecimalOperations.add(existingItem.creditAmount, item.creditAmount);
      const debitCredit = DecimalOperations.subtract(existingItem.debitAmount, existingItem.creditAmount);
      existingItem.amount = new Prisma.Decimal(DecimalOperations.abs(debitCredit));
      existingItem.debit = DecimalOperations.isGreaterThan(existingItem.debitAmount, existingItem.creditAmount);
    } else {
      endingMap.set(item.accountId, item);
    }
  });

  return Array.from(endingMap.values());
}

/* Info: (20250102 - Shirley)
 * 將會計分錄轉換為試算表格式
 * @param lineItems 會計分錄列表
 * @param periodBegin 期初時間
 * @param periodEnd 期末時間
 * @returns 試算表格式的資料
 */
export function convertToTrialBalanceItem(
  lineItems: ILineItemInTrialBalanceItem[],
  periodBegin: number,
  periodEnd: number
): {
  beginning: ILineItemInTrialBalanceItem[];
  midterm: ILineItemInTrialBalanceItem[];
  ending: ILineItemInTrialBalanceItem[];
} {
  // Info: (20250102 - Shirley) 分類並合併會計分錄
  const { beginning, midterm } = categorizeAndMergeLineItems(lineItems, periodBegin, periodEnd);

  // Info: (20250102 - Shirley) 計算期末餘額
  const ending = calculateEndingBalance(beginning, midterm);

  // Info: (20250102 - Shirley) 篩選掉借貸方金額都為 0 的科目
  const filteredEnding = ending.filter((item) => !DecimalOperations.isZero(item.debitAmount) || !DecimalOperations.isZero(item.creditAmount));

  return {
    beginning,
    midterm,
    ending: filteredEnding,
  };
}

/* Info: (20250102 - Shirley)
 * 將用來計算的試算表格式轉換為 API 格式
 * @param lineItems 試算表格式資料
 * @returns API 格式資料
 */
export function convertLineItemsToTrialBalanceAPIFormat(lineItems: {
  beginning: ILineItemInTrialBalanceItem[];
  midterm: ILineItemInTrialBalanceItem[];
  ending: ILineItemInTrialBalanceItem[];
}): ITrialBalancePayload {
  // Info: (20250102 - Shirley) 計算總額
  const total = {
    beginningCreditAmount: DecimalOperations.sum(lineItems.beginning.map(item => item.creditAmount)),
    beginningDebitAmount: DecimalOperations.sum(lineItems.beginning.map(item => item.debitAmount)),
    midtermCreditAmount: DecimalOperations.sum(lineItems.midterm.map(item => item.creditAmount)),
    midtermDebitAmount: DecimalOperations.sum(lineItems.midterm.map(item => item.debitAmount)),
    endingCreditAmount: DecimalOperations.sum(lineItems.ending.map(item => item.creditAmount)),
    endingDebitAmount: DecimalOperations.sum(lineItems.ending.map(item => item.debitAmount)),
    createAt: Math.floor(Date.now() / 1000),
    updateAt: Math.floor(Date.now() / 1000),
  };

  // Info: (20250102 - Shirley) 將 ILineItemInTrialBalanceItem[] 轉換為 TrialBalanceItem[]
  const items: TrialBalanceItem[] = lineItems.ending.map((item) => ({
    id: item.accountId,
    no: item.account.code,
    accountingTitle: item.account.name,
    beginningCreditAmount:
      lineItems.beginning.find((b) => b.accountId === item.accountId)?.creditAmount || '0',
    beginningDebitAmount:
      lineItems.beginning.find((b) => b.accountId === item.accountId)?.debitAmount || '0',
    midtermCreditAmount:
      lineItems.midterm.find((m) => m.accountId === item.accountId)?.creditAmount || '0',
    midtermDebitAmount:
      lineItems.midterm.find((m) => m.accountId === item.accountId)?.debitAmount || '0',
    endingCreditAmount: item.creditAmount,
    endingDebitAmount: item.debitAmount,
    createAt: item.createdAt,
    updateAt: item.updatedAt,
    subAccounts: [],
  }));

  return {
    data: items,
    page: 1,
    totalPages: 1,
    totalCount: items.length,
    pageSize: items.length,
    hasNextPage: false,
    hasPreviousPage: false,
    sort: [],
    note: JSON.stringify({ total }),
  };
}

// Info: (20250102 - Shirley) 根據 accountId 將金額累加到帳戶樹中
export const aggregateAmounts = (
  accountsWithDebitAndCredit: IAccountNodeWithDebitAndCredit[],
  lineItemsForCal: ILineItemInTrialBalanceItem[]
): IAccountNodeWithDebitAndCredit[] => {
  const rs = accountsWithDebitAndCredit.map((account) => {
    // Info: (20250106 - Shirley) 處理子科目
    const updatedChildren = aggregateAmounts(account.children, lineItemsForCal);

    // Info: (20250106 - Shirley) 計算當前帳戶的 debitAmount 和 creditAmount
    // Info: (20250106 - Shirley) 如果有 children 的話，此科目的 debitAmount 跟 creditAmount 單純為 children 的 debitAmount 跟 creditAmount 加總
    let currentDebit = '0';
    let currentCredit = '0';
    if (account.children.length > 0) {
      currentDebit = DecimalOperations.sum(updatedChildren.map(child => child.debitAmount.toString()));
      currentCredit = DecimalOperations.sum(updatedChildren.map(child => child.creditAmount.toString()));
    } else {
      const currentLineItems = lineItemsForCal.filter((item) => item.accountId === account.id);
      currentDebit = DecimalOperations.sum(currentLineItems.map(item => item.debitAmount));
      currentCredit = DecimalOperations.sum(currentLineItems.map(item => item.creditAmount));
    }

    return {
      ...account,
      debitAmount: parseFloat(currentDebit),
      creditAmount: parseFloat(currentCredit),
      children: updatedChildren,
    };
  });

  return rs;
};

/* Info: (20250102 - Shirley)
 * 將會計分錄依據從屬關係分類
 * @param array 會計分錄列表
 * @param period 期間類型
 * @returns 分類後的會計分錄
 */
export function processLineItems(
  data: ILineItemInTrialBalanceItem[],
  accounts: Account[]
): {
  arrWithChildren: ILineItemInTrialBalanceItemWithHierarchy[];
  arrWithCopySelf: ILineItemInTrialBalanceItemWithHierarchy[];
} {
  const array = [...data];
  const arrWithChildren: ILineItemInTrialBalanceItemWithHierarchy[] = [];
  const arrWithCopySelf: ILineItemInTrialBalanceItemWithHierarchy[] = [];

  // Info: (20250217 - Shirley) 第一步：建立科目金額的映射
  const accountAmounts = new Map<number, { debitAmount: string; creditAmount: string }>();
  array.forEach((item) => {
    const existing = accountAmounts.get(item.accountId) || { debitAmount: '0', creditAmount: '0' };
    accountAmounts.set(item.accountId, {
      debitAmount: DecimalOperations.add(existing.debitAmount, item.debitAmount),
      creditAmount: DecimalOperations.add(existing.creditAmount, item.creditAmount),
    });
  });

  // Info: (20250217 - Shirley) 第二步：建立所有科目的基本資料
  array.forEach((item) => {
    const amounts = accountAmounts.get(item.accountId) || { debitAmount: '0', creditAmount: '0' };
    if (!arrWithChildren.some((existing) => existing.accountId === item.accountId)) {
      const baseItem: ILineItemInTrialBalanceItemWithHierarchy = {
        ...item,
        accountCode: item.account.code,
        accountName: item.account.name,
        debitAmount: amounts.debitAmount,
        creditAmount: amounts.creditAmount,
        children: [],
      };
      arrWithChildren.push(baseItem);
    }
  });

  // Info: (20250217 - Shirley) 第三步：建立父子關係
  arrWithChildren.forEach((item) => {
    if (item.account.parentId) {
      const parentItem = arrWithChildren.find(
        (parent) => parent.account.id === item.account.parentId
      );

      if (parentItem) {
        // Info: (20250217 - Shirley) 如果找到父科目，將當前項目加入其子項目列表
        if (!parentItem.children.some((child) => child.accountId === item.accountId)) {
          parentItem.children.push(item);
        }
      } else {
        // Info: (20250217 - Shirley) 如果在現有資料中找不到父科目(沒有用父科目作帳的紀錄)，從 accounts 中建立
        const parentAccount = accounts.find((acc) => acc.id === item.account.parentId);
        if (parentAccount) {
          const newParentItem: ILineItemInTrialBalanceItemWithHierarchy = {
            accountCode: parentAccount.code,
            accountName: parentAccount.name,
            debitAmount: '0',
            creditAmount: '0',
            amount: new Prisma.Decimal('0'),
            id: parentAccount.id,
            debit: parentAccount.debit,
            description: '',
            accountId: parentAccount.id,
            voucherId: 0,
            account: {
              id: parentAccount.id,
              code: parentAccount.code,
              name: parentAccount.name,
              parentId: parentAccount.parentId,
            },
            voucher: {
              id: 0,
              date: 0,
              type: '',
              no: '',
            },
            children: [item],
            createdAt: parentAccount.createdAt,
            updatedAt: parentAccount.updatedAt,
            deletedAt: null,
          };
          arrWithChildren.push(newParentItem);
        }
      }
    }
  });

  // Info: (20250217 - Shirley) 第四步：處理虛擬科目和金額計算
  arrWithChildren.forEach((item) => {
    if (item.children && item.children.length > 0) {
      // Info: (20250217 - Shirley) 計算本科目的原始金額
      const selfAmounts = accountAmounts.get(item.accountId) || { debitAmount: '0', creditAmount: '0' };

      // Info: (20250217 - Shirley) 建立虛擬科目（保存本科目的原始金額）
      const virtualItem: ILineItemInTrialBalanceItemWithHierarchy = {
        ...item,
        accountId: item.account.id * 10,
        accountCode: `${item.account.code}-0`,
        accountName: `${item.account.name}-虛擬會計科目（原${item.account.code}）`,
        debitAmount: selfAmounts.debitAmount,
        creditAmount: selfAmounts.creditAmount,
        account: {
          ...item.account,
          id: item.account.id * 10,
          code: `${item.account.code}-0`,
          name: `${item.account.name}-虛擬會計科目（原${item.account.code}）`,
        },
        children: [],
      };

      // Info: (20250217 - Shirley) 計算總金額（包含本科目和所有子科目）
      const childrenDebits = DecimalOperations.sum(item.children.map(child => child.debitAmount));
      const childrenCredits = DecimalOperations.sum(item.children.map(child => child.creditAmount));
      const totalDebit = DecimalOperations.add(selfAmounts.debitAmount, childrenDebits);
      const totalCredit = DecimalOperations.add(selfAmounts.creditAmount, childrenCredits);

      const processedItem: ILineItemInTrialBalanceItemWithHierarchy = {
        ...item,
        debitAmount: totalDebit,
        creditAmount: totalCredit,
        children: [virtualItem, ...item.children],
      };

      arrWithCopySelf.push(processedItem);
    } else {
      arrWithCopySelf.push(item);
    }
  });

  return { arrWithChildren, arrWithCopySelf };
}

export function convertToAPIFormat(
  data: {
    beginning: ILineItemInTrialBalanceItemWithHierarchy[];
    midterm: ILineItemInTrialBalanceItemWithHierarchy[];
    ending: ILineItemInTrialBalanceItemWithHierarchy[];
  },
  sortOption: {
    sortBy: SortBy;
    sortOrder: SortOrder;
  }[]
): {
  items: TrialBalanceItem[];
  total: ITrialBalanceTotal;
} {
  // Info: (20250106 - Shirley) 建立一個 Map 來存儲所有帳戶的合併資料
  const accountMap = new Map<number, TrialBalanceItem>();

  function processAccount(
    item: ILineItemInTrialBalanceItemWithHierarchy,
    period: 'beginning' | 'midterm' | 'ending',
    visitedIds: Set<number> = new Set()
  ): void {
    // Info: (20250716 - Shirley) Prevent circular references in account hierarchy
    if (visitedIds.has(item.account.id)) {
      return;
    }
    visitedIds.add(item.account.id);
    let account = accountMap.get(item.account.id);

    // Info: (20250106 - Shirley) 遞迴將子科目展平
    if (item.children && item.children.length > 0) {
      item.children.forEach((child) => processAccount(child, period, visitedIds));
    }

    if (!account) {
      account = {
        id: item.account.id,
        no: item.account.code,
        accountingTitle: item.account.name,
        beginningCreditAmount: '0',
        beginningDebitAmount: '0',
        midtermCreditAmount: '0',
        midtermDebitAmount: '0',
        endingCreditAmount: '0',
        endingDebitAmount: '0',
        subAccounts: [],
        createAt: 0,
        updateAt: 0,
      };
      accountMap.set(item.account.id, account);
    }

    // Info: (20250106 - Shirley) 根據期間更新金額
    switch (period) {
      case 'beginning':
        account.beginningCreditAmount = item.creditAmount;
        account.beginningDebitAmount = item.debitAmount;
        break;
      case 'midterm':
        account.midtermCreditAmount = item.creditAmount;
        account.midtermDebitAmount = item.debitAmount;
        break;
      case 'ending':
        account.endingCreditAmount = item.creditAmount;
        account.endingDebitAmount = item.debitAmount;
        break;
      default:
        break;
    }
  }

  // Info: (20250106 - Shirley) 處理所有期間的資料
  data.beginning.forEach((item) => processAccount(item, 'beginning', new Set()));
  data.midterm.forEach((item) => processAccount(item, 'midterm', new Set()));
  data.ending.forEach((item) => processAccount(item, 'ending', new Set()));

  // Info: (20250106 - Shirley) 計算總計
  const total = {
    beginningCreditAmount: '0',
    beginningDebitAmount: '0',
    midtermCreditAmount: '0',
    midtermDebitAmount: '0',
    endingCreditAmount: '0',
    endingDebitAmount: '0',
    createAt: 0,
    updateAt: 0,
  };

  const items = Array.from(accountMap.values());

  // Info: (20250106 - Shirley) 計算所有金額的總和
  items.forEach((item) => {
    // Info: (20250106 - Shirley) 不加總子科目，因為父科目的數字已經包含子科目
    if (item.no.includes('-')) {
      return;
    }
    total.beginningCreditAmount = DecimalOperations.add(total.beginningCreditAmount, item.beginningCreditAmount);
    total.beginningDebitAmount = DecimalOperations.add(total.beginningDebitAmount, item.beginningDebitAmount);
    total.midtermCreditAmount = DecimalOperations.add(total.midtermCreditAmount, item.midtermCreditAmount);
    total.midtermDebitAmount = DecimalOperations.add(total.midtermDebitAmount, item.midtermDebitAmount);
    total.endingCreditAmount = DecimalOperations.add(total.endingCreditAmount, item.endingCreditAmount);
    total.endingDebitAmount = DecimalOperations.add(total.endingDebitAmount, item.endingDebitAmount);
  });

  const itemsWithSubAccounts = items.map((item) => {
    if (item.no.includes('-')) {
      const parentNo = item.no.split('-')[0];
      const parentItem = items.find((i) => i.no === parentNo);
      if (parentItem) {
        parentItem.subAccounts.push(item);
      }
      return null;
    }
    return item;
  });

  // const newItems = itemsWithSubAccounts.filter((item) => item !== null);
  // Info: (20250307 - Liz) 這行程式碼讓 npm run build 失敗，因為 TypeScript 仍然認為 newItems 的型別是 (TrialBalanceItem | null)[]，而不是 TrialBalanceItem[]

  const newItems = itemsWithSubAccounts.filter((item): item is TrialBalanceItem => item !== null);
  // Info: (20250307 - Liz) 由於 .filter() 不會自動改變陣列的型別，我們可以用 Type Predicate 讓 TypeScript 正確推斷 newItems 的型別是 TrialBalanceItem[]
  // ToDo: (20250307 - Liz) 先暫時解這個 build error 會再與後端討論這個問題

  const sortedItems = sortTrialBalanceItem(newItems, sortOption);

  return { items: sortedItems, total };
}
