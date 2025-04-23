import { Certificate as PrismaCertificate } from '@prisma/client';
import { ICertificateEntity } from '@/interfaces/certificate';
import { IFileEntity } from '@/interfaces/file';
import { IInvoiceEntity } from '@/interfaces/invoice';
import { ICompanyEntity } from '@/interfaces/account_book';
import { IVoucherEntity } from '@/interfaces/voucher';
import { getTimestampNow } from '@/lib/utils/common';

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

export function isCertificateIncomplete(certificate: {
  invoice?: {
    date?: number | null;
    priceBeforeTax?: number | null;
    totalPrice?: number | null;
    counterParty?: { name?: string | null } | null;
  } | null;
}): boolean {
  const { invoice } = certificate;

  if (!invoice) return true;

  const { date, priceBeforeTax, totalPrice, counterParty } = invoice;

  return (
    !date ||
    date <= 0 ||
    !priceBeforeTax ||
    priceBeforeTax <= 0 ||
    !totalPrice ||
    totalPrice <= 0 ||
    !counterParty?.name
  );
}
