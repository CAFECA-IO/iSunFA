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

export interface ILedgerTotal {
  totalDebitAmount: number;
  totalCreditAmount: number;
  createAt: number;
  updateAt: number;
}

export interface ILedgerPayload {
  currencyAlias: string;
  items: IPaginatedData<ILedgerItem[]>;
  total: ILedgerTotal;
}

export const MOCK_RESPONSE: ILedgerPayload = {
  currencyAlias: 'TWD',
  items: {
    data: [
      {
        id: 1,
        voucherDate: 1706745600,
        no: '1141',
        accountingTitle: '應收帳款',
        voucherNumber: 'ZV2024-001',
        particulars: '設備採購',
        debitAmount: 300000,
        creditAmount: 0,
        balance: 420000,
        createAt: 1706745600,
        updateAt: 1706745600,
      },
      {
        id: 2,
        voucherDate: 1706745600,
        no: '1142',
        accountingTitle: '應收票據',
        voucherNumber: 'ZV2024-002',
        particulars: '開立發票',
        debitAmount: 500000,
        creditAmount: 0,
        balance: 500000,
        createAt: 1706745600,
        updateAt: 1706745600,
      },
    ],
    page: 1,
    totalPages: 1,
    totalCount: 2,
    pageSize: 10,
    hasNextPage: false,
    hasPreviousPage: false,
    sort: [
      {
        sortBy: 'voucherDate',
        sortOrder: 'asc',
      },
    ],
  },
  total: {
    totalDebitAmount: 800000,
    totalCreditAmount: 800000,
    createAt: 1706745600,
    updateAt: 1708854635,
  },
};
