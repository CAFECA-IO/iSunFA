import { IAccount } from "@/constants/accounts";

export interface IAccountingAccount extends IAccount {
  id?: string; // Info: (20260703 - Julian) 標準科目沒有 id，所以設為 optional
  accountBookId?: string; // Info: (20260703 - Julian) 所屬帳本 ID，只有自訂科目有
  createdAt?: number;
  updatedAt?: number;
  isCustom: boolean; // Info: (20260703 - Julian) Use boolean flag to distinguish standard/custom
}

export interface IAccountingAccountInput {
  parentCode: string;
  name: string;
  code: string;
  description?: string;
}
