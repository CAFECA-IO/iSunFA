import prisma from '@/client';
import { AccountType } from '@/constants/account';
import { Prisma } from '@prisma/client';
import { setTimestampToDayEnd, setTimestampToDayStart } from '@/lib/utils/common';
import { ILineItemSimpleAccountVoucher } from '@/interfaces/line_item';

export async function getLineItemsInPrisma(
  accountBookId: number,
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
      accountBookId,
      date: {
        gte: startDateInSecond,
        lte: endDateInSecond,
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

export async function getOneLineItemWithoutInclude(lineItemId: number) {
  const lineItem = await prisma.lineItem.findFirst({
    where: {
      id: lineItemId,
    },
  });

  return lineItem;
}

export async function getAllLineItemsInPrisma(
  accountBookId: number,
  startDate: number,
  endDate: number,
  isDeleted?: boolean
): Promise<ILineItemSimpleAccountVoucher[]> {
  const startDateInSecond = setTimestampToDayStart(startDate);
  const endDateInSecond = setTimestampToDayEnd(endDate);
  const deletedAt = isDeleted ? { not: null } : { equals: null };
  const lineItems = await prisma.lineItem.findMany({
    where: {
      voucher: {
        accountBookId,
        date: {
          gte: startDateInSecond,
          lte: endDateInSecond,
        },
        deletedAt,
      },
      deletedAt,
    },
    include: {
      voucher: {
        select: {
          id: true,
          date: true,
          type: true,
          no: true,
        },
      },
      account: {
        select: {
          id: true,
          code: true,
          name: true,
          parentId: true,
        },
      },
    },
    orderBy: {
      voucher: {
        date: 'asc',
      },
    },
  });

  return lineItems;
}
