import {
  CertificateDirection,
  CertificateType,
  TaxType,
  CurrencyCode,
  DeductionType,
} from '@/constants/certificate';

export interface ICertificateRC2Base {
  id: number;
  accountBookId: number;
  fileId: number;
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
  currency: CurrencyCode;
  taxType: TaxType;
  taxRate?: number;
  netAmount: number;
  taxAmount: number;
  totalAmount: number;

  isGenerated: boolean;

  totalOfSummarizedCertificates?: number;
  carrierSerialNumber?: string;
  otherCertificateNo?: string;
}

export interface ICertificateRC2Input extends ICertificateRC2Base {
  direction: CertificateDirection.INPUT;
  deductionCategory?: DeductionType;
  salesName?: string;
  salesIdNumber?: string;
  isSharedAmount?: boolean;
  buyerName?: never;
  buyerIdNumber?: never;
  isReturnOrAllowance?: never;
}

export interface ICertificateRC2Output extends ICertificateRC2Base {
  direction: CertificateDirection.OUTPUT;
  buyerName?: string;
  buyerIdNumber?: string;
  isReturnOrAllowance?: boolean;
  deductionCategory?: never;
  salesName?: never;
  salesIdNumber?: never;
}
