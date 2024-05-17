import { ProgressStatus } from '@/constants/account';
import { isProgressStatus } from '@/lib/utils/type_guard/account';

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

// Info Murky (20240416): Interface
export interface IAccountResultStatus {
  resultId: string;
  status: ProgressStatus;
}

export function isIAccountResultStatus(value: unknown): value is IAccountResultStatus {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { resultId, status } = value as IAccountResultStatus;
  return typeof resultId === 'string' && isProgressStatus(status);
}

export type DetailAccountingAccountOrEmpty = IDetailAccountingAccount | null;

export type AccountingAccountOrEmpty = IAccountingAccount | null;
