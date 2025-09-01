import { ILineItemSimpleAccountVoucher } from '@/interfaces/line_item';
import { IPaginatedData } from '@/interfaces/pagination';

// Info: (20241118 - Shirley) 在計算試算表過程會用到的資料結構
export interface LineItemTemp {
  id: number;
  amount: string;
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
  beginningCreditAmount: string;
  beginningDebitAmount: string;
  midtermCreditAmount: string;
  midtermDebitAmount: string;
  endingCreditAmount: string;
  endingDebitAmount: string;
  subAccounts: AccountForResult[];
  createAt: number;
  updateAt: number;

  parentCode: string;
}

export interface ILineItemInTrialBalanceItem extends ILineItemSimpleAccountVoucher {
  debitAmount: string;
  creditAmount: string;
}

export interface IMergedAccounts extends ILineItemInTrialBalanceItem {
  accountCode: string;
  accountName: string;
}

export interface ILineItemInTrialBalanceItemWithHierarchy extends IMergedAccounts {
  children: ILineItemInTrialBalanceItemWithHierarchy[];
}

export interface ILineItemInTrialBalanceTotal {
  totalDebit: string;
  totalCredit: string;
}

export interface TrialBalanceItem {
  id: number;
  no: string;
  accountingTitle: string;
  beginningCreditAmount: string;
  beginningDebitAmount: string;
  midtermCreditAmount: string;
  midtermDebitAmount: string;
  endingCreditAmount: string;
  endingDebitAmount: string;
  createAt: number;
  updateAt: number;
  subAccounts: TrialBalanceItem[];
}

export interface ITrialBalanceTotal {
  beginningCreditAmount: string;
  beginningDebitAmount: string;
  midtermCreditAmount: string;
  midtermDebitAmount: string;
  endingCreditAmount: string;
  endingDebitAmount: string;
  createAt: number;
  updateAt: number;
}

export interface ITrialBalanceNote {
  currencyAlias: string;
  total: ITrialBalanceTotal;
}

export interface ITrialBalancePayload extends IPaginatedData<TrialBalanceItem[]> {
  note: string;
}

export const MOCK_RESPONSE: ITrialBalancePayload = {
  data: [
    {
      id: 1,
      no: '1141',
      accountingTitle: '應收帳款',
      beginningCreditAmount: '10.00',
      beginningDebitAmount: '1785000.00',
      midtermCreditAmount: '10.00',
      midtermDebitAmount: '1785000.00',
      endingCreditAmount: '10.00',
      endingDebitAmount: '1785000.00',
      createAt: 1704067200,
      updateAt: 1704067200,
      subAccounts: [
        {
          id: 114100,
          no: '114100',
          accountingTitle: '應收帳款',
          beginningCreditAmount: '10.00',
          beginningDebitAmount: '1785000.00',
          midtermCreditAmount: '10.00',
          midtermDebitAmount: '1785000.00',
          endingCreditAmount: '10.00',
          endingDebitAmount: '1785000.00',
          createAt: 1704067200,
          updateAt: 1704067200,
          subAccounts: [],
        },
        {
          id: 2,
          no: '114101',
          accountingTitle: '應收帳款-A公司',
          beginningCreditAmount: '10.00',
          beginningDebitAmount: '1785000.00',
          midtermCreditAmount: '10.00',
          midtermDebitAmount: '1785000.00',
          endingCreditAmount: '10.00',
          endingDebitAmount: '1785000.00',
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
      beginningCreditAmount: '0.00',
      beginningDebitAmount: '500000.00',
      midtermCreditAmount: '0.00',
      midtermDebitAmount: '500000.00',
      endingCreditAmount: '0.00',
      endingDebitAmount: '500000.00',
      createAt: 1704067200,
      updateAt: 1704067200,
      subAccounts: [
        {
          id: 115100,
          no: '115100',
          accountingTitle: '其他應收款',
          beginningCreditAmount: '10.00',
          beginningDebitAmount: '1785000.00',
          midtermCreditAmount: '10.00',
          midtermDebitAmount: '1785000.00',
          endingCreditAmount: '10.00',
          endingDebitAmount: '1785000.00',
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
  note: JSON.stringify({
    currencyAlias: 'TWD',
    total: {
      beginningCreditAmount: '0.00',
      beginningDebitAmount: '2285000.00',
      midtermCreditAmount: '0.00',
      midtermDebitAmount: '2285000.00',
      endingCreditAmount: '0.00',
      endingDebitAmount: '2285000.00',
      createAt: 1704067200,
      updateAt: 1704067200,
    },
  }),
};
