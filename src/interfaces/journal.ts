import { ProgressStatus } from '@/constants/account';
import { IVoucher } from '@/interfaces/voucher';
import { ILineItem } from './line_item';

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
  ocr: {
    id: number;
    imageName: string;
    imageUrl: string;
    imageSize: number;
    createdAt: Date;
    updatedAt: Date;
  } | null; // Info: 跟 IUnprocessedJournal 是否可以通用 @Murky (20240527 - tzuhan)
  invoice: {
    // Info: 跟 IInvoiceDataForSavingToDB 是否可以通用 @Murky (20240527 - tzuhan)
    id: number;
    eventType: string;
    description: string;
    vendorOrSupplier: string;
    payment: {
      id: number;
      isRevenue: boolean;
      price: number;
      hasTax: boolean;
      taxPercentage: number;
      hasFee: boolean;
      fee: number;
      paymentMethod: string;
      paymentPeriod: string;
      installmentPeriod: number;
      paymentAlreadyDone: number;
      paymentStatus: string;
      progress: number;
    };
  } | null;
  voucher: {
    id: number;
    no: string;
    lineItems: ILineItem[];
    // Info: 跟 ILineItem 是否可以通用 @Murky (20240527 - tzuhan)
    // {
    //   id: number;
    //   amount: number;
    //   debit: boolean;
    //   account: {
    //     name: string;
    //   };
    // }[];
  } | null;
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
