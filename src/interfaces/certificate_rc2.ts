import {
  CertificateDirection,
  CertificateType,
  TaxType,
  CurrencyCode,
  DeductionType,
  CERTIFICATE_USER_INTERACT_OPERATION,
} from '@/constants/certificate';
import { ICertificateUI } from '@/interfaces/certificate';
import { IFileBeta } from '@/interfaces/file';

export interface ICertificateRC2Base {
  id: number;
  accountBookId: number;
  voucherId: number | null;
  file: IFileBeta;
  uploaderId: number;
  direction: CertificateDirection;
  aiResultId: string;
  aiStatus: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number | null;

  type: CertificateType;
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

  totalOfSummarizedCertificates?: number;
  carrierSerialNumber?: string;
  otherCertificateNo?: string;

  uploaderName: string;
  voucherNo: string | null;
}

export interface ICertificateRC2Input extends ICertificateRC2Base {
  direction: CertificateDirection.INPUT;
  deductionType?: DeductionType;
  salesName?: string;
  salesIdNumber?: string;
  isSharedAmount?: boolean;
  buyerName?: never;
  buyerIdNumber?: never;
  isReturnOrAllowance?: never;
}

export interface ICertificateRC2InputUI extends ICertificateRC2Input {
  isSelected: boolean;
  actions: CERTIFICATE_USER_INTERACT_OPERATION[];
}

export interface ICertificateRC2Output extends ICertificateRC2Base {
  direction: CertificateDirection.OUTPUT;
  buyerName?: string;
  buyerIdNumber?: string;
  isReturnOrAllowance?: boolean;
  deductionType?: never;
  salesName?: never;
  salesIdNumber?: never;
  isSharedAmount?: never;
}

export interface ICertificateRC2OutputUI extends ICertificateRC2Output {
  isSelected: boolean;
  actions: CERTIFICATE_USER_INTERACT_OPERATION[];
}

export const isClassicCertificate = (
  certificate: ICertificateUI | ICertificateRC2InputUI | ICertificateRC2OutputUI
): certificate is ICertificateUI => {
  return 'invoice' in certificate && 'file' in certificate && 'name' in certificate;
};
