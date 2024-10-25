import { Certificate as PrismCertificate } from '@prisma/client';
import { z } from 'zod';
import { ICertificateEntity } from '@/interfaces/certificate';
import { FormatterError } from '@/lib/utils/error/formatter_error';
/**
 * Info: (20241024 - Murky)
 * @description parse prisma certificate to certificate entity
 * @note file, invoice, company, voucher are not yet parsed
 */
export function parsePrismaCertificateToCertificateEntity(
  dto: PrismCertificate
): ICertificateEntity {
  const certificateEntitySchema = z.object({
    id: z.number(),
    companyId: z.number(),
    voucherNo: z.string().nullable(),
    aiResultId: z.string().optional(), // Info: (20241024 - Murky) it should be nullable but db not yet created this column
    aiStatus: z.string().optional(), // Info: (20241024 - Murky) it should be nullable but db not yet created this column
    createdAt: z.number(),
    updatedAt: z.number(),
    deletedAt: z.number().nullable(),
    file: z.any().optional(),
    invoice: z.any().optional(),
    company: z.any().optional(),
    vouchers: z.array(z.any()).optional(),
  });

  const { data, success, error } = certificateEntitySchema.safeParse(dto);

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
