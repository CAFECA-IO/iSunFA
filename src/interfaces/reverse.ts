import { IVoucherBeta } from '@/interfaces/voucher';

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
