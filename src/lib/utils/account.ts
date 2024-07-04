import { PUBLIC_COMPANY_ID } from '@/constants/company';
import { IAccountForSheetDisplay, IAccountNode } from '@/interfaces/accounting_account';
import { ILineItemIncludeAccount } from '@/interfaces/line_item';
import { Account } from '@prisma/client';

// Depreciated: (20240702 - Murky) This is for testing purpose
// import { AccountType } from "@/constants/account";
// import { findManyAccountsInPrisma } from "@/lib/utils/repo/account.repo";
// import { getSumOfLineItemsGroupByAccountInPrisma } from "@/lib/utils/repo/line_item.repo";
// import balanceSheetMapping from '@/constants/account_sheet_mapping/balance_sheet_mapping.json';

export function transformLineItemsFromDBToMap(
  lineItemsFromDB: ILineItemIncludeAccount[]
): Map<number, number> {
  const lineItems: Map<number, number> = new Map();
  lineItemsFromDB.forEach((lineItem) => {
    const isAccountDebit = lineItem.account.debit;
    const isLineItemDebit = lineItem.debit;
    const { amount } = lineItem;

    const adjustedAmount = isAccountDebit === isLineItemDebit ? amount : -amount;

    const lineItemOriginalAmount = lineItems.get(lineItem.accountId) || 0;
    lineItems.set(lineItem.accountId, lineItemOriginalAmount + adjustedAmount);
  });
  return lineItems;
}

function transformAccountsToMap(accounts: Account[]): Map<string, IAccountNode> {
  const accountMap = new Map<string, IAccountNode>();

  accounts.forEach((account) => {
    accountMap.set(account.code, {
      ...account,
      children: [],
      amount: 0,
    });
  });

  return accountMap;
}

export function buildAccountForest(accounts: Account[]): IAccountNode[] {
  const accountMap = transformAccountsToMap(accounts);
  const rootAccounts: IAccountNode[] = [];

  accountMap.forEach((account, code) => {
    if (account.parentCode !== code) {
      const parentAccount = accountMap.get(account.parentCode);
      if (parentAccount) {
        parentAccount.children.push(account);
      }
    } else {
      rootAccounts.push(account);
    }
  });

  return rootAccounts;
}

function updateAccountAmountsByDFS(account: IAccountNode, lineItemsMap: Map<number, number>) {
  let newAmount = lineItemsMap.get(account.id) || 0;
  const updatedChildren = account.children.map((child) => {
    const childAccount = updateAccountAmountsByDFS(child, lineItemsMap);

    // Info: (20240702 - Murky) 如果parent和child的debit方向不同，則child的amount要取負值
    // 例如：Parent 是 機具設備淨額，Child 是 機具設備成本 and 累計折舊－機具設備，則機具設備淨額 = 機具設備成本 - 累計折舊
    newAmount += account.debit === child.debit ? childAccount.amount : -childAccount.amount;
    return childAccount;
  });

  // Info: (20240702 - Murky) Copy child to prevent call by reference
  const updatedAccount: IAccountNode = { ...account, children: updatedChildren };

  updatedAccount.amount = newAmount;

  // Info: (20240702 - Murky)刪除children中公司自行建立的account
  updatedAccount.children = updatedAccount.children.filter(
    (child) => child.companyId === PUBLIC_COMPANY_ID
  );
  return updatedAccount;
}

export function updateAccountAmountsInSingleTree(
  accounts: IAccountNode,
  lineItemsMap: Map<number, number>
) {
  const updatedIAccountNode = updateAccountAmountsByDFS(accounts, lineItemsMap);
  return updatedIAccountNode;
}

export function updateAccountAmounts(forest: IAccountNode[], lineItemsMap: Map<number, number>) {
  const updatedForest = forest.map((account) => updateAccountAmountsInSingleTree(account, lineItemsMap));
  return updatedForest;
}

export function addAccountNodeToMapRecursively(
  accountMap: Map<string, IAccountNode>,
  account: IAccountNode
) {
  const newAccountNode = { ...account, children: [] };
  accountMap.set(account.code, newAccountNode);
  account.children.forEach((child) => {
    addAccountNodeToMapRecursively(accountMap, child);
  });
}

export function transformForestToMap(forest: IAccountNode[]): Map<string, IAccountNode> {
  const accountMap = new Map<string, IAccountNode>();

  forest.forEach((accountNode) => {
    addAccountNodeToMapRecursively(accountMap, accountNode);
  });

  return accountMap;
}

export function mappingAccountToSheetDisplay(
  accountMap: Map<string, IAccountNode>,
  sheetMappingRow: {
    code: string;
    name: string;
    indent: number;
  }[]
): IAccountForSheetDisplay[] {
  const sheetDisplay: IAccountForSheetDisplay[] = [];

  sheetMappingRow.forEach((row) => {
    if (!row.code) {
      sheetDisplay.push({
        code: row.code,
        name: row.name,
        amount: null,
        indent: row.indent,
      });
      return;
    }
    const account = accountMap.get(row.code);
    if (!account) {
      sheetDisplay.push({
        code: row.code,
        name: row.name,
        amount: 0,
        indent: row.indent,
      });
      return;
    }

    sheetDisplay.push({
      code: row.code,
      name: row.name,
      amount: account.amount,
      indent: row.indent,
    });
  });

  return sheetDisplay;
}

// Depreciated: (20240702 - Murky) This is for testing purpose
// add this to package json can run:
// "account-tree": "ts-node -r tsconfig-paths/register --compiler-options '{\"module\":\"CommonJS\"}' src/lib/utils/account.ts"
// export async function main() {
//     const accounts = await findManyAccountsInPrisma(
//         PUBLIC_COMPANY_ID,
//         false,
//         1,
//         Number.MAX_SAFE_INTEGER,
//         AccountType.ASSET,
//         undefined,
//         false
//     );
//     const forest = buildAccountForest(accounts);

//     const accountIdAmountPair = await getSumOfLineItemsGroupByAccountInPrisma(
//         PUBLIC_COMPANY_ID,
//         AccountType.ASSET,
//         0,
//         999999999
//     );

//     const updatedForest = updateAccountAmounts(forest, accountIdAmountPair);

//     const accountMap = transformForestToMap(updatedForest);
//     const sheetDisplay = mappingAccountToSheetDisplay(accountMap, balanceSheetMapping);

//     // eslint-disable-next-line no-console
//     console.log(JSON.stringify(sheetDisplay.slice(0, 10), null, 2));
//     // console.log(JSON.stringify(updatedTree.children.filter((child) => child.code === '11XX')[0].children.filter((child) => child.code === '1100'), null, 2));
// }

// main();
