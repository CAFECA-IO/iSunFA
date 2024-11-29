import {
  IAccountBookLedgerJSON,
  IAccountBookNode,
  IAccountBookNodeJSON,
} from '@/interfaces/account_book_node';
import { IAccountNode } from '@/interfaces/accounting_account';
import { ILineItemEntity } from '@/interfaces/line_item';

/* Info: (20241117 - Luphia) 需求描述
 * 公司內帳已會計憑證為核心，記錄公司所有經濟活動
 * 公司外帳已會計傳票為核心，將所有內帳根據會計準則轉換為合規的會計科目
 * 公司從 2022/01/01 開始使用新的會計系統
 * 輸出 2024/10/31 的資產負債表 (Murky)
 * 輸出 2024/10/01 - 2024/10/31 的所有會計科目試算表 (Shirley)
 * 內容大綱：
 * 1. 設計資料結構 (建構框架)
 * 2. 實作演算法 (輸入內容)
 * 3. 說明使用方法
 */

/* Info: (20241117 - Luphia)
 * 實作 IAccountBookNode
 */
export class AccountBookNode implements IAccountBookNode {
  id: number;

  companyId: number;

  system: string;

  type: string;

  debit: boolean;

  liquidity: boolean;

  code: string;

  name: string;

  forUser: boolean = false;

  parentCode: string;

  rootCode: string;

  level: number;

  amount: number;

  createdAt: number;

  updatedAt: number;

  deletedAt: number | null;

  datas: ILineItemEntity[];

  initialCredit: number;

  initialDebit: number;

  parent: IAccountBookNode | null;

  children: IAccountBookNode[];

  parentId: number;

  rootId: number;

  note: string;

  constructor(account: IAccountNode) {
    this.id = account.id;
    this.companyId = account.companyId;
    this.system = account.system;
    this.type = account.type;
    this.debit = account.debit;
    this.liquidity = account.liquidity;
    this.code = account.code;
    this.name = account.name;
    this.forUser = account.forUser;
    this.parentCode = account.parentCode;
    this.rootCode = account.rootCode;
    this.level = account.level;
    this.amount = account.amount;
    this.createdAt = account.createdAt;
    this.updatedAt = account.updatedAt;
    this.deletedAt = account.deletedAt;
    this.datas = [];
    this.initialCredit = 0;
    this.initialDebit = 0;
    this.parent = null;
    this.children = [];
    this.parentId = account.parentId;
    this.rootId = account.rootId;
    this.note = account.note ?? '';
  }

  addParent(parent: IAccountBookNode): void {
    // Info: (20241117 - Luphia) 需考量 parent 屬性是否為 null，若不為 null 則需先觸發舊有的 parent 的 removeChild 方法
    if (this.parent) {
      this.parent.removeChild(this);
    }
    this.parent = parent;
    parent.addChild(this);
  }

  addChild(child: IAccountBookNode): void {
    this.children.push(child);
  }

  removeChild(child: IAccountBookNode): void {
    const index = this.children.findIndex((item) => item.id === child.id);
    if (index !== -1) {
      this.children.splice(index, 1);
    }
  }

  addData(data: ILineItemEntity): void {
    this.datas.push(data);
  }

  setInitialCredit(amount: number): void {
    this.initialCredit = amount;
  }

  setInitialDebit(amount: number): void {
    this.initialDebit = amount;
  }

  getBalance(): number {
    // Info: (20241117 - Luphia) 計算所有子節點的餘額加總
    const childrenBalance = this.children.reduce((acc, cur) => {
      const result = acc + cur.getBalance();
      return result;
    }, 0);

    // Info: (20241117 - Luphia) 計算自己的餘額，需考量 lineItem debit 屬性決定相加或相減
    const myBalance = this.datas.reduce((acc, cur) => {
      const result = this.debit === cur.debit ? acc + cur.amount : acc - cur.amount;
      return result;
    }, 0);

    // Info: (20241117 - Luphia) balance 為該節點與其所有子節點加總後的餘額
    const balance = myBalance + childrenBalance;
    return balance;
  }

  getSummary(): { debit: number; credit: number } {
    // Info: (20241117 - Luphia) 取得所有子節點的摘要資訊
    const childrenSummary = this.children.reduce(
      (acc, cur) => {
        acc.debit += cur.getSummary().debit;
        acc.credit += cur.getSummary().credit;
        return acc;
      },
      { debit: 0, credit: 0 }
    );

    // Info: (20241117 - Luphia) 計算自己的摘要資訊，需考量 debit 屬性決定歸類 debit 或 credit
    const mySummary = this.datas.reduce(
      (acc, cur) => {
        if (cur.debit) {
          acc.debit += cur.amount;
        } else {
          acc.credit += cur.amount;
        }
        return acc;
      },
      { debit: 0, credit: 0 }
    );

    // Info: (20241117 - Luphia) summary 為該節點與其所有子節點的摘要資訊加總
    const summary = {
      debit: mySummary.debit + childrenSummary.debit,
      credit: mySummary.credit + childrenSummary.credit,
    };
    return summary;
  }

  toJSON(): IAccountBookNodeJSON {
    const children = this.children.map((child) => child.toJSON());
    const balance = this.getBalance();
    const summary = this.getSummary();
    return {
      id: this.id,
      companyId: this.companyId,
      system: this.system,
      type: this.type,
      debit: this.debit,
      liquidity: this.liquidity,
      code: this.code,
      name: this.name,
      forUser: this.forUser,
      parentCode: this.parentCode,
      rootCode: this.rootCode,
      parentId: this.parentId,
      rootId: this.rootId,
      note: this.note,
      level: this.level,
      amount: this.amount,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt,
      datas: this.datas,
      children,
      balance,
      summary,
    };
  }

  toLedgerJSON(): IAccountBookLedgerJSON[] {
    let creditAmount = this.initialCredit;
    let debitAmount = this.initialDebit;
    let balance = this.debit
      ? this.initialDebit - this.initialCredit
      : this.initialCredit - this.initialDebit;
    const ledgers = this.datas
      // Info: (20241118 - Luphia) 先依照 lineItem.id 由小到大排序
      .sort((a, b) => a.id - b.id)
      // Info: (20241118 - Luphia) 再依照 voucher.date 的日期由舊到新排序
      .sort((a, b) => (a.voucher?.date ?? 0) - (b.voucher?.date ?? 0))
      // Info: (20241118 - Luphia) 依序計算餘額
      .map((lineItem) => {
        if (lineItem.debit) {
          debitAmount += lineItem.amount;
          balance += lineItem.amount;
        } else {
          creditAmount += lineItem.amount;
          balance -= lineItem.amount;
        }
        const ledger = {
          ...lineItem,
          creditAmount,
          debitAmount,
          balance,
        };
        return ledger;
      });
    return ledgers;
  }
}
