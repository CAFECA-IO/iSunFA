import { ProgressStatus } from '@/constants/account';
import { IVoucher } from '@/interfaces/voucher';

export interface IJournal extends IVoucher {
  id: string;
  tokenContract: string;
  tokenId: string;
}

export interface IUnprocessedJournal {
  id: number;
  aichResultId: string;
  imageName: string;
  imageUrl: string;
  imageSize: string; // info: To Murky frontend need string like 100 KB (20240523 - Tzuhan)
  progress: number; // 0 ~ 100 Float
  status: ProgressStatus;
  createdAt: number;
}
