import { AssociateVoucher as PrismaAssociateVoucher } from '@prisma/client';
import { IAssociateVoucherEntity } from '@/interfaces/associate_voucher';

export function parsePrismaAssociateVoucherToEntity(
  dto: PrismaAssociateVoucher
): IAssociateVoucherEntity {
  return {
    id: dto.id,
    eventId: dto.eventId,
    originalVoucherId: dto.originalVoucherId,
    resultVoucherId: dto.resultVoucherId,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    deletedAt: dto.deletedAt,
    associateLineItems: [],
  };
}
