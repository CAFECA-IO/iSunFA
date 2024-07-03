import prisma from '@/client';
import { AccountType } from '@/constants/account';
import { Prisma } from '@prisma/client';
import { setTimestampToDayEnd, setTimestampToDayStart } from '@/lib/utils/common';

export async function getSumOfLineItemsGroupByAccountInPrisma(
  companyId: number,
  type: AccountType,
  startDate: number,
  endDate: number
) {
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
    },
  };

  const lineItems: Map<number, number> = new Map();

  try {
    const lineItemsFromDB = await prisma.lineItem.findMany({
      where,
      include: {
        account: true,
      }
    });

    lineItemsFromDB.forEach((lineItem) => {
      const isAccountDebit = lineItem.account.debit;
      const isLineItemDebit = lineItem.debit;
      const { amount } = lineItem;

      const adjustedAmount = isAccountDebit === isLineItemDebit ? amount : -amount;

      const lineItemOriginalAmount = lineItems.get(lineItem.accountId) || 0;
      lineItems.set(lineItem.accountId, lineItemOriginalAmount + adjustedAmount);
    });
  } catch (error) {
    // Depreciated: (20240627 - Murky) Debugging purpose
    // eslint-disable-next-line no-console
    console.log(error);
  }

  return lineItems;
}
