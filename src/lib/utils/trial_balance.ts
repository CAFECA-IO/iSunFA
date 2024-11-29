import { SortBy, SortOrder } from '@/constants/sort';
import { IAccountBookNodeJSON } from '@/interfaces/account_book_node';
import {
  ITrialBalanceData,
  ITrialBalanceTotal,
  TrialBalanceItem,
} from '@/interfaces/trial_balance';
import { zodFilterSectionSortingOptions } from '@/lib/utils/zod_schema/common';
// import { Account } from '@prisma/client';

export function parseSortOption(
  defaultSortOption: {
    sortBy: SortBy;
    sortOrder: SortOrder;
  }[],
  sortOption: string | undefined
): {
  sortBy: SortBy;
  sortOrder: SortOrder;
}[] {
  try {
    if (!sortOption) {
      return defaultSortOption;
    }

    const optionsString = sortOption.startsWith('sortOption=')
      ? sortOption.substring('sortOption='.length)
      : sortOption;

    const parseResult = zodFilterSectionSortingOptions().safeParse(optionsString);
    if (!parseResult.success) {
      return defaultSortOption;
    }
    const sortOptionParsed = parseResult.data;
    return sortOptionParsed;
  } catch (error) {
    return defaultSortOption;
  }
}

// export const formatAccountsWithLineItemProperties = (
//   accounts: Account[],
//   lineItems: LineItemTemp[]
// ) => {
//   const accountWithLineItemProperties = accounts.map((account) => ({
//     ...account,
//     lineItem: [] as LineItemTemp[],
//   }));

//   accountWithLineItemProperties.forEach((account) => {
//     const voucherLineItems = lineItems.filter((item) => item.accountId === account.id);
//     account.lineItem.push(...voucherLineItems);
//   });

//   return accountWithLineItemProperties;
// };

// /** Info: (20241118 - Shirley)
//  * 將期初和期中帳戶樹合併，並計算期末的借方和貸方金額
//  * @param beginningForest 期初的帳戶樹
//  * @param midtermForest 期中的帳戶樹
//  * @returns 合併後的試算平衡結果
//  */
// export function combineAccountForests(
//   beginningForest: IAccountNode[],
//   midtermForest: IAccountNode[]
// ): AccountForResult[] {
//   const mergedResult: AccountForResult[] = [];

//   // Info: (20241118 - Shirley) 建立期中帳戶的映射，以便快速查找
//   const midtermMap = new Map<string, IAccountNode>();
//   midtermForest.forEach((account) => {
//     midtermMap.set(account.code, account);
//   });

//   beginningForest.forEach((beginAcc) => {
//     const midAcc = midtermMap.get(beginAcc.code);
//     if (midAcc) {
//       // Info: (20241118 - Shirley) 根據 debit 屬性分類金額
//       const beginningCreditAmount =
//         beginAcc.debit && beginAcc.amount > 0 ? 0 : Math.abs(beginAcc.amount);
//       const beginningDebitAmount = beginAcc.debit && beginAcc.amount > 0 ? beginAcc.amount : 0;

//       const midtermCreditAmount = midAcc.debit && midAcc.amount > 0 ? 0 : Math.abs(midAcc.amount);
//       const midtermDebitAmount = midAcc.debit && midAcc.amount > 0 ? midAcc.amount : 0;

//       const endingCreditAmount = beginningCreditAmount + midtermCreditAmount;
//       const endingDebitAmount = beginningDebitAmount + midtermDebitAmount;

//       // Info: (20241118 - Shirley) 遞迴處理子科目
//       const subAccounts = combineAccountForests(beginAcc.children, midAcc.children);

//       mergedResult.push({
//         id: beginAcc.id,
//         no: beginAcc.code,
//         accountingTitle: beginAcc.name,
//         beginningCreditAmount, // Info: (20241118 - Shirley) 根據 debit 分類后的期初貸方金額
//         beginningDebitAmount, // Info: (20241118 - Shirley) 根據 debit 分類后的期初借方金額
//         midtermCreditAmount, // Info: (20241118 - Shirley) 根據 debit 分類后的期中貸方金額
//         midtermDebitAmount, // Info: (20241118 - Shirley) 根據 debit 分類后的期中借方金額
//         endingCreditAmount, // Info: (20241118 - Shirley) 期末貸方金額
//         endingDebitAmount, // Info: (20241118 - Shirley) 期末借方金額
//         subAccounts,
//         createAt: 0,
//         updateAt: 0,
//         parentCode: beginAcc.parentCode,
//       });
//     } else {
//       // Info: (20241118 - Shirley) 若期中沒有對應的科目，僅使用期初數據並根據 debit 分類
//       const beginningCreditAmount =
//         beginAcc.debit && beginAcc.amount > 0 ? 0 : Math.abs(beginAcc.amount);
//       const beginningDebitAmount = beginAcc.debit && beginAcc.amount > 0 ? beginAcc.amount : 0;

//       mergedResult.push({
//         id: beginAcc.id,
//         no: beginAcc.code,
//         accountingTitle: beginAcc.name,
//         beginningCreditAmount,
//         beginningDebitAmount,
//         midtermCreditAmount: 0,
//         midtermDebitAmount: 0,
//         endingCreditAmount: beginningCreditAmount,
//         endingDebitAmount: beginningDebitAmount,
//         subAccounts: combineAccountForests(beginAcc.children, []),
//         createAt: 0,
//         updateAt: 0,
//         parentCode: beginAcc.parentCode,
//       });
//     }
//   });

//   // Info: (20241118 - Shirley) 處理期中有但期初沒有的科目，並根據 debit 分類
//   midtermForest.forEach((midAcc) => {
//     const found = beginningForest.find((beginAcc) => beginAcc.code === midAcc.code);
//     if (!found) {
//       const midtermCreditAmount = midAcc.debit && midAcc.amount > 0 ? 0 : midAcc.amount;
//       const midtermDebitAmount = midAcc.debit && midAcc.amount > 0 ? midAcc.amount : 0;

//       mergedResult.push({
//         id: midAcc.id,
//         no: midAcc.code,
//         accountingTitle: midAcc.name,
//         beginningCreditAmount: 0,
//         beginningDebitAmount: 0,
//         midtermCreditAmount,
//         midtermDebitAmount,
//         endingCreditAmount: midtermCreditAmount,
//         endingDebitAmount: midtermDebitAmount,
//         subAccounts: combineAccountForests([], midAcc.children),
//         createAt: 0,
//         updateAt: 0,
//         parentCode: midAcc.parentCode,
//       });
//     }
//   });

//   return mergedResult;
// }

// export const flattenTrialBalance = (items: AccountForResult[]): AccountForResult[] => {
//   let flat: AccountForResult[] = [];
//   items.forEach((item) => {
//     flat.push(item);
//     if (item.subAccounts && item.subAccounts.length > 0) {
//       flat = flat.concat(flattenTrialBalance(item.subAccounts));
//     }
//   });
//   return flat;
// };

// export const sortTrialBalance = (
//   items: AccountForResult[],
//   sortOption: {
//     sortBy: SortBy;
//     sortOrder: SortOrder;
//   }[]
// ): AccountForResult[] => {
//   if (sortOption.length > 0) {
//     items.sort((a, b) => {
//       return sortOption.reduce((acc, option) => {
//         if (acc !== 0) return acc;

//         let fieldA: number | string;
//         let fieldB: number | string;

//         switch (option.sortBy) {
//           case SortBy.BEGINNING_CREDIT_AMOUNT:
//             fieldA = a.beginningCreditAmount;
//             fieldB = b.beginningCreditAmount;
//             break;
//           case SortBy.BEGINNING_DEBIT_AMOUNT:
//             fieldA = a.beginningDebitAmount;
//             fieldB = b.beginningDebitAmount;
//             break;
//           case SortBy.MIDTERM_CREDIT_AMOUNT:
//             fieldA = a.midtermCreditAmount;
//             fieldB = b.midtermCreditAmount;
//             break;
//           case SortBy.MIDTERM_DEBIT_AMOUNT:
//             fieldA = a.midtermDebitAmount;
//             fieldB = b.midtermDebitAmount;
//             break;
//           case SortBy.ENDING_CREDIT_AMOUNT:
//             fieldA = a.endingCreditAmount;
//             fieldB = b.endingCreditAmount;
//             break;
//           case SortBy.ENDING_DEBIT_AMOUNT:
//             fieldA = a.endingDebitAmount;
//             fieldB = b.endingDebitAmount;
//             break;
//           default:
//             fieldA = a.accountingTitle;
//             fieldB = b.accountingTitle;
//             break;
//         }

//         if (fieldA < fieldB) {
//           return option.sortOrder === SortOrder.ASC ? -1 : 1;
//         }
//         if (fieldA > fieldB) {
//           return option.sortOrder === SortOrder.ASC ? 1 : -1;
//         }
//         return 0; // Info: (20241118 - Shirley) 若相等，繼續判斷下一個排序條件
//       }, 0);
//     });

//     // Info: (20241118 - Shirley) 遞迴排序 subAccounts
//     items.forEach((item) => {
//       if (item.subAccounts && item.subAccounts.length > 0) {
//         sortTrialBalance(item.subAccounts, sortOption);
//       }
//     });
//   }
//   return items;
// };

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

export function organizeIntoTree(flatAccounts: IAccountBookNodeJSON[]): IAccountBookNodeJSON[] {
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
        // 如果沒有父節點或父節點不在映射中，則作為根節點
        rootNodes.push(node);
      } else {
        // 將節點加入到父節點的 children 中
        const parent = accountMap.get(account.parentId);
        if (parent) {
          parent.children.push(node);
        }
      }
    }
  });

  return rootNodes;
}

// 收集所有時期的帳目
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

/**
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

  const convertToTrialBalanceItem = (data: {
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
        subAccounts.push(convertToTrialBalanceItem(childData));
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
    result.push(convertToTrialBalanceItem(data));
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

/**
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

  const beginOrganizedAccounts = organizeIntoTree(beginFilteredAccounts);
  const midOrganizedAccounts = organizeIntoTree(midFilteredAccounts);
  const endOrganizedAccounts = organizeIntoTree(endFilteredAccounts);

  const trialBalanceItems = combineAccountsToTrialBalance(
    beginOrganizedAccounts,
    midOrganizedAccounts,
    endOrganizedAccounts
  );

  const sortedTrialBalanceItems = sortTrialBalanceItem(trialBalanceItems, sortOption);
  const trialBalanceData = convertToTrialBalanceData(sortedTrialBalanceItems);

  return trialBalanceData;
}
