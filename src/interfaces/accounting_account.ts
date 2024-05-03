export interface IAccountingAccount {
  id: number;
  code: number;
  account: string;
  amount: number;
}

export interface IDetailAccountingAccount {
  id: number;
  type: string;
  liquidity: string;
  account: string;
  code: string;
  name: string;
}

export type DetailAccountingAccountOrEmpty = IDetailAccountingAccount | null;

export type AccountingAccountOrEmpty = IAccountingAccount | null;
