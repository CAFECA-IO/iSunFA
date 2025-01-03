import { IAccountNodeWithDebitAndCredit } from '@/interfaces/accounting_account';
import { SortBy, SortOrder } from '@/constants/sort';
import { IAccountBookNodeJSON } from '@/interfaces/account_book_node';
import { ILineItemSimpleAccountVoucher } from '@/interfaces/line_item';
import {
  ILineItemInTrialBalanceItem,
  ITrialBalanceData,
  ITrialBalanceTotal,
  TrialBalanceItem,
} from '@/interfaces/trial_balance';

export function filterUserAccounts(nodes: IAccountBookNodeJSON[]): IAccountBookNodeJSON[] {
  const filteredAccounts = nodes.reduce((filtered, node) => {
    // Info: (20241130 - Shirley) 遞迴處理子節點
    const filteredChildren = node.children.length > 0 ? filterUserAccounts(node.children) : [];

    // Info: (20241130 - Shirley) 如果當前節點是 forUser: true，則加入該節點（但不包含子節點）
    if (node.forUser) {
      filtered.push({
        ...node,
        children: [], // Info: (20241130 - Shirley) 重置 children 為空陣列
      } as IAccountBookNodeJSON);
    }

    // Info: (20241130 - Shirley) 將子節點的結果合併到當前層級
    filtered.push(...filteredChildren);

    return filtered;
  }, [] as IAccountBookNodeJSON[]);

  return filteredAccounts;
}

export function organizeIntoTreeForUserAcc(
  flatAccounts: IAccountBookNodeJSON[]
): IAccountBookNodeJSON[] {
  const accountMap = new Map<number, IAccountBookNodeJSON>();
  const rootNodes: IAccountBookNodeJSON[] = [];

  // Info: (20241130 - Shirley) 第一步：建立所有節點的映射
  flatAccounts.forEach((account) => {
    accountMap.set(account.id, { ...account, children: [] });
  });

  // Info: (20241130 - Shirley) 第二步：建立樹狀結構
  flatAccounts.forEach((account) => {
    const node = accountMap.get(account.id);
    if (node) {
      if (!account.parentId || !accountMap.has(account.parentId)) {
        // Info: (20241130 - Shirley) 在 forUser 的會計科目中，如果沒有父節點或父節點不在映射中，則作為根節點
        rootNodes.push(node);
      } else {
        // Info: (20241130 - Shirley) 將節點加入到父節點的 children 中
        const parent = accountMap.get(account.parentId);
        if (parent) {
          parent.children.push(node);
        }
      }
    }
  });

  return rootNodes;
}

// Info: (20241130 - Shirley) 收集所有時期的帳目
const collectAccounts = (
  accountMap: Map<
    number,
    {
      beginning?: IAccountBookNodeJSON;
      midterm?: IAccountBookNodeJSON;
      ending?: IAccountBookNodeJSON;
    }
  >,
  accounts: IAccountBookNodeJSON[],
  period: 'beginning' | 'midterm' | 'ending'
) => {
  accounts.forEach((account) => {
    const existing = accountMap.get(account.id) || {};
    accountMap.set(account.id, {
      ...existing,
      [period]: account,
    });
  });
};

/** Info: (20241130 - Shirley)
 * 將三個時期的帳目組合成試算表項目格式
 * @param beginningAccounts 期初帳目
 * @param midtermAccounts 期中帳目
 * @param endingAccounts 期末帳目
 * @returns TrialBalanceItem[] 試算表項目陣列
 */
export function combineAccountsToTrialBalance(
  beginningAccounts: IAccountBookNodeJSON[],
  midtermAccounts: IAccountBookNodeJSON[],
  endingAccounts: IAccountBookNodeJSON[]
): TrialBalanceItem[] {
  // Info: (20241130 - Shirley) 建立科目代碼到節點的映射
  const accountMap = new Map<
    number,
    {
      beginning?: IAccountBookNodeJSON;
      midterm?: IAccountBookNodeJSON;
      ending?: IAccountBookNodeJSON;
    }
  >();

  collectAccounts(accountMap, beginningAccounts, 'beginning');
  collectAccounts(accountMap, midtermAccounts, 'midterm');
  collectAccounts(accountMap, endingAccounts, 'ending');

  const convertToTrialBalanceItemInFunction = (data: {
    beginning?: IAccountBookNodeJSON;
    midterm?: IAccountBookNodeJSON;
    ending?: IAccountBookNodeJSON;
  }): TrialBalanceItem => {
    const { beginning, midterm, ending } = data;
    const account = beginning || midterm || ending; // 使用任一個存在的帳目來獲取基本資訊

    const beginSummary = beginning?.summary || { debit: 0, credit: 0 };
    const midtermSummary = midterm?.summary || { debit: 0, credit: 0 };
    const endingSummary = ending?.summary || { debit: 0, credit: 0 };

    // Info: (20241130 - Shirley) 遞迴處理子科目
    const subAccounts: TrialBalanceItem[] = [];
    if (account?.children.length) {
      const childrenMap = new Map<
        number,
        {
          beginning?: IAccountBookNodeJSON;
          midterm?: IAccountBookNodeJSON;
          ending?: IAccountBookNodeJSON;
        }
      >();

      // Info: (20241130 - Shirley) 收集所有子科目
      if (beginning?.children) {
        beginning.children.forEach((child) => {
          const existing = childrenMap.get(child.id) || {};
          childrenMap.set(child.id, { ...existing, beginning: child });
        });
      }
      if (midterm?.children) {
        midterm.children.forEach((child) => {
          const existing = childrenMap.get(child.id) || {};
          childrenMap.set(child.id, { ...existing, midterm: child });
        });
      }
      if (ending?.children) {
        ending.children.forEach((child) => {
          const existing = childrenMap.get(child.id) || {};
          childrenMap.set(child.id, { ...existing, ending: child });
        });
      }

      // Info: (20241130 - Shirley) 遞迴轉換子科目
      childrenMap.forEach((childData) => {
        subAccounts.push(convertToTrialBalanceItemInFunction(childData));
      });
    }

    return {
      id: account?.id || 0,
      no: account?.code || '',
      accountingTitle: account?.name || '',
      beginningCreditAmount: beginSummary.credit,
      beginningDebitAmount: beginSummary.debit,
      midtermCreditAmount: midtermSummary.credit,
      midtermDebitAmount: midtermSummary.debit,
      endingCreditAmount: endingSummary.credit,
      endingDebitAmount: endingSummary.debit,
      createAt: 0,
      updateAt: 0,
      subAccounts,
    };
  };

  // Info: (20241130 - Shirley) 轉換所有科目
  const result: TrialBalanceItem[] = [];
  accountMap.forEach((data) => {
    result.push(convertToTrialBalanceItemInFunction(data));
  });

  return result;
}

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

        if (fieldA < fieldB) {
          return option.sortOrder === SortOrder.ASC ? -1 : 1;
        }
        if (fieldA > fieldB) {
          return option.sortOrder === SortOrder.ASC ? 1 : -1;
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
      beginningCreditAmount: total.beginningCreditAmount + item.beginningCreditAmount,
      beginningDebitAmount: total.beginningDebitAmount + item.beginningDebitAmount,
      midtermCreditAmount: total.midtermCreditAmount + item.midtermCreditAmount,
      midtermDebitAmount: total.midtermDebitAmount + item.midtermDebitAmount,
      endingCreditAmount: total.endingCreditAmount + item.endingCreditAmount,
      endingDebitAmount: total.endingDebitAmount + item.endingDebitAmount,
      createAt: 0, // 使用當前時間戳
      updateAt: 0,
    }),
    {
      beginningCreditAmount: 0,
      beginningDebitAmount: 0,
      midtermCreditAmount: 0,
      midtermDebitAmount: 0,
      endingCreditAmount: 0,
      endingDebitAmount: 0,
      createAt: 0,
      updateAt: 0,
    }
  );

  return result;
};

const filterZeroAmounts = (items: TrialBalanceItem[]): TrialBalanceItem[] => {
  const result = items.filter((item) => {
    const hasNonZeroAmount =
      item.beginningCreditAmount !== 0 ||
      item.beginningDebitAmount !== 0 ||
      item.midtermCreditAmount !== 0 ||
      item.midtermDebitAmount !== 0 ||
      item.endingCreditAmount !== 0 ||
      item.endingDebitAmount !== 0;

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

/** Info: (20241130 - Shirley)
 * 將排序後的試算表項目轉換為 ITrialBalanceData 格式
 * @param sortedItems 排序後的試算表項目
 * @returns ITrialBalanceData 格式的資料
 */
export function convertToTrialBalanceData(sortedItems: TrialBalanceItem[]): ITrialBalanceData {
  const filteredItems = filterZeroAmounts(sortedItems);
  const total = calculateTotal(filteredItems);

  return {
    items: filteredItems,
    total,
  };
}

export function convertAccountBookJsonToTrialBalanceItem(
  beginAccountBookJSON: IAccountBookNodeJSON[],
  midAccountBookJSON: IAccountBookNodeJSON[],
  endAccountBookJSON: IAccountBookNodeJSON[],
  sortOption: {
    sortBy: SortBy;
    sortOrder: SortOrder;
  }[]
) {
  const beginFilteredAccounts = filterUserAccounts(beginAccountBookJSON);
  const midFilteredAccounts = filterUserAccounts(midAccountBookJSON);
  const endFilteredAccounts = filterUserAccounts(endAccountBookJSON);

  const beginOrganizedAccounts = organizeIntoTreeForUserAcc(beginFilteredAccounts);
  const midOrganizedAccounts = organizeIntoTreeForUserAcc(midFilteredAccounts);
  const endOrganizedAccounts = organizeIntoTreeForUserAcc(endFilteredAccounts);

  const trialBalanceItems = combineAccountsToTrialBalance(
    beginOrganizedAccounts,
    midOrganizedAccounts,
    endOrganizedAccounts
  );

  const sortedTrialBalanceItems = sortTrialBalanceItem(trialBalanceItems, sortOption);
  const trialBalanceData = convertToTrialBalanceData(sortedTrialBalanceItems);

  return trialBalanceData;
}

export const convertTrialBalanceDataToCsvData = (trialBalanceData: ITrialBalanceData) => {
  const csvData = trialBalanceData.items.map((item) => {
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

/** Info: (20241230 - Shirley)
 * 取得當前401申報週期的期初和期末時間點
 */
export function getCurrent401Period(): {
  periodBegin: number;
  periodEnd: number;
} {
  const currentDate = new Date();
  const month = currentDate.getMonth() + 1; // 月份從0開始
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
  const periodEndDate = new Date(year, periodEndMonth, 0); // 該月的最後一天
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

/**
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
      map[item.accountId] = {
        ...item,
        debitAmount: item.debit ? item.amount : 0,
        creditAmount: !item.debit ? item.amount : 0,
      };
    } else {
      map[item.accountId].debitAmount += item.debit ? item.amount : 0;
      map[item.accountId].creditAmount += !item.debit ? item.amount : 0;
    }
  });

  return Object.values(map);
}

// TODO: (20241230 - Shirley) 實作虛擬科目增列
/**
 * 增列虛擬科目「其他」對應子科目的借貸金額
 * @param items 試算表項目
 * @param accounts 會計科目列表
 * @returns 虛擬科目增列後的試算表項目
 */
// export function addVirtualAccounts(
//   items: ILineItemSimpleAccountVoucher[],
//   accounts: Account[]
// ): ILineItemInTrialBalanceItem[] {
//   const accountMap: { [key: number]: Account } = {};
//   accounts.forEach((account) => {
//     accountMap[account.id] = account;
//   });
//   console.log('accountMap', accountMap);
//   const resultMap: { [key: string]: ILineItemInTrialBalanceItem } = {};

//   items.forEach((item) => {
//     // 保留原科目
//     if (!resultMap[item.accountId]) {
//       resultMap[item.accountId] = {
//         ...item,
//         debitAmount: item.debit ? item.amount : 0,
//         creditAmount: item.debit ? 0 : item.amount,
//       };
//     } else {
//       resultMap[item.accountId].debitAmount += item.debit ? item.amount : 0;
//       resultMap[item.accountId].creditAmount += !item.debit ? item.amount : 0;
//     }
//   });
//   // 合併虛擬科目
//   const finalItems = Object.values(resultMap);
//   return finalItems;
// }

/** Info: (20250102 - Shirley)
 * 將會計分錄依照會計科目合併跟加總
 * @param lineItems 會計分錄列表
 * @returns 合併後的會計分錄
 */
export function mergeLineItemsByAccount(
  lineItems: ILineItemSimpleAccountVoucher[]
): ILineItemInTrialBalanceItem[] {
  // Info: (20250102 - Shirley) 使用 Map 來儲存每個 accountId 的合計金額
  const accountSummary = new Map<
    number,
    {
      accountId: number;
      debitAmount: number;
      creditAmount: number;
      accountCode: string;
      accountName: string;
      debit: boolean;
      amount: number;
    }
  >();

  // Info: (20250102 - Shirley) 遍歷所有分錄並加總
  lineItems.forEach((item) => {
    const existingSummary = accountSummary.get(item.accountId);

    if (existingSummary) {
      // Info: (20250102 - Shirley) 如果該科目已存在，則加總金額
      if (item.debit) {
        existingSummary.debitAmount += item.amount;
      } else {
        existingSummary.creditAmount += item.amount;
      }
    } else {
      // Info: (20250102 - Shirley) 如果該科目不存在，則建立新的紀錄
      accountSummary.set(item.accountId, {
        accountId: item.accountId,
        debitAmount: item.debit ? item.amount : 0,
        creditAmount: !item.debit ? item.amount : 0,
        accountCode: item.account.code,
        accountName: item.account.name,
        debit: item.debit,
        amount: item.amount,
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
      code: summary.accountCode,
      name: summary.accountName,
      parentId: 0,
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

/** Info: (20250102 - Shirley)
 * 將會計分錄依據時間區間分類並合併
 * @param lineItems 會計分錄列表
 * @param periodBegin 期初時間
 * @param periodEnd 期末時間
 * @returns 分類後的會計分錄
 */
export function categorizeAndMergeLineItems(
  lineItems: ILineItemSimpleAccountVoucher[],
  periodBegin: number,
  periodEnd: number
) {
  // Info: (20250102 - Shirley) 分類會計分錄
  const beginningItems: ILineItemSimpleAccountVoucher[] = [];
  const midtermItems: ILineItemSimpleAccountVoucher[] = [];

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

/** Info: (20250102 - Shirley)
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
      existingItem.debitAmount += item.debitAmount;
      existingItem.creditAmount += item.creditAmount;
      existingItem.amount = Math.abs(existingItem.debitAmount - existingItem.creditAmount);
      existingItem.debit = existingItem.debitAmount > existingItem.creditAmount;
    } else {
      endingMap.set(item.accountId, item);
    }
  });

  return Array.from(endingMap.values());
}

/** Info: (20250102 - Shirley)
 * 將會計分錄轉換為試算表格式
 * @param lineItems 會計分錄列表
 * @param periodBegin 期初時間
 * @param periodEnd 期末時間
 * @returns 試算表格式的資料
 */
export function convertToTrialBalanceItem(
  lineItems: ILineItemSimpleAccountVoucher[],
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
  const filteredEnding = ending.filter((item) => item.debitAmount !== 0 || item.creditAmount !== 0);

  return {
    beginning,
    midterm,
    ending: filteredEnding,
  };
}

/** Info: (20250102 - Shirley)
 * 將用來計算的試算表格式轉換為 API 格式
 * @param lineItems 試算表格式資料
 * @returns API 格式資料
 */
export function convertLineItemsToTrialBalanceAPIFormat(lineItems: {
  beginning: ILineItemInTrialBalanceItem[];
  midterm: ILineItemInTrialBalanceItem[];
  ending: ILineItemInTrialBalanceItem[];
}): ITrialBalanceData {
  // Info: (20250102 - Shirley) 計算總額
  const total = {
    beginningCreditAmount: lineItems.beginning.reduce((sum, item) => sum + item.creditAmount, 0),
    beginningDebitAmount: lineItems.beginning.reduce((sum, item) => sum + item.debitAmount, 0),
    midtermCreditAmount: lineItems.midterm.reduce((sum, item) => sum + item.creditAmount, 0),
    midtermDebitAmount: lineItems.midterm.reduce((sum, item) => sum + item.debitAmount, 0),
    endingCreditAmount: lineItems.ending.reduce((sum, item) => sum + item.creditAmount, 0),
    endingDebitAmount: lineItems.ending.reduce((sum, item) => sum + item.debitAmount, 0),
    createAt: Math.floor(Date.now() / 1000),
    updateAt: Math.floor(Date.now() / 1000),
  };

  // Info: (20250102 - Shirley) 將 ILineItemInTrialBalanceItem[] 轉換為 TrialBalanceItem[]
  const items: TrialBalanceItem[] = lineItems.ending.map((item) => ({
    id: item.accountId,
    no: item.account.code,
    accountingTitle: item.account.name,
    beginningCreditAmount:
      lineItems.beginning.find((b) => b.accountId === item.accountId)?.creditAmount || 0,
    beginningDebitAmount:
      lineItems.beginning.find((b) => b.accountId === item.accountId)?.debitAmount || 0,
    midtermCreditAmount:
      lineItems.midterm.find((m) => m.accountId === item.accountId)?.creditAmount || 0,
    midtermDebitAmount:
      lineItems.midterm.find((m) => m.accountId === item.accountId)?.debitAmount || 0,
    endingCreditAmount: item.creditAmount,
    endingDebitAmount: item.debitAmount,
    createAt: item.createdAt,
    updateAt: item.updatedAt,
    subAccounts: [], // TODO: (20250102 - Shirley) 額外處理子科目
  }));

  const rs = {
    items,
    total,
  };

  return rs;
}

// Info: (20250102 - Shirley) 根據 accountId 將金額累加到帳戶樹中
export const aggregateAmounts = (
  accountsWithDebitAndCredit: IAccountNodeWithDebitAndCredit[],
  lineItemsForCal: ILineItemInTrialBalanceItem[]
): IAccountNodeWithDebitAndCredit[] => {
  const rs = accountsWithDebitAndCredit.map((account) => {
    // 處理子科目
    const updatedChildren = aggregateAmounts(account.children, lineItemsForCal);

    // 計算當前帳戶的 debitAmount 和 creditAmount
    // 如果有 children 的話，此科目的 debitAmount 跟 creditAmount 單純為 children 的 debitAmount 跟 creditAmount 加總
    let currentDebit = 0;
    let currentCredit = 0;
    if (account.children.length > 0) {
      currentDebit = updatedChildren.reduce((sum, child) => sum + child.debitAmount, 0);
      currentCredit = updatedChildren.reduce((sum, child) => sum + child.creditAmount, 0);
    } else {
      const currentLineItems = lineItemsForCal.filter((item) => item.accountId === account.id);
      currentDebit = currentLineItems.reduce((sum, item) => sum + item.debitAmount, 0);
      currentCredit = currentLineItems.reduce((sum, item) => sum + item.creditAmount, 0);
    }

    return {
      ...account,
      debitAmount: currentDebit,
      creditAmount: currentCredit,
      children: updatedChildren,
    };
  });

  return rs;
};

export function convertAccountForestToTrialBalance(accountsOfThree: {
  beginning: IAccountNodeWithDebitAndCredit[];
  midterm: IAccountNodeWithDebitAndCredit[];
  ending: IAccountNodeWithDebitAndCredit[];
}) {
  const total = {
    beginningCreditAmount: accountsOfThree.beginning.reduce(
      (sum, item) => sum + item.creditAmount,
      0
    ),
    beginningDebitAmount: accountsOfThree.beginning.reduce(
      (sum, item) => sum + item.debitAmount,
      0
    ),
    midtermCreditAmount: accountsOfThree.midterm.reduce((sum, item) => sum + item.creditAmount, 0),
    midtermDebitAmount: accountsOfThree.midterm.reduce((sum, item) => sum + item.debitAmount, 0),
    endingCreditAmount: accountsOfThree.ending.reduce((sum, item) => sum + item.creditAmount, 0),
    endingDebitAmount: accountsOfThree.ending.reduce((sum, item) => sum + item.debitAmount, 0),
    createAt: 0,
    updateAt: 0,
  };

  /**
   * 遞迴尋找特定 ID 的帳戶
   * @param accounts 帳戶陣列
   * @param id 要尋找的帳戶 ID
   * @returns 找到的帳戶或 undefined
   */
  const findAccountById = (
    accounts: IAccountNodeWithDebitAndCredit[],
    id: number
  ): IAccountNodeWithDebitAndCredit | undefined => {
    return accounts.find((account) => {
      if (account.id === id) {
        // if (account.id === 10001469) {
        //   console.log("findAccountById", account);
        // }
        return true;
      }
      if (account.children && account.children.length > 0) {
        const found = findAccountById(account.children, id);
        if (found) return true;
      }
      return false;
    });
  };

  /**
   * 遞迴處理單一帳戶及其子帳戶
   * @param account 單一帳戶節點
   * @returns 試算表項目
   */
  const processAccount = (account: IAccountNodeWithDebitAndCredit): TrialBalanceItem => {
    // // 尋找對應的期初、期中、期末金額
    // const beginningItem = accountsOfThree.beginning.find((b) => b.id === account.id);
    // const midtermItem = accountsOfThree.midterm.find((m) => m.id === account.id);
    // const endingItem = accountsOfThree.ending.find((e) => e.id === account.id);

    // 使用遞迴函數尋找對應的期初、期中、期末金額
    const beginningItem = findAccountById(accounts.beginning, account.id);
    const midtermItem = findAccountById(accounts.midterm, account.id);
    const endingItem = findAccountById(accounts.ending, account.id);

    // 處理子科目遞迴，確保子科目資料基於其 ID
    const subAccounts: TrialBalanceItem[] = account.children
      .map((child) => {
        const fullChild = findAccountById(accounts.ending, child.id);
        if (!fullChild) return null;
        return processAccount(fullChild);
      })
      .filter(
        (sub): sub is TrialBalanceItem =>
          sub !== null &&
          (sub.beginningDebitAmount !== 0 ||
            sub.beginningCreditAmount !== 0 ||
            sub.midtermDebitAmount !== 0 ||
            sub.midtermCreditAmount !== 0 ||
            sub.endingDebitAmount !== 0 ||
            sub.endingCreditAmount !== 0)
      );

    return {
      id: account.id,
      no: account.code,
      accountingTitle: account.name,
      beginningCreditAmount: beginningItem?.creditAmount || 0,
      beginningDebitAmount: beginningItem?.debitAmount || 0,
      midtermCreditAmount: midtermItem?.creditAmount || 0,
      midtermDebitAmount: midtermItem?.debitAmount || 0,
      endingCreditAmount: endingItem?.creditAmount || 0,
      endingDebitAmount: endingItem?.debitAmount || 0,
      createAt: account.createdAt,
      updateAt: account.updatedAt,
      subAccounts,
    };

    // // 處理子科目遞迴
    // const subAccounts: TrialBalanceItem[] = account.children.map((child) => processAccount(child));
    // // .filter(
    // //   (sub) =>
    // //     sub.beginningDebitAmount !== 0 ||
    // //     sub.beginningCreditAmount !== 0 ||
    // //     sub.midtermDebitAmount !== 0 ||
    // //     sub.midtermCreditAmount !== 0 ||
    // //     sub.endingDebitAmount !== 0 ||
    // //     sub.endingCreditAmount !== 0
    // // );

    // return {
    //   id: account.id,
    //   no: account.code,
    //   accountingTitle: account.name,

    //   beginningDebitAmount: beginningItem?.debitAmount || 0,

    //   beginningCreditAmount: beginningItem?.creditAmount || 0,
    //   midtermDebitAmount: midtermItem?.debitAmount || 0,

    //   midtermCreditAmount: midtermItem?.creditAmount || 0,
    //   endingDebitAmount: endingItem?.debitAmount || 0,

    //   endingCreditAmount: endingItem?.creditAmount || 0,
    //   createAt: account.createdAt,
    //   updateAt: account.updatedAt,
    //   subAccounts,
    // };
  };

  // 處理所有期末帳戶，假設期末帳戶包含所有必要的帳戶資訊
  const items: TrialBalanceItem[] = accountsOfThree.ending
    .map((account) => processAccount(account))
    .filter(
      (item) =>
        item.beginningDebitAmount !== 0 ||
        item.beginningCreditAmount !== 0 ||
        item.midtermDebitAmount !== 0 ||
        item.midtermCreditAmount !== 0 ||
        item.endingDebitAmount !== 0 ||
        item.endingCreditAmount !== 0
    );

  return {
    items,
    total,
  };
}

export function mergeAccount(
  account1: IAccountNodeWithDebitAndCredit,
  account2: IAccountNodeWithDebitAndCredit
) {
  const newAccount = {
    ...account1,
    debitAmount: account1.debitAmount + account2.debitAmount,
    creditAmount: account1.creditAmount + account2.creditAmount,
  };

  return newAccount;
}

// TODO: (20250102 - Shirley) 合併 IAccountNodeWithDebitAndCredit
// export function mergeThreeAccountForest(
//   beginning: IAccountNodeWithDebitAndCredit[],
//   midterm: IAccountNodeWithDebitAndCredit[],
//   ending: IAccountNodeWithDebitAndCredit[]
// ) {
//   /* eslint-disable */
//   for (const account of beginning) {
//     if (account.children) {
//       for (const child of account.children) {
//         const childInMidterm = midterm.find((m) => m.id === child.id) ?? [];
//         const childInEnding = ending.find((e) => e.id === child.id) ?? [];
//         const mergedChild = mergeAccount(child, childInMidterm);
//       }
//     }
//   }

//   const merged = mergeAccount(beginning, midterm);

//   return merged;
// }

/** TODO: (20250102 - Shirley) 遞迴轉換資料格式
 * 一次丟一個節點，檢查是否有 children，有則處理children跟處理自己，沒有則處理自己
 */
// export function transformAccountToTrialBalance(
//   account: IAccountNodeWithDebitAndCredit
// ): any {
//   if (account.children && account.children.length > 0) {
//     return transformAccountToTrialBalance(account);
//   } else {
//     return {
//       id: account.id,
//       no: account.code,
//       accountingTitle: account.name,
//       beginningCreditAmount: 0,
//       beginningDebitAmount: 0,
//       midtermCreditAmount: 0,
//       midtermDebitAmount: 0,
//       endingCreditAmount: 0,
//       endingDebitAmount: 0,
//     };
//   }
// }
