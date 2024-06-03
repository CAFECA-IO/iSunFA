import { ProgressStatus } from '@/constants/account';

export interface IAccount {
  id: number;
  type: string;
  liquidity: boolean;
  account: string;
  code: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

// Info Murky (20240416): Interface
export interface IAccountResultStatus {
  resultId: string;
  status: ProgressStatus;
}
