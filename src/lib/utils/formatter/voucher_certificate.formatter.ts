import { IVoucherCertificateEntity } from '@/interfaces/voucher_certificte';
import { VoucherCertificate as PrismaVoucherCertificate } from '@prisma/client';

/**
 * Info: (20241125 - Murky)
 * @todo add schema later
 */
export function parsePrismaVoucherCertificateToEntity(
  prismaVoucherCertificate: PrismaVoucherCertificate
): IVoucherCertificateEntity {
  return {
    id: prismaVoucherCertificate.id,
    voucherId: prismaVoucherCertificate.voucherId,
    certificateId: prismaVoucherCertificate.certificateId,
    createdAt: prismaVoucherCertificate.createdAt,
    updatedAt: prismaVoucherCertificate.updatedAt,
    deletedAt: prismaVoucherCertificate.deletedAt,
  };
}
