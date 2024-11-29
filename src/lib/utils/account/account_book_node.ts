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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface IAccountBookLedgerJSON extends ILineItemEntity {
  creditAmount: number;
  debitAmount: number;
  balance: number;
}

/* Info: (20241117 - Luphia)
 * 實作 IAccountBookNode
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    // FIXME: Deprecated: (20241130 - Shirley) for dev
    // eslint-disable-next-line no-console
    console.log('toJSON called in AccountBookNode');
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
