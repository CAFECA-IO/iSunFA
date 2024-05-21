import { ProgressStatus } from '@/constants/account';
import { IVoucher } from '@/interfaces/voucher';

export interface IJournal extends IVoucher {
  id: string;
  tokenContract: string;
  tokenId: string;
}

export interface IUnprocessedJournal {
  id: string;
  imageName: string;
  imageUrl: string;
  imageSize: number;
  progress: number; // 0 ~ 100 Float
  status: ProgressStatus;
}
