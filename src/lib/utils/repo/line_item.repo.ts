import prisma from '@/client';
import { AccountType } from '@/constants/account';
import { Prisma } from '@prisma/client';
import { setTimestampToDayEnd, setTimestampToDayStart } from '@/lib/utils/common';

export async function getLineItemsInPrisma(
  companyId: number,
  type: AccountType,
  startDate: number,
  endDate: number,
  isDeleted?: boolean
) {
  const startDateInSecond = setTimestampToDayStart(startDate);
  const endDateInSecond = setTimestampToDayEnd(endDate);
  const deletedAt = isDeleted ? { not: null } : { equals: null };
  const where: Prisma.LineItemWhereInput = {
    deletedAt,
    account: {
      type,
    },
    voucher: {
      journal: {
        companyId,
        invoice: {
          date: {
            gte: startDateInSecond,
            lte: endDateInSecond,
          },
        },
      },
    },
  };

  const lineItemsFromDB = await prisma.lineItem.findMany({
    where,
    include: {
      account: true,
    },
  });

  return lineItemsFromDB;
}
