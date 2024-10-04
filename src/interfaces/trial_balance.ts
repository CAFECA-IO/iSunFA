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

export interface ITrialBalanceTotal {
  beginningCreditAmount: number;
  beginningDebitAmount: number;
  midtermCreditAmount: number;
  midtermDebitAmount: number;
  endingCreditAmount: number;
  endingDebitAmount: number;
  createAt: number;
  updateAt: number;
}

export interface ITrialBalancePayload {
  currencyAlias: string;
  items: IPaginatedData<TrialBalanceItem[]>;
  total: ITrialBalanceTotal;
}

export const MOCK_RESPONSE: ITrialBalancePayload = {
  currencyAlias: 'TWD',
  items: {
    data: [
      {
        id: 1,
        no: '1141',
        accountingTitle: '應收帳款',
        beginningCreditAmount: 0,
        beginningDebitAmount: 1785000,
        midtermCreditAmount: 0,
        midtermDebitAmount: 1785000,
        endingCreditAmount: 0,
        endingDebitAmount: 1785000,
        createAt: 1704067200,
        updateAt: 1704067200,
        subAccounts: [
          {
            id: 2,
            no: '114101',
            accountingTitle: '應收帳款-A公司',
            beginningCreditAmount: 0,
            beginningDebitAmount: 1785000,
            midtermCreditAmount: 0,
            midtermDebitAmount: 1785000,
            endingCreditAmount: 0,
            endingDebitAmount: 1785000,
            createAt: 1704067200,
            updateAt: 1704067200,
            subAccounts: [],
          },
        ],
      },
      {
        id: 3,
        no: '1151',
        accountingTitle: '其他應收款',
        beginningCreditAmount: 0,
        beginningDebitAmount: 500000,
        midtermCreditAmount: 0,
        midtermDebitAmount: 500000,
        endingCreditAmount: 0,
        endingDebitAmount: 500000,
        createAt: 1704067200,
        updateAt: 1704067200,
        subAccounts: [],
      },
    ],
    page: 1,
    totalPages: 1,
    totalCount: 2,
    pageSize: 2,
    hasNextPage: false,
    hasPreviousPage: false,
    sort: [
      {
        sortBy: 'createdAt',
        sortOrder: 'asc',
      },
    ],
  },
  total: {
    beginningCreditAmount: 0,
    beginningDebitAmount: 2285000,
    midtermCreditAmount: 0,
    midtermDebitAmount: 2285000,
    endingCreditAmount: 0,
    endingDebitAmount: 2285000,
    createAt: 1704067200,
    updateAt: 1704067200,
  },
};
