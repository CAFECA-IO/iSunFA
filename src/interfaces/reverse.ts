import { IVoucherBeta } from '@/interfaces/voucher';
import { IAccount } from '@/interfaces/accounting_account';

export interface IReverseItemModal {
  account: IAccount | null;
  lineItemIndex: number;
}

export const defaultReverseItemModal: IReverseItemModal = {
  account: null,
  lineItemIndex: 0,
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
