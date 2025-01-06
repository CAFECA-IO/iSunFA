import { ILineItemSimpleAccountVoucher } from '@/interfaces/line_item';
import { IPaginatedData } from '@/interfaces/pagination';

// Info: (20241118 - Shirley) 在計算試算表過程會用到的資料結構
export interface LineItemTemp {
  id: number;
  amount: number;
  description: string;
  debit: boolean;
  accountId: number;
  voucherId: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  voucher: {
    id: number;
    date: number;
  };
}

// Info: (20241118 - Shirley) 在計算試算表過程會用到的資料結構
export interface AccountWithSubTemp {
  id: number;
  code: string;
  name: string;
  subAccounts: AccountWithSubTemp[];
  lineItem: LineItemTemp[];
}

// Info: (20241118 - Shirley) 在計算試算表過程會用到的資料結構
export interface AccountForResult {
  id: number;
  no: string;
  accountingTitle: string;
  beginningCreditAmount: number;
  beginningDebitAmount: number;
  midtermCreditAmount: number;
  midtermDebitAmount: number;
  endingCreditAmount: number;
  endingDebitAmount: number;
  subAccounts: AccountForResult[];
  createAt: number;
  updateAt: number;

  parentCode: string;
}

export interface ILineItemInTrialBalanceItem extends ILineItemSimpleAccountVoucher {
  debitAmount: number;
  creditAmount: number;
}

export interface ILineItemInTrialBalanceItemWithHierarchy extends ILineItemInTrialBalanceItem {
  children: ILineItemInTrialBalanceItem[];
}

export interface ILineItemInTrialBalanceTotal {
  totalDebit: number;
  totalCredit: number;
}

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

export interface ITrialBalanceData {
  items: TrialBalanceItem[];
  total: ITrialBalanceTotal;
}

export interface IPaginatedTrialBalance extends IPaginatedData<TrialBalanceItem[]> {}

export interface ITrialBalancePayload {
  currencyAlias: string;
  items: IPaginatedTrialBalance;
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
        beginningCreditAmount: 10,
        beginningDebitAmount: 1785000,
        midtermCreditAmount: 10,
        midtermDebitAmount: 1785000,
        endingCreditAmount: 10,
        endingDebitAmount: 1785000,
        createAt: 1704067200,
        updateAt: 1704067200,
        subAccounts: [
          {
            id: 114100, // generate in backend instead of getting from db,
            no: '114100',
            accountingTitle: '應收帳款', // shadow the default accounting title
            beginningCreditAmount: 10,
            beginningDebitAmount: 1785000,
            midtermCreditAmount: 10,
            midtermDebitAmount: 1785000,
            endingCreditAmount: 10,
            endingDebitAmount: 1785000,
            createAt: 1704067200,
            updateAt: 1704067200,
            subAccounts: [],
          },
          {
            id: 2,
            no: '114101',
            accountingTitle: '應收帳款-A公司',
            beginningCreditAmount: 10,
            beginningDebitAmount: 1785000,
            midtermCreditAmount: 10,
            midtermDebitAmount: 1785000,
            endingCreditAmount: 10,
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
        subAccounts: [
          {
            id: 115100, // generate in backend instead of getting from db,
            no: '115100',
            accountingTitle: '其他應收款', // shadow the default accounting title
            beginningCreditAmount: 10,
            beginningDebitAmount: 1785000,
            midtermCreditAmount: 10,
            midtermDebitAmount: 1785000,
            endingCreditAmount: 10,
            endingDebitAmount: 1785000,
            createAt: 1704067200,
            updateAt: 1704067200,
            subAccounts: [],
          },
        ],
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
