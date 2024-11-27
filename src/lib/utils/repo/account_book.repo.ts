import prisma from '@/client';
import { AccountBook } from '@/lib/utils/account/accunt_book';
import { AccountBookNode } from '@/lib/utils/account/account_book_node';
import { IAccountNode } from '@/interfaces/accounting_account';
// import { initializeInitialBalances } from './init_initial_balances';
// import { setupAssociations } from './setup_associations';
//
/**
 * Info: 組成 account book
 * 1. 用 companyId & publicCompanyId 搜尋 account table 取得所有會計科目
 *  1.1 將每個 account 轉換為 IAccountNode
 *  1.2 建立節點之間的層級關係
 *  1.3 插入節點到 AccountBook
 * 2. 初始化期初餘額
 * 3. 用 companyId 搜尋 voucher table 取得所有憑證
 *  3.1 將每個 voucher 的 line item 合併到 account 的 line item 裡
 * 3. 設置關聯資料
 */

// IAccountNode
export async function getAccounts(): Promise<IAccountNode[]> {
  const accountRecords = await prisma.account.findMany({
    where: { companyId: 1002, deletedAt: null },
    orderBy: { code: 'asc' },
  });

  const accounts = accountRecords.map((account) => {
    return {
      ...account,
      children: [],
      amount: 0,
    };
  });

  // 將每個賬戶記錄轉換為 AccountBookNode
  // const accountNodes = accountRecords.map((account) => {
  //   const augmentedAccount = {
  //     ...account,
  //     children: [],
  //     amount: 0,
  //   };
  //   return new AccountBookNode(augmentedAccount);
  // });

  // console.log('accountNodes', accountNodes);

  // return accountNodes;
  return accounts;
}

export async function initializeAccountBook(): Promise<AccountBook> {
  const accounts = await getAccounts();
  const accountBook = new AccountBook();

  // 創建所有節點實例
  const nodeMap: Map<number, AccountBookNode> = new Map();
  accounts.forEach((account) => {
    const augmentedAccount = {
      ...account,
      children: [], // 添加默認的 children
      amount: 0, // 添加默認的 amount
    };
    const node = new AccountBookNode(augmentedAccount);
    nodeMap.set(account.id, node);
    // const node = new AccountBookNode(account);
    // nodeMap.set(account.id, node);
  });

  // 透過 AccountBookNode 的 addParent 方法建立節點之間的層級關係
  accounts.forEach((account) => {
    const node = nodeMap.get(account.id);
    if (node && account.parentId) {
      const parentNode = nodeMap.get(account.parentId);
      if (parentNode) {
        node.addParent(parentNode);
      } else {
        // eslint-disable-next-line no-console
        console.warn(`父節點 ID ${account.parentId} 不存在。`);
      }
    }
  });

  // 插入節點到 AccountBook
  nodeMap.forEach((node) => {
    accountBook.insertNode(node);
  });

  // 初始化期初餘額
  // await initializeInitialBalances(accountBook);

  // 設置關聯資料
  // await setupAssociations(accountBook);

  return accountBook;
}

// 範例用法
// export default initializeAccountBook()
//   .then((accountBookRes) => {
//     // eslint-disable-next-line no-console
//     console.log('AccountBook 初始化完成。', accountBookRes);
//     // 您可以在此處進一步使用 accountBook，例如轉換為 JSON 或處理其他邏輯
//   })
//   .catch((error) => {
//     // eslint-disable-next-line no-console
//     console.error('初始化 AccountBook 時發生錯誤：', error);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });
