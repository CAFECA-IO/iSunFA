import { IAccountNode } from '@/interfaces/accounting_account';
import { ILineItemEntity } from '@/interfaces/line_item';

/* Info: (20241117 - Luphia)
 * 設計一個節點的資料結構，用來作為 Account Book 的節點
 * 繼承 IAccount 格式
 * 具備 datas 屬性，格式為 ILineItemEntity[]
 * 具備 initialDebit 屬性，格式為 number
 * 具備 initialCredit 屬性，格式為 number
 * 具備 parent 屬性，格式為 IAccountBookNode
 * 具備 children 屬性，格式為 IAccountBookNode[]
 * 具備 addParent 方法，用來新增父節點，並觸發父節點的 addChild 方法，以及舊有父節點的 removeChild 方法
 * 具備 addChild 方法，用來新增子節點
 * 具備 removeChild 方法，用來刪除子節點，屬於 optional 方法
 * 具備 addData 方法，用來新增資料到 data 屬性
 * 具備 setInitialDebit 方法，用來設定期初借方餘額 (Ledger 用)
 * 具備 setInitialCredit 方法，用來設定期初貸方餘額 (Ledger 用)
 * 具備 getBalance 方法，用來取得該節點與其所有子節點加總後的餘額 (會計報表用)
 * 具備 getSummary 方法，用來取得該節點與其所有子節點的摘要資訊 (會計科目試算表用)
 * 具備 toJSON 方法，將節點轉換為 JSON 格式，可帶入 filter 來篩選需要的屬性，另外加入 balance 與 summary 屬性
 * 具備 toLedgerJSON 方法，將節點轉換為 Ledger JSON 格式，把所有 lineItem 轉換為 Ledger 格式並依序排列
 */
export interface IAccountBookNode extends IAccountNode {
  datas: ILineItemEntity[];
  initialCredit: number;
  initialDebit: number;
  parent: IAccountBookNode | null;
  children: IAccountBookNode[];
  addParent(parent: IAccountBookNode): void;
  addChild(child: IAccountBookNode): void;
  removeChild(child: IAccountBookNode): void;
  addData(data: ILineItemEntity): void;
  setInitialCredit(amount: number): void;
  setInitialDebit(amount: number): void;
  getBalance(): number;
  getSummary(): { debit: number; credit: number };
  toJSON(filter?: string[]): IAccountBookNodeJSON;
  toLedgerJSON(filter?: string[]): IAccountBookLedgerJSON[];
}

/* Info: (20241117 - Luphia)
 * 宣告 IAccountBookNodeJSON 介面，用來描述 Account Book 的 JSON 格式
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface IAccountBookNodeJSON extends IAccountNode {
  datas: ILineItemEntity[];
  children: IAccountBookNodeJSON[];
  balance: number;
  summary: { debit: number; credit: number };
}

/* Info: (20241117 - Luphia)
 * 宣告 ILedger 介面，用來描述 Account Book 匯出的 Ledger JSON 格式
 */
export interface IAccountBookLedgerJSON extends ILineItemEntity {
  creditAmount: number;
  debitAmount: number;
  balance: number;
}
