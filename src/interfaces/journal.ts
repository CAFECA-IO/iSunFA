import { IVoucher } from './voucher';

export interface IJournal {
  id: string;
  tokenContract: string;
  tokenId: string;
  voucher: IVoucher;
}
