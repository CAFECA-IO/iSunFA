import { PUBLIC_COMPANY_ID } from '@/constants/company';
import { IAccountNode } from '@/interfaces/accounting_account';
import { Account } from '@prisma/client';

// Depreciated: (20240702 - Murky) This is for testing purpose
// import { AccountType } from "@/constants/account";
// import { findManyAccountsInPrisma } from "@/lib/utils/repo/account.repo";
// import { getSumOfLineItemsGroupByAccountInPrisma } from "@/lib/utils/repo/line_item.repo";

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

export function buildAccountTree(accounts: Account[]): IAccountNode[] {
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
    newAmount += childAccount.amount;
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

export function updateAccountAmounts(
  accounts: IAccountNode,
  lineItems: { accountId: number; amount: number }[]
) {
  const lineItemsMap = new Map(lineItems.map((lineItem) => [lineItem.accountId, lineItem.amount]));
  const updatedIAccountNode = updateAccountAmountsByDFS(accounts, lineItemsMap);
  return updatedIAccountNode;
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
//     const tree = buildAccountTree(accounts);

//     const accountIdAmountPair = await getSumOfLineItemsGroupByAccountInPrisma(
//         PUBLIC_COMPANY_ID,
//         AccountType.ASSET,
//         0,
//         999999999
//     );

//     // eslint-disable-next-line no-console
//     console.log(JSON.stringify(accountIdAmountPair, null, 2));

//     const updatedTree = updateAccountAmounts(tree[0], accountIdAmountPair);

//     // eslint-disable-next-line no-console
//     console.log(JSON.stringify(updatedTree.children.filter((child) => child.code === '11XX')[0].children.filter((child) => child.code === '1100'), null, 2));
// }

// main();
