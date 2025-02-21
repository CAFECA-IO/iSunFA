import prisma from '@/client';
import { AccountBook } from '@/lib/utils/account/accunt_book';
import { AccountBookNode } from '@/lib/utils/account/account_book_node';
import { IAccountNode } from '@/interfaces/accounting_account';
import { ILineItemEntity } from '@/interfaces/line_item';
import { isNodeCircularReference } from '@/lib/utils/account/common';
import { PUBLIC_ACCOUNT_BOOK_ID } from '@/constants/company';

/** Info: (20241129 - Shirley)
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

  // Info: (20241129 - Shirley) 將每個 account 轉換為 IAccountNode
  const accounts = accountRecords.map((account) => ({
    ...account,
    children: [],
    amount: 0,
  }));

  return accounts;
}

/** Info: (20241129 - Shirley)
 * 2. 用 companyId 搜尋 voucher 和相關的 line items
 */
async function getVouchersWithLineItems(
  companyId: number,
  startTimestamp: number,
  endTimestamp: number
): Promise<ILineItemEntity[]> {
  // Info: (20241129 - Shirley) 先取得該公司的所有 vouchers
  const vouchers = await prisma.voucher.findMany({
    where: {
      companyId,
      deletedAt: null,
      createdAt: {
        gte: startTimestamp,
        lte: endTimestamp,
      },
    },
    include: {
      lineItems: {
        where: {
          deletedAt: null,
        },
      },
    },
  });

  const lineItems = vouchers.flatMap((voucher) =>
    voucher.lineItems.map((item) => ({
      ...item,
    }))
  );

  return lineItems;
}

/** Info: (20241129 - Shirley)
 * 初始化 AccountBook
 */
async function initializeAccountBook(
  companyId: number,
  publicCompanyId: number,
  startTimestamp: number,
  endTimestamp: number
): Promise<AccountBook> {
  const accountBook = new AccountBook();

  // Info: (20241129 - Shirley) 1. 取得所有會計科目
  const accountRecords = await getAccounts(companyId, publicCompanyId);

  // Info: (20241129 - Shirley) 1.2 建立節點之間的層級關係
  const nodeMap: Map<number, AccountBookNode> = new Map();

  // Info: (20241129 - Shirley) 1.2 先建立所有節點
  accountRecords.forEach((account) => {
    const node = new AccountBookNode(account);
    nodeMap.set(account.id, node);
  });

  // Info: (20241129 - Shirley) 1.3 建立父子關係
  accountRecords.forEach((account) => {
    const node = nodeMap.get(account.id);
    if (node && account.parentId) {
      const parentNode = nodeMap.get(account.parentId);
      if (parentNode && !isNodeCircularReference(node, parentNode)) {
        node.addParent(parentNode);
      }
    }
  });

  // Info: (20241129 - Shirley) 1.4 插入節點到 AccountBook
  nodeMap.forEach((node) => {
    accountBook.insertNode(node);
  });

  // Info: (20241129 - Shirley) 2. 取得並處理 vouchers 和 line items
  const lineItems = await getVouchersWithLineItems(companyId, startTimestamp, endTimestamp);

  // Info: (20241129 - Shirley) 2.1 將每個 voucher 的 line item 合併到對應的 account node
  lineItems.forEach((lineItem) => {
    const node = accountBook.findNode(lineItem.accountId);
    if (node) {
      node.addData(lineItem);
    }
  });

  return accountBook;
}

/** Info: (20241203 - Shirley)
 * 透過 companyId 或 publicCompanyId 取得自訂跟預設會計科目
 */
export async function getAccountBook(
  companyId: number,
  startTimestamp: number,
  endTimestamp: number
): Promise<AccountBook> {
  const accountBookInstance = await initializeAccountBook(
    companyId,
    PUBLIC_ACCOUNT_BOOK_ID,
    startTimestamp,
    endTimestamp
  );
  return accountBookInstance;
}

export async function getTrialBalanceJSON(
  companyId: number,
  startTimestamp: number,
  endTimestamp: number
) {
  const accountBookInstance = await getAccountBook(companyId, startTimestamp, endTimestamp);
  const trialBalance = accountBookInstance.toJSON();
  return trialBalance;
}

export async function getLedgerJSON(
  companyId: number,
  startTimestamp: number,
  endTimestamp: number
) {
  const accountBookInstance = await getAccountBook(companyId, startTimestamp, endTimestamp);
  const ledger = accountBookInstance.toLedgerJSON();
  return ledger;
}
