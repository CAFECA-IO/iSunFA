import { ProgressStatus } from '@/constants/account';
import { IVoucher, IVoucherDataForSavingToDB } from '@/interfaces/voucher';
import { IOCR } from '@/interfaces/ocr';
import { IInvoiceDataForSavingToDB } from './invoice';

// Depreciated (20240527 - Murky): IJournal will be replace by IJournalData
export interface IJournal extends IVoucher {
  id: string;
  tokenContract: string;
  tokenId: string;
}

export interface IJournalData {
  id: number;
  tokenContract: string | null;
  tokenId: string | null;
  aichResultId: string | null;
  projectId: number | null;
  contractId: number | null;
  OCR: IOCR | null,
  invoice: IInvoiceDataForSavingToDB | null,
  voucher: IVoucherDataForSavingToDB | null
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
