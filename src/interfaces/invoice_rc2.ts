import {
  InvoiceDirection,
  InvoiceType,
  TaxType,
  CurrencyCode,
  DeductionType,
  CERTIFICATE_USER_INTERACT_OPERATION,
} from '@/constants/invoice_rc2';
import { ICertificateUI } from '@/interfaces/certificate';

export interface IInvoiceRC2Base {
  id: number;
  accountBookId: number;
  voucherId: number | null;
  fileId: number;
  file: {
    id: number;
    name: string;
    size: number;
    url: string;
    thumbnail?: {
      id: number;
      name: string;
      size: number;
      url: string;
    };
  };
  uploaderId: number;
  direction: InvoiceDirection;
  aiResultId: string;
  aiStatus: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number | null;

  type: InvoiceType | undefined;
  issuedDate: number;
  no: string;
  currencyCode: CurrencyCode;
  taxType: TaxType;
  taxRate?: number;
  netAmount: number;
  taxAmount: number;
  totalAmount: number;

  isGenerated: boolean;
  incomplete: boolean;
  description?: string;
  note?: JSON;

  totalOfSummarizedInvoices?: number;
  carrierSerialNumber?: string;
  otherCertificateNo?: string;

  uploaderName: string;
  voucherNo: string | null;
}

export interface IInvoiceRC2Input extends IInvoiceRC2Base {
  direction: InvoiceDirection.INPUT;
  deductionType?: DeductionType | null;
  salesName?: string | null;
  salesIdNumber?: string;
  isSharedAmount?: boolean;
  buyerName?: never;
  buyerIdNumber?: never;
  isReturnOrAllowance?: never;
}

export interface IInvoiceRC2InputUI extends IInvoiceRC2Input {
  isSelected: boolean;
  actions: CERTIFICATE_USER_INTERACT_OPERATION[];
}

export interface IInvoiceRC2Output extends IInvoiceRC2Base {
  direction: InvoiceDirection.OUTPUT;
  buyerName?: string;
  buyerIdNumber?: string;
  isReturnOrAllowance?: boolean;
  deductionType?: never;
  salesName?: never;
  salesIdNumber?: never;
  isSharedAmount?: never;
}

export interface IInvoiceRC2OutputUI extends IInvoiceRC2Output {
  isSelected: boolean;
  actions: CERTIFICATE_USER_INTERACT_OPERATION[];
}

export type IInvoiceRC2 = IInvoiceRC2Input | IInvoiceRC2Output;
export type IInvoiceRC2UI = IInvoiceRC2InputUI | IInvoiceRC2OutputUI;

export const isClassicCertificate = (
  data: ICertificateUI | IInvoiceRC2InputUI | IInvoiceRC2OutputUI
): data is ICertificateUI => {
  return 'invoice' in data && 'file' in data && 'name' in data;
};
