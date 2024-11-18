import { SortBy, SortOrder } from '@/constants/sort';
import { IAccountNode } from '@/interfaces/accounting_account';
import { AccountForResult, LineItemTemp } from '@/interfaces/trial_balance';
import { zodFilterSectionSortingOptions } from '@/lib/utils/zod_schema/common';
import { Account } from '@prisma/client';

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

export const formatAccountsWithLineItemProperties = (
  accounts: Account[],
  lineItems: LineItemTemp[]
) => {
  const accountWithLineItemProperties = accounts.map((account) => ({
    ...account,
    lineItem: [] as LineItemTemp[],
  }));

  accountWithLineItemProperties.forEach((account) => {
    const voucherLineItems = lineItems.filter((item) => item.accountId === account.id);
    account.lineItem.push(...voucherLineItems);
  });

  return accountWithLineItemProperties;
};

/** Info: (20241118 - Shirley)
 * 將期初和期中帳戶樹合併，並計算期末的借方和貸方金額
 * @param beginningForest 期初的帳戶樹
 * @param midtermForest 期中的帳戶樹
 * @returns 合併後的試算平衡結果
 */
export function combineAccountForests(
  beginningForest: IAccountNode[],
  midtermForest: IAccountNode[]
): AccountForResult[] {
  const mergedResult: AccountForResult[] = [];

  // Info: (20241118 - Shirley) 建立期中帳戶的映射，以便快速查找
  const midtermMap = new Map<string, IAccountNode>();
  midtermForest.forEach((account) => {
    midtermMap.set(account.code, account);
  });

  beginningForest.forEach((beginAcc) => {
    const midAcc = midtermMap.get(beginAcc.code);
    if (midAcc) {
      // Info: (20241118 - Shirley) 根據 debit 屬性分類金額
      const beginningCreditAmount =
        beginAcc.debit && beginAcc.amount > 0 ? 0 : Math.abs(beginAcc.amount);
      const beginningDebitAmount = beginAcc.debit && beginAcc.amount > 0 ? beginAcc.amount : 0;

      const midtermCreditAmount = midAcc.debit && midAcc.amount > 0 ? 0 : Math.abs(midAcc.amount);
      const midtermDebitAmount = midAcc.debit && midAcc.amount > 0 ? midAcc.amount : 0;

      const endingCreditAmount = beginningCreditAmount + midtermCreditAmount;
      const endingDebitAmount = beginningDebitAmount + midtermDebitAmount;

      // Info: (20241118 - Shirley) 遞迴處理子科目
      const subAccounts = combineAccountForests(beginAcc.children, midAcc.children);

      mergedResult.push({
        id: beginAcc.id,
        no: beginAcc.code,
        accountingTitle: beginAcc.name,
        beginningCreditAmount, // Info: (20241118 - Shirley) 根據 debit 分類后的期初貸方金額
        beginningDebitAmount, // Info: (20241118 - Shirley) 根據 debit 分類后的期初借方金額
        midtermCreditAmount, // Info: (20241118 - Shirley) 根據 debit 分類后的期中貸方金額
        midtermDebitAmount, // Info: (20241118 - Shirley) 根據 debit 分類后的期中借方金額
        endingCreditAmount, // Info: (20241118 - Shirley) 期末貸方金額
        endingDebitAmount, // Info: (20241118 - Shirley) 期末借方金額
        subAccounts,
        createAt: 0,
        updateAt: 0,
        parentCode: beginAcc.parentCode,
      });
    } else {
      // Info: (20241118 - Shirley) 若期中沒有對應的科目，僅使用期初數據並根據 debit 分類
      const beginningCreditAmount =
        beginAcc.debit && beginAcc.amount > 0 ? 0 : Math.abs(beginAcc.amount);
      const beginningDebitAmount = beginAcc.debit && beginAcc.amount > 0 ? beginAcc.amount : 0;

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

  // Info: (20241118 - Shirley) 處理期中有但期初沒有的科目，並根據 debit 分類
  midtermForest.forEach((midAcc) => {
    const found = beginningForest.find((beginAcc) => beginAcc.code === midAcc.code);
    if (!found) {
      const midtermCreditAmount = midAcc.debit && midAcc.amount > 0 ? 0 : midAcc.amount;
      const midtermDebitAmount = midAcc.debit && midAcc.amount > 0 ? midAcc.amount : 0;

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

export const flattenTrialBalance = (items: AccountForResult[]): AccountForResult[] => {
  let flat: AccountForResult[] = [];
  items.forEach((item) => {
    flat.push(item);
    if (item.subAccounts && item.subAccounts.length > 0) {
      flat = flat.concat(flattenTrialBalance(item.subAccounts));
    }
  });
  return flat;
};

export const sortTrialBalance = (
  items: AccountForResult[],
  sortOption: {
    sortBy: SortBy;
    sortOrder: SortOrder;
  }[]
): AccountForResult[] => {
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
        sortTrialBalance(item.subAccounts, sortOption);
      }
    });
  }
  return items;
};
