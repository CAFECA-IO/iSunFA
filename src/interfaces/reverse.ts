import { IVoucherBeta } from '@/interfaces/voucher';
import { ILineItemBeta } from './line_item';
import { IAccount } from './accounting_account';

export interface IReverseItem extends ILineItemBeta {
  voucherNo: string;
  reverseAmount: number;
}

export interface IReverseItemUI extends IReverseItem {
  isSelected: boolean;
}

export const dummyReverseData: IReverseItem[] = [
  {
    id: 1,
    voucherNo: '2021100001',
    account: null,
    description: 'Salary',
    debit: true,
    amount: 30000,
    reverseAmount: 0,
  },
  {
    id: 2,
    voucherNo: '2021100002',
    account: null,
    description: 'Bonus',
    debit: true,
    amount: 20000,
    reverseAmount: 0,
  },
  {
    id: 3,
    voucherNo: '2021100003',
    account: null,
    description: 'Overtime',
    debit: true,
    amount: 50000,
    reverseAmount: 0,
  },
];

export interface IReverseItemModal {
  account: IAccount | null;
  lineItemId: number;
}

export const defaultReverseItemModal: IReverseItemModal = {
  account: null,
  lineItemId: 0,
};

// ------------ To be deleted later below this line ------------
export interface IReverse {
  id: number;
  voucher: IVoucherBeta | null;
  amount: number;
}

export const defaultReverse: IReverse = {
  id: 0,
  voucher: null,
  amount: 0,
};
