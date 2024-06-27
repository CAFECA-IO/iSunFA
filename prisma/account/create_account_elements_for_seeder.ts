import { Node } from '@/account/node';
import { AccountElement } from '@/account/account_element';
import { determineTypeDebitLiquidity } from '@/account/determine_type_debit_liquidity';

function isForUser(node: Node, type: string) {
  const allowTypes = [
    'asset',
    'liability',
    'equity',
    'revenue',
    'cost',
    'income',
    'expense',
    'gainOrLoss',
    'otherComprehensiveIncome'
  ];

  if (node.children.length > 0 && allowTypes.includes(type)) {
    return true;
  }

  return false;
}

function createAccountElement(
  node: Node,
  parent: Node,
  root: Node,
  type: string,
  debit: boolean,
  liquidity: boolean,
  forUser: boolean
): AccountElement {
  return new AccountElement(
    type,
    debit,
    liquidity,
    node.code,
    node.accountCName,
    forUser,
    parent.code,
    root.code,
  );
}

function checkForDuplicateCodes(accounts: AccountElement[], doubleCheck: Set<string>): void {
  accounts.forEach((account) => {
    if (doubleCheck.has(account.code)) {
      // Info: (20240625 - Murky) Debugging Purpose
      // eslint-disable-next-line no-console
      console.log(`Double check duplicated code: ${account.code}`);
    }
    doubleCheck.add(account.code);
  });
}

export function createAccountElementsForSeederByBFS(rootNode: Node): AccountElement[] {
  const accountsForSeeder: AccountElement[] = [];
  const codeSet = new Set<string>();
  const doubleCheck = new Set<string>();

  const queue: {
    node: Node,
    parent: Node,
    root: Node,
    parentType: string | null,
    parentDebit: boolean | null,
    parentLiquidity: boolean | null
  }[] = [];

  rootNode.children.forEach((child) => queue.push({
    node: child,
    parent: child,
    root: child,
    parentType: null,
    parentDebit: null,
    parentLiquidity: null
  }));

  while (queue.length > 0) {
    const { node, parent, root, parentType, parentDebit, parentLiquidity } = queue.shift()!;

    const { type, debit, liquidity } = determineTypeDebitLiquidity(node, parentType, parentDebit, parentLiquidity);
    const forUser = isForUser(node, type);

    const account = createAccountElement(node, parent, root, type, debit, liquidity, forUser);

    if (!codeSet.has(account.code)) {
      accountsForSeeder.push(account);
      codeSet.add(account.code);
    } else {
      // Info: (20240625 - Murky) Debugging Purpose
      // eslint-disable-next-line no-console
      console.log(`Duplicated code: ${account.code}, name: ${account.name}`);
    }

    node.children.forEach((child) => queue.push({
      node: child,
      parent: node,
      root,
      parentType: type,
      parentDebit: debit,
      parentLiquidity: liquidity
    }));
  }

  checkForDuplicateCodes(accountsForSeeder, doubleCheck);
  return accountsForSeeder;
}

export function createAccountElementsForSeederByDFS(rootNode: Node) {
  const accountsForSeeder: AccountElement[] = [];

  const codeSet = new Set<string>();
  function dfsCreateAccountElement(node: Node, parent: Node, root: Node, parentType: string | null, parentDebit: boolean | null, parentLiquidity: boolean | null) {
    const { type, debit, liquidity } = determineTypeDebitLiquidity(node, parentType, parentDebit, parentLiquidity);
    const forUser = isForUser(node, type);
    const account = createAccountElement(node, parent, root, type, debit, liquidity, forUser);

    if (!codeSet.has(account.code)) {
      accountsForSeeder.push(account);
      codeSet.add(account.code);
    } else {
      // Info: (20240625 - Murky) Debugging Purpose
      // eslint-disable-next-line no-console
      console.log(`Duplicated code: ${account.code}, name: ${account.name}`);
    }

    node.children.forEach((child) => dfsCreateAccountElement(child, node, root, type, debit, liquidity));
  }

  rootNode.children.forEach((child) => dfsCreateAccountElement(child, rootNode, rootNode, null, null, null));

  // help me check if any code is duplicated
  const doubleCheck = new Set<string>();
  checkForDuplicateCodes(accountsForSeeder, doubleCheck);
  return accountsForSeeder;
}
