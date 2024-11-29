/* eslint-disable */
// FIXME: Deprecated: (20241130 - Shirley) for dev
import prisma from '@/client';
import { AccountBook } from '@/lib/utils/account/accunt_book';
import { AccountBookNode } from '@/lib/utils/account/account_book_node';
import { IAccountNode } from '@/interfaces/accounting_account';
import { ILineItemEntity } from '@/interfaces/line_item';
import fs from 'fs';

// 檢查是否會形成循環引用
function isCircularReference(node: AccountBookNode, newParent: AccountBookNode): boolean {
  let current = newParent;
  while (current) {
    if (current.id === node.id) {
      return true;
    }
    current = current.parent as AccountBookNode;
  }
  return false;
}

/**
 * 1. 用 companyId & publicCompanyId 搜尋 account table 取得所有會計科目
 */
async function getAccounts(companyId: number, publicCompanyId: number): Promise<IAccountNode[]> {
  const accountRecords = await prisma.account.findMany({
    where: {
      AND: [
        { deletedAt: null },
        {
          OR: [{ companyId }, { companyId: publicCompanyId }],
        },
      ],
    },
    orderBy: { code: 'asc' },
  });

  // 1.1 將每個 account 轉換為 IAccountNode
  const accounts = accountRecords.map((account) => ({
    ...account,
    children: [],
    amount: 0,
  }));

  return accounts;
}

/**
 * 2. 用 companyId 搜尋 voucher 和相關的 line items
 */
async function getVouchersWithLineItems(companyId: number): Promise<ILineItemEntity[]> {
  // 先取得該公司的所有 vouchers
  const vouchers = await prisma.voucher.findMany({
    where: {
      companyId,
      deletedAt: null,
    },
    include: {
      lineItems: {
        where: {
          deletedAt: null,
        },
      },
    },
  });

  // 將所有 line items 整理成陣列
  const lineItems = vouchers.flatMap((voucher) =>
    voucher.lineItems.map((item) => ({
      ...item,
      // voucher,
    }))
  );

  return lineItems;
}

/**
 * 初始化 AccountBook
 */
export async function initializeAccountBook(
  companyId: number,
  publicCompanyId: number
): Promise<AccountBook> {
  try {
    const accountBook = new AccountBook();

    // 1. 取得所有會計科目
    const accountRecords = await getAccounts(companyId, publicCompanyId);

    // 1.2 建立節點之間的層級關係
    const nodeMap: Map<number, AccountBookNode> = new Map();

    // 先建立所有節點
    accountRecords.forEach((account) => {
      const node = new AccountBookNode(account);
      nodeMap.set(account.id, node);
    });

    // 建立父子關係
    accountRecords.forEach((account) => {
      const node = nodeMap.get(account.id);
      if (node && account.parentId) {
        const parentNode = nodeMap.get(account.parentId);
        // if (parentNode) {
        if (parentNode && !isCircularReference(node, parentNode)) {
          node.addParent(parentNode);
        }
      }
    });

    // 1.3 插入節點到 AccountBook
    nodeMap.forEach((node) => {
      accountBook.insertNode(node);
    });

    // 2. 初始化期初餘額
    // ToDo: 實作期初餘額的設定
    // await initializeInitialBalances(accountBook);

    // 3. 取得並處理 vouchers 和 line items
    const lineItems = await getVouchersWithLineItems(companyId);

    // 3.1 將每個 voucher 的 line item 合併到對應的 account node
    lineItems.forEach((lineItem) => {
      const node = accountBook.findNode(lineItem.accountId);
      if (node) {
        node.addData(lineItem);
      }
    });

    // const newAccountBook = accountBook.toJSON();

    // eslint-disable-next-line no-console
    // console.log('accountBook in initializeAccountBook', accountBook);
    // eslint-disable-next-line no-console
    // console.log('newAccountBook in initializeAccountBook', newAccountBook);
    const nowHrMin = `${new Date().getHours()}_${new Date().getMinutes()}`;
    // write into json file
    // fs.writeFileSync(`accountBook_${nowHrMin}.json`, JSON.stringify(accountBook));

    return accountBook;
  } catch (error) {
    // FIXME: Deprecated: (20241130 - Shirley) for dev
    // eslint-disable-next-line no-console
    console.error('初始化 AccountBook 時發生錯誤:', error);
    throw error;
  }
}

/**
 * 使用範例
 */
export async function getAccountBook(companyId: number): Promise<AccountBook> {
  const PUBLIC_COMPANY_ID = 1002; // 公用會計科目的 companyId

  try {
    const accountBookInstance = await initializeAccountBook(companyId, PUBLIC_COMPANY_ID);
    // FIXME: Deprecated: (20241130 - Shirley) for dev
    // eslint-disable-next-line no-console
    // console.log('accountBookInstance in getAccountBookFunction', accountBookInstance);

    const nowHrMin = `${new Date().getHours()}_${new Date().getMinutes()}`;

    // 將 AccountBook 轉換為可序列化的格式
    const serializedData = {
      nodes: Array.from(accountBookInstance.nodes.entries()).map(([id, node]) => ({
        id,
        data: {
          ...node,
          parent: node.parent ? node.parent.id : null,
          children: node.children.map((child) => child.id),
        },
      })),
      rootNodes: accountBookInstance.toJSON(),
    };

    // write into json file
    // fs.writeFileSync(
    //   `accountBookInstance_${nowHrMin}.json`,
    //   JSON.stringify(serializedData, null, 2)
    // );

    return accountBookInstance;
  } catch (error) {
    // FIXME: Deprecated: (20241130 - Shirley) for dev
    // eslint-disable-next-line no-console
    console.error('取得 AccountBook 時發生錯誤:', error);
    throw error;
  }
}

/**
 * API 使用範例 - 取得試算表
 */
export async function getTrialBalance(companyId: number) {
  const accountBookInstance = await getAccountBook(companyId);

  const trialBalance = accountBookInstance.toJSON();

  // const trialBalance = Array.from(accountBookInstance.nodes.values()).map((node) => ({
  //   id: node.id,
  //   code: node.code,
  //   name: node.name,
  //   debit: node.getSummary().debit,
  //   credit: node.getSummary().credit,
  //   balance: node.getBalance(),
  // }));

  const nowHrMin = `${new Date().getHours()}_${new Date().getMinutes()}`;
  // write into json file
  // fs.writeFileSync(`trialBalance_${nowHrMin}.json`, JSON.stringify(trialBalance, null, 2));

  // eslint-disable-next-line no-console
  console.log('trialBalance in getTrialBalanceFunction', trialBalance);

  return trialBalance;
}

/**
 * API 使用範例 - 取得分類帳
 */
export async function getLedger(companyId: number) {
  const accountBookInstance = await getAccountBook(companyId);

  const ledger = accountBookInstance.toLedgerJSON();

  // write ledger into json file
  const nowHrMin = `${new Date().getHours()}_${new Date().getMinutes()}`;
  // fs.writeFileSync(`ledger_${nowHrMin}.json`, JSON.stringify(ledger, null, 2));

  // eslint-disable-next-line no-console
  // console.log('ledger in getLedgerFunction', ledger);

  return ledger;
}
