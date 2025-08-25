import { VoucherType } from '@/constants/account';
import { LabelType } from '@/constants/ledger';
import { IPaginatedData } from '@/interfaces/pagination';

export interface ILedgerQueryParams {
  startDate: number;
  endDate: number;
  startAccountNo?: string;
  endAccountNo?: string;
  labelType?: LabelType;
  page?: number;
  pageSize?: number;
}

export type ILedgerItem = {
  id: number;
  accountId: number;
  voucherId: number;
  voucherDate: number;
  no: string;
  accountingTitle: string;
  voucherNumber: string;
  voucherType: VoucherType;
  particulars: string;
  debitAmount: string;
  creditAmount: string;
  balance: string;
  createdAt: number;
  updatedAt: number;
};

export type ILedgerTotal = {
  totalDebitAmount: string;
  totalCreditAmount: string;
  createdAt: number;
  updatedAt: number;
};

export type ILedgerNote = {
  currencyAlias: string;
  total: ILedgerTotal;
};

export interface ILedgerPayload extends IPaginatedData<ILedgerItem[]> {
  note: string;
}

export const MOCK_RESPONSE: ILedgerPayload = {
  data: [
    {
      id: 1,
      accountId: 1341,
      voucherId: 1,
      voucherDate: 1706745600,
      no: '1141',
      accountingTitle: '應收帳款',
      voucherNumber: 'ZV2024-001',
      particulars: '設備採購',
      debitAmount: '300000.00',
      creditAmount: '0.00',
      balance: '420000.00',
      voucherType: VoucherType.RECEIVE,
      createdAt: 1706745600,
      updatedAt: 1706745600,
    },
    {
      id: 2,
      accountId: 1342,
      voucherId: 2,
      voucherDate: 1706745600,
      no: '1142',
      accountingTitle: '應收票據',
      voucherNumber: 'ZV2024-002',
      particulars: '開立發票',
      debitAmount: '500000.00',
      creditAmount: '0.00',
      balance: '500000.00',
      voucherType: VoucherType.RECEIVE,
      createdAt: 1706745600,
      updatedAt: 1706745600,
    },
    {
      id: 3,
      accountId: 1343,
      voucherId: 3,
      voucherDate: 1706745600,
      no: '2141',
      accountingTitle: '應付帳款',
      voucherNumber: 'ZV2024-003',
      particulars: '原物料採購',
      debitAmount: '0.00',
      creditAmount: '200000.00',
      balance: '-200000.00',
      voucherType: VoucherType.EXPENSE,
      createdAt: 1706745600,
      updatedAt: 1706745600,
    },
    {
      id: 4,
      accountId: 1344,
      voucherId: 4,
      voucherDate: 1706745600,
      no: '1111',
      accountingTitle: '銀行存款',
      voucherNumber: 'ZV2024-004',
      particulars: '資金調度',
      debitAmount: '100000.00',
      creditAmount: '0.00',
      balance: '100000.00',
      voucherType: VoucherType.TRANSFER,
      createdAt: 1706745600,
      updatedAt: 1706745600,
    },
  ],
  page: 1,
  totalPages: 1,
  totalCount: 4,
  pageSize: 10,
  hasNextPage: false,
  hasPreviousPage: false,
  sort: [
    {
      sortBy: 'voucherDate',
      sortOrder: 'asc',
    },
  ],
  note: JSON.stringify({
    currencyAlias: 'TWD',
    total: {
      totalDebitAmount: '800000.00',
      totalCreditAmount: '800000.00',
      createdAt: 1706745600,
      updatedAt: 1708854635,
    },
  }),
};
