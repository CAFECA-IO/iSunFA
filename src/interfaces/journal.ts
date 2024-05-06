import { IVoucher } from './voucher';

export interface IJournal extends IVoucher {
  id: string;
  tokenContract: string;
  tokenId: string;
}
