import { ProgressStatus } from '@/constants/account';

export interface IAccount {
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

export type DetailAccountingAccountOrEmpty = IAccount | null;
