import { Certificate as PrismaCertificate } from '@prisma/client';
import { ICertificateEntity } from '@/interfaces/certificate';
import { IFileEntity } from '@/interfaces/file';
import { IInvoiceEntity } from '@/interfaces/invoice';
import { IAccountBookWithoutTeamEntity } from '@/interfaces/account_book';
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
    company?: IAccountBookWithoutTeamEntity;
    vouchers?: IVoucherEntity[];
  }
): ICertificateEntity {
  const nowInSecond = getTimestampNow();

  const certificateEntity: ICertificateEntity = {
    id: dto.id ?? 0,
    accountBookId: dto.companyId,
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
