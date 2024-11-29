import { ILineItemEntity } from '@/interfaces/line_item';
import {
  IAccountBookLedgerJSON,
  IAccountBookNode,
  IAccountBookNodeJSON,
} from '@/lib/utils/account/account_book_node';

/* Info: (20241117 - Luphia) 需求描述
 * 公司內帳以會計憑證為核心，記錄公司所有經濟活動
 * 公司外帳以會計傳票為核心，將所有內帳根據會計準則轉換為合規的會計科目
 * 公司從 2022/01/01 開始使用新的會計系統
 * 輸出 2024/10/31 的資產負債表 (Murky)
 * 輸出 2024/10/01 - 2024/10/31 的所有會計科目試算表 (Shirley)
 * 內容大綱：
 * 1. 設計資料結構 (建構框架)
 * 2. 實作演算法 (輸入內容)
 * 3. 說明使用方法
 */

/* Info: (20241117 - Luphia)
 * 設計一個 Account Book 的資料結構，參考 N-ary Tree 的架構
 * 具備 nodes 屬性，以 Map 的方式儲存所有節點，key 為節點的 id，value 為節點本身
 * 具備 toJSON 方法，將樹狀結構轉換為 JSON 格式，可帶入 filter 來篩選需要的屬性，可產出 Trial Balance 要的資料
 * 具備 toLedgerJSON 方法，將樹狀結構轉換為 Ledger JSON 格式，可帶入 filter 來篩選需要的屬性
 * 具備 findNode 方法，用來尋找特定的節點
 * 具備 findNodes 方法，用來尋找特定的節點，並回傳所有符合條件的節點
 * 具備 insertNode 方法，用來插入新的節點
 * 具備 deleteNode 方法，用來刪除特定的節點
 * 具備 addDate 方法，用來更新特定的節點
 * 具備 traverse 方法，用來遍歷整個樹狀結構
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface IAccountBook {
  nodes: Map<number, IAccountBookNode>;
  toJSON(): IAccountBookNodeJSON[];
  findNode(id: number): IAccountBookNode | null;
  findNodes(filter: (node: IAccountBookNode) => boolean): IAccountBookNode[];
  insertNode(node: IAccountBookNode): void;
  deleteNode(id: number): void;
  addData(data: ILineItemEntity): void;
  traverse(callback: (node: IAccountBookNode) => void): void;
}

/* Info: (20241118 - Luphia)
 * 實作 IAccountBook
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class AccountBook implements IAccountBook {
  nodes: Map<number, IAccountBookNode>;

  constructor() {
    this.nodes = new Map();
  }

  toJSON(): IAccountBookNodeJSON[] {
    // Info: (20241118 - Luphia) 篩選出 root 節點 (parent 為 null)
    const roots = Array.from(this.nodes.values()).filter((node) => node.parent === null);
    const result = roots.map((root) => root.toJSON());
    return result;
  }

  toLedgerJSON(): IAccountBookLedgerJSON[] {
    // Info: (20241118 - Luphia) 獲得每個子節點的 Ledger JSON 格式
    const rawDate = Array.from(this.nodes.values())
      // Info: (20241118 - Luphia) 根據 code 排序節點
      .sort((a, b) => a.code.localeCompare(b.code))
      .map((node) => node.toLedgerJSON());

    // Info: (20241118 - Luphia) 合併所有子節點的 Ledger JSON Array
    const result = rawDate.flat();

    return result;
  }

  findNode(id: number): IAccountBookNode | null {
    const node = this.nodes.get(id) || null;
    return node;
  }

  findNodes(filter: (node: IAccountBookNode) => boolean): IAccountBookNode[] {
    const nodes = Array.from(this.nodes.values()).filter(filter);
    return nodes;
  }

  // Info: (20241118 - Luphia) 需注意應優先插入父節點，再插入子節點，插入節點時應同時更新父節點的 children 屬性
  insertNode(node: IAccountBookNode): void {
    this.nodes.set(node.id, node);
    if (node.parentId) {
      // ToDo: (20241118 - Luphia) IAccountNode id 為 number, parentCode 為 string 是不合理的，應統一為 number
      const { parentId } = node;
      const parent = this.findNode(parentId);
      if (parent) {
        parent.addChild(node);
        node.addParent(parent);
      } else {
        // ToDo: (20241118 - Luphia) 父節點不存在時應拋出錯誤
      }
    }
  }

  deleteNode(id: number): void {
    const node = this.findNode(id);
    // Info: (20241118 - Luphia) 刪除節點時應同時更新父節點的 children 屬性
    if (node) {
      node.parent?.removeChild(node);
    }
    // Info: (20241118 - Luphia) 刪除 Map 中的節點
    this.nodes.delete(id);
  }

  addData(data: ILineItemEntity): void {
    const node = this.findNode(data.accountId);
    if (node) {
      node.addData(data);
    }
  }

  traverse(callback: (node: IAccountBookNode) => void): void {
    this.nodes.forEach(callback);
  }
}

// const accountBook = new AccountBook();

// function isProfitAndLossAccount(node: any): boolean {
//   // 根據科目的屬性判斷是否為損益表科目
//   // 例如，type 為 'expense' 或 'income' 等
//   return node.type === 'expense' || node.type === 'income';
// }

// function getInitialBalanceForAccount(accountId: number): { credit: number; debit: number } {
//   // 實作獲取期初餘額的邏輯
//   // 例如，從資料庫中查詢或根據其他條件計算
//   // 此處僅提供示例
//   return { credit: 1000, debit: 500 };
// }

// async function initializeInitialBalances(accountBook: AccountBook): Promise<void> {
//   accountBook.traverse((node) => {
//     if (isProfitAndLossAccount(node)) {
//       node.setInitialCredit(0);
//       node.setInitialDebit(0);
//     } else {
//       // 假設有一個函數來獲取期初餘額
//       const initialBalance = getInitialBalanceForAccount(node.id);
//       node.setInitialCredit(initialBalance.credit);
//       node.setInitialDebit(initialBalance.debit);
//     }
//   });
// }

// export { initializeInitialBalances };

// export default accountBook;

/* Info: (20241118 - Luphia) 使用案例 Company 10000007 AnnaCryCryCry
 * 會計科目取 system = 'IFRS' and company_id = 1002 (公用) 10000007 (AnnaCryCryCry)
 * 會計傳票清單 vlist 取 company_id = 10000007 (AnnaCryCryCry)
 * 傳票 line item 取 voucher_id in vlist
 * 1. 建立 2024/10/31 的資產負債表
 *    a. 建立空白帳本
 *    b. 插入所有會計科目
 *    c. 插入從 2022/01/01 到 2024/10/31 的所有會計傳票
 *    d. 輸出所有會計科目試算表
 *    e. 篩選資產負債表需要的會計科目與屬性
 * 2. 建立 2024/10/01 - 2024/10/31 的所有會計科目試算表
 *    a. 計算期初餘額
 *       1. 建立空白帳本
 *       2. 插入所有會計科目
 *       3. 插入從 2022/01/01 到 2024/09/30 的所有會計傳票
 *       4. 輸出所有會計科目試算表
 *    b. 計算期中數據
 *       1. 建立空白帳本
 *       2. 插入所有會計科目
 *       3. 插入從 2024/10/01 到 2024/10/31 的所有會計傳票
 *       4. 輸出所有會計科目試算表
 *    c. 計算期末餘額
 *       1. 建立空白帳本
 *       2. 插入所有會計科目
 *       3. 插入從 2022/01/01 到 2024/10/31 的所有會計傳票
 *       4. 輸出所有會計科目試算表
 *    d. 篩選試算表所需會計科目與屬性
 */

/* line item example
SELECT
  line_item.*
FROM
  line_item
  FULL JOIN voucher ON line_item.voucher_id = voucher.id
WHERE
  voucher.company_id = 10000007
  AND line_item.deleted_at IS NULL

id account debit accountId voucherId createAT updateAt deleteAt
10000313 10000 false 10000601 10000089 1729493349 1729493349 NULL
10000314 10000 true 10000608 10000089 1729493349 1729493349 NULL
10000315 10000 false 10000369 10000090 1729494105 1729494105 NULL
10000316 10000 true 10000603 10000090 1729494105 1729494105 NULL
10000338 10000 true 10000603 10000097 1729566855 1729566855 NULL
10000339 5000 false 10001032 10000097 1729566855 1729566855 NULL
10000340 5000 false 10000568 10000097 1729566855 1729566855 NULL
10000343 10000 false 10000568 10000099 1729569412 1729569412 NULL
10000344 10000 true 10000969 10000099 1729569412 1729569412 NULL
 */

/* account example
SELECT
  account.*
FROM
  account
WHERE
  account.id in (10000601, 10000608, 10000369, 10000603, 10001032, 10000568, 10000969)

id companyId system type debit liquidity code name for_user level parent_code root_code create_at update_at deleted_at
10000369 1002 IFRS expense true true 6213 管理費用 - 旅費 true  2 6200 6213 0 0 NULL
10000568 1002 IFRS equity false false 3110 普通股股本 true 2 3100 3110 0 0 NULL
10000601 1002 IFRS asset true true 1101 庫存現金 true 3 1100 1100 0 0 NULL
10000603 1002 IFRS asset true true 1103 銀行存款 true 3 1100 1100 0 0 NULL
10000608 1002 IFRS asset true true 1113 強制透過損益按公允價值衡量之金融資產－流動 true 3 1110 1110 0 0 NULL
10000969 1002 IFRS liability false true 2121 持有供交易金融負債－流動 true 3 2120 2120 0 0 NULL
10001032 1002 IFRS liability false false 2552 保固之長期負債準備 true 3 2550 2550 0 0 NULL
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
