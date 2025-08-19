import { AssociateLineItem as PrismaAssociateLineItem } from '@prisma/client';
import { IAssociateLineItemEntity } from '@/interfaces/associate_line_item';

export function parsePrismaAssociateLineItemToEntity(
  prismaAssociateLineItem: PrismaAssociateLineItem
): IAssociateLineItemEntity {
  return {
    id: prismaAssociateLineItem.id,
    associateVoucherId: prismaAssociateLineItem.associateVoucherId,
    originalLineItemId: prismaAssociateLineItem.originalLineItemId,
    resultLineItemId: prismaAssociateLineItem.resultLineItemId,
    debit: prismaAssociateLineItem.debit,
    amount: String(prismaAssociateLineItem.amount),
    createdAt: prismaAssociateLineItem.createdAt,
    updatedAt: prismaAssociateLineItem.updatedAt,
    deletedAt: prismaAssociateLineItem.deletedAt,
  };
}
