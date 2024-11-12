import { ILedgerResponse } from '@/lib/utils/zod_schema/ledger';
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

export type ILedgerItem = ILedgerResponse['items']['data'][number];
export type ILedgerTotal = ILedgerResponse['total'];

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
        voucherType: VoucherType.RECEIVE,
        createdAt: 1706745600,
        updatedAt: 1706745600,
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
        voucherType: VoucherType.RECEIVE,
        createdAt: 1706745600,
        updatedAt: 1706745600,
      },
      {
        id: 3,
        voucherDate: 1706745600,
        no: '2141',
        accountingTitle: '應付帳款',
        voucherNumber: 'ZV2024-003',
        particulars: '原物料採購',
        debitAmount: 0,
        creditAmount: 200000,
        balance: -200000,
        voucherType: VoucherType.EXPENSE,
        createdAt: 1706745600,
        updatedAt: 1706745600,
      },
      {
        id: 4,
        voucherDate: 1706745600,
        no: '1111',
        accountingTitle: '銀行存款',
        voucherNumber: 'ZV2024-004',
        particulars: '資金調度',
        debitAmount: 100000,
        creditAmount: 0,
        balance: 100000,
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
  },
  total: {
    totalDebitAmount: 800000,
    totalCreditAmount: 800000,
    createdAt: 1706745600,
    updatedAt: 1708854635,
  },
};
