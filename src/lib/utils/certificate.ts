import { Certificate as PrismaCertificate } from '@prisma/client';
import { ICertificateEntity } from '@/interfaces/certificate';
import { IFileEntity } from '@/interfaces/file';
import { IInvoiceEntity } from '@/interfaces/invoice';
import { ICompanyEntity } from '@/interfaces/account_book';
import { IVoucherEntity } from '@/interfaces/voucher';
import { getTimestampNow } from '@/lib/utils/common';
import { InvoiceType } from '@/constants/invoice';
import { CertificateType } from '@/constants/certificate';

/**
 * Info: (20241024 - Murky)
 * @description init certificate entity from scratch
 */
export function initCertificateEntity(
  dto: Partial<PrismaCertificate> & {
    companyId: number;
    voucherNo: string | null;
    aiResultId?: string;
    aiStatus?: string;
    file?: IFileEntity;
    invoice?: IInvoiceEntity;
    company?: ICompanyEntity;
    vouchers?: IVoucherEntity[];
  }
): ICertificateEntity {
  const nowInSecond = getTimestampNow();

  const certificateEntity: ICertificateEntity = {
    id: dto.id ?? 0,
    companyId: dto.companyId,
    // voucherNo: dto.voucherNo,
    aiResultId: dto.aiResultId,
    aiStatus: dto.aiStatus,
    createdAt: dto?.createdAt || nowInSecond,
    updatedAt: dto?.updatedAt || nowInSecond,
    deletedAt: dto?.deletedAt || null,
    file: dto.file,
    invoice: dto.invoice,
    company: dto.company,
    vouchers: dto.vouchers || [],
  };

  return certificateEntity;
}

export function mapCertificateTypeToInvoiceType(type: CertificateType): InvoiceType {
  const mapping: Record<CertificateType, InvoiceType> = {
    [CertificateType.INPUT_21]: InvoiceType.PURCHASE_TRIPLICATE_AND_ELECTRONIC,
    [CertificateType.INPUT_22]: InvoiceType.PURCHASE_DUPLICATE_CASH_REGISTER_AND_OTHER,
    [CertificateType.INPUT_23]: InvoiceType.PURCHASE_RETURNS_TRIPLICATE_AND_ELECTRONIC,
    [CertificateType.INPUT_24]: InvoiceType.PURCHASE_RETURNS_DUPLICATE_CASH_REGISTER_AND_OTHER,
    [CertificateType.INPUT_25]: InvoiceType.PURCHASE_UTILITY_ELECTRONIC_INVOICE,
    [CertificateType.INPUT_26]: InvoiceType.PURCHASE_SUMMARIZED_TRIPLICATE_AND_ELECTRONIC,
    [CertificateType.INPUT_27]: InvoiceType.PURCHASE_SUMMARIZED_DUPLICATE_CASH_REGISTER_AND_OTHER,
    [CertificateType.INPUT_28]: InvoiceType.PURCHASE_CUSTOMS_DUTY_PAYMENT,
    [CertificateType.INPUT_29]: InvoiceType.PURCHASE_CUSTOMS_DUTY_REFUND,
    // 根據需要補上 OUTPUT 類型或其他
    [CertificateType.ALL]: InvoiceType.PURCHASE_TRIPLICATE_AND_ELECTRONIC, // fallback 預設值
    [CertificateType.OUTPUT_31]: InvoiceType.SALES_TRIPLICATE_INVOICE,
    [CertificateType.OUTPUT_32]: InvoiceType.SALES_DUPLICATE_CASH_REGISTER_INVOICE,
    [CertificateType.OUTPUT_35]: InvoiceType.SALES_NON_UNIFORM_INVOICE,
    [CertificateType.OUTPUT_36]: InvoiceType.SALES_RETURNS_DUPLICATE_AND_NON_UNIFORM,
  };

  return mapping[type] ?? InvoiceType.PURCHASE_TRIPLICATE_AND_ELECTRONIC;
}

export function mapInvoiceTypeToCertificateType(type: InvoiceType): CertificateType {
 const mapping: Partial<Record<InvoiceType, CertificateType>> = {
   [InvoiceType.PURCHASE_TRIPLICATE_AND_ELECTRONIC]: CertificateType.INPUT_21,
   [InvoiceType.PURCHASE_DUPLICATE_CASH_REGISTER_AND_OTHER]: CertificateType.INPUT_22,
   [InvoiceType.PURCHASE_RETURNS_TRIPLICATE_AND_ELECTRONIC]: CertificateType.INPUT_23,
   [InvoiceType.PURCHASE_RETURNS_DUPLICATE_CASH_REGISTER_AND_OTHER]: CertificateType.INPUT_24,
   [InvoiceType.PURCHASE_UTILITY_ELECTRONIC_INVOICE]: CertificateType.INPUT_25,
   [InvoiceType.PURCHASE_SUMMARIZED_TRIPLICATE_AND_ELECTRONIC]: CertificateType.INPUT_26,
   [InvoiceType.PURCHASE_SUMMARIZED_DUPLICATE_CASH_REGISTER_AND_OTHER]: CertificateType.INPUT_27,
   [InvoiceType.PURCHASE_CUSTOMS_DUTY_PAYMENT]: CertificateType.INPUT_28,
   [InvoiceType.PURCHASE_CUSTOMS_DUTY_REFUND]: CertificateType.INPUT_29,
   [InvoiceType.SALES_TRIPLICATE_INVOICE]: CertificateType.OUTPUT_31,
   [InvoiceType.SALES_DUPLICATE_CASH_REGISTER_INVOICE]: CertificateType.OUTPUT_32,
   [InvoiceType.SALES_NON_UNIFORM_INVOICE]: CertificateType.OUTPUT_35,
   [InvoiceType.SALES_RETURNS_DUPLICATE_AND_NON_UNIFORM]: CertificateType.OUTPUT_36,
   [InvoiceType.ALL]: CertificateType.ALL, // fallback
 };

  return mapping[type] ?? CertificateType.INPUT_21;
}

export const isDeductible = (deductionType?: string): boolean => {
  return (
    deductionType === 'DEDUCTIBLE_PURCHASE_AND_EXPENSE' ||
    deductionType === 'DEDUCTIBLE_FIXED_ASSETS'
  );
};
