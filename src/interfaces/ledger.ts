import { IPaginatedData } from '@/interfaces/pagination';

export interface ILedgerQueryParams {
  startDate: number;
  endDate: number;
  startAccountNo?: string;
  endAccountNo?: string;
  labelType?: string;
  page?: number;
  pageSize?: number;
}

export interface ILedgerItem {
  id: number;
  voucherDate: number;
  no: string;
  accountingTitle: string;
  voucherNumber: string;
  particulars: string;
  debitAmount: number;
  creditAmount: number;
  balance: number;
  createAt: number;
  updateAt: number;
}

export interface ILedgerPayload {
  currency: string;
  items: IPaginatedData<ILedgerItem[]>;
  totalDebitAmount: number;
  totalCreditAmount: number;
}

export interface ILedgerResponse {
  powerby: string;
  success: boolean;
  code: string;
  message: string;
  payload: ILedgerPayload;
}
