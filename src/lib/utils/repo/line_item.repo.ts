import prisma from '@/client';
import { AccountType } from '@/constants/account';
import { Prisma } from '@prisma/client';
import { setTimestampToDayEnd, setTimestampToDayStart } from '../common';

export async function getSumOfLineItemsGroupByAccountInPrisma(
  companyId: number,
  type: AccountType,
  startDate: number,
  endDate: number,
): Promise<{
  accountId: number;
  amount: number;
}[]> {
  const startDateInSecond = setTimestampToDayStart(startDate);
  const endDateInSecond = setTimestampToDayEnd(endDate);

  const where: Prisma.LineItemWhereInput = {
    account: {
      type,
    },
    voucher: {
      journal: {
        companyId,
      },
      createdAt: {
        gte: startDateInSecond,
        lte: endDateInSecond,
      },
    }
  };

  let lineItems: {
      accountId: number;
      amount: number;
  }[];

  try {
    const lineItemsFromDB = await prisma.lineItem.groupBy({
      by: ['accountId'],
      where,
      _sum: {
        amount: true,
      },
    });

    lineItems = lineItemsFromDB.map((lineItem) => {
      return {
        accountId: lineItem.accountId,
        // Info: (20240627 - Murky) _sum is supposed to have underscore-dangle
        // eslint-disable-next-line no-underscore-dangle
        amount: lineItem._sum.amount || 0,
      };
    });
  } catch (error) {
    // Depreciated: (20240627 - Murky) Debugging purpose
    // eslint-disable-next-line no-console
    console.log(error);
    lineItems = [];
  }

  return lineItems;
}
