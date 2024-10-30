import { Certificate as PrismCertificate } from '@prisma/client';
import { ICertificateEntity } from '@/interfaces/certificate';
import { FormatterError } from '@/lib/utils/error/formatter_error';
import { certificateEntityValidator } from '@/lib/utils/zod_schema/certificate';
/**
 * Info: (20241024 - Murky)
 * @description parse prisma certificate to certificate entity
 * @note file, invoice, company, voucher are not yet parsed
 * @note please check certificateEntityValidator for todo
 */
export function parsePrismaCertificateToCertificateEntity(
  dto: PrismCertificate
): ICertificateEntity {
  const { data, success, error } = certificateEntityValidator.safeParse(dto);

  if (!success) {
    throw new FormatterError('parsePrismaCertificateToCertificateEntity', {
      dto,
      zodErrorMessage: error.message,
      issues: error.issues,
    });
  }

  const certificate: ICertificateEntity = {
    ...data,
    vouchers: data.vouchers || [],
  };

  return certificate;
}
