import { ProgressStatus } from '@/constants/account';
import { IVoucherDataForSavingToDB } from '@/interfaces/voucher';
import { IOCR } from '@/interfaces/ocr';
import { IInvoice } from './invoice';

export interface IJournal {
  id: number;
  tokenContract: string | null;
  tokenId: string | null;
  aichResultId: string | null;
  projectId: number | null;
  contractId: number | null;
  OCR: IOCR | null;
  invoice: IInvoice | null;
  voucher: IVoucherDataForSavingToDB | null;
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

// ToDo: (20240528 - Julian) 根據 Murky 寫在 src/pages/api/v1/company/[companyId]/journal/index.ts
// 用於 journal list 的 dummy interface，之後會被取代
export interface IDummyJournal {
  id: number;
  date: number;
  type: string | undefined;
  particulars: string | undefined;
  fromTo: string | undefined;
  account:
    | {
        id: number;
        debit: boolean;
        account: string;
        amount: number;
      }[]
    | undefined;
  projectName: string | undefined;
  projectImageId: string | null | undefined;
  voucherId: number | undefined;
  voucherNo: string | undefined;
}
