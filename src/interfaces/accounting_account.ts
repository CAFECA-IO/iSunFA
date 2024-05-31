import { ProgressStatus } from '@/constants/account';

export interface IAccountingAccount {
  id: number;
  code: number;
  account: string;
  amount: number;
}

export interface IDetailAccountingAccount {
  id: number;
  type: string;
  liquidity: boolean;
  account: string;
  code: string;
  name: string;
}

// Info Murky (20240416): Interface
export interface IAccountResultStatus {
  resultId: string;
  status: ProgressStatus;
}

export type DetailAccountingAccountOrEmpty = IDetailAccountingAccount | null;

export type AccountingAccountOrEmpty = IAccountingAccount | null;
