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
