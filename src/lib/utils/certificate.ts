import { Certificate as PrismaCertificate } from '@prisma/client';
import {
  ICertificate,
  ICertificateEntity,
  ICertificateInput,
  ICertificateOutput,
} from '@/interfaces/certificate';
import { IFileEntity } from '@/interfaces/file';
import { IInvoiceEntity, IInvoiceInput, IInvoiceOutput } from '@/interfaces/invoice';
import { ICompanyEntity } from '@/interfaces/account_book';
import { IVoucherEntity } from '@/interfaces/voucher';
import { getTimestampNow } from '@/lib/utils/common';
import { InvoiceTransactionDirection } from '@/constants/invoice';

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

export function isCertificateIncomplete(certificate: ICertificate | null): boolean {
  if (!certificate) return true;

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

export function isCertificateIncompleteByType(
  certificate: ICertificateInput | ICertificateOutput | null,
  type: InvoiceTransactionDirection
): boolean {
  if (!certificate || !certificate.invoice) return true;

  const { invoice } = certificate;

  const basicInvalid =
    !invoice.date ||
    invoice.date <= 0 ||
    !invoice.priceBeforeTax ||
    invoice.priceBeforeTax <= 0 ||
    !invoice.totalPrice ||
    invoice.totalPrice <= 0;

  if (basicInvalid) return true;

  if (type === InvoiceTransactionDirection.INPUT) {
    const input = invoice as IInvoiceInput;
    return !input.sales?.name || !input.deductionType;
  }

  if (type === InvoiceTransactionDirection.OUTPUT) {
    const output = invoice as IInvoiceOutput;
    return !output.buyer?.name;
  }

  return false;
}
