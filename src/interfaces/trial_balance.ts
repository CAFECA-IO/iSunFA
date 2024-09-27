import { IPaginatedData } from '@/interfaces/pagination';

export interface TrialBalanceItem {
  id: number;
  no: string;
  accountingTitle: string;
  beginningCreditAmount: number;
  beginningDebitAmount: number;
  midtermCreditAmount: number;
  midtermDebitAmount: number;
  endingCreditAmount: number;
  endingDebitAmount: number;
  createAt: number;
  updateAt: number;
  subAccounts: TrialBalanceItem[];
}

export interface ITotal {
  beginningCreditAmount: number;
  beginningDebitAmount: number;
  midtermCreditAmount: number;
  midtermDebitAmount: number;
  endingCreditAmount: number;
  endingDebitAmount: number;
  createAt: number;
  updateAt: number;
}

export interface TrialBalanceResponse {
  currency: string;
  items: IPaginatedData<TrialBalanceItem[]>;
  total: ITotal;
}
