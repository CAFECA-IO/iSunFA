import { LineItem as PrismaLineItem } from '@prisma/client';
import { ILineItemEntity, ILineItemIncludeAccount } from '@/interfaces/line_item';
import type { IAccountEntity } from '@/interfaces/accounting_account';
import type { IVoucherEntity } from '@/interfaces/voucher';
import { getTimestampNow } from '@/lib/utils/common';

type LineItemBiggest = {
  id: number;
  debit: boolean;
  account: string;
  amount: number;
};
export function sumLineItemsAndReturnBiggest(
  lineItems: ILineItemIncludeAccount[] | null | undefined
): {
  credit: LineItemBiggest;
  debit: LineItemBiggest;
} {
  let creditLargestAmount = 0;
  let debitLargestAmount = 0;
  const credit = {
    id: 0,
    debit: false,
    account: '',
    amount: 0,
  };

  const debit = {
    id: 0,
    debit: true,
    account: '',
    amount: 0,
  };

  if (!lineItems) {
    return {
      credit,
      debit,
    };
  }

  lineItems.forEach((lineItem) => {
    if (lineItem.debit) {
      if (lineItem.amount > debitLargestAmount) {
        debit.id = lineItem.id;
        debit.account = lineItem.account.name;
        debitLargestAmount = lineItem.amount;
      }
      debit.amount += lineItem.amount;
    } else {
      if (lineItem.amount > creditLargestAmount) {
        credit.id = lineItem.id;
        credit.account = lineItem.account.name;
        creditLargestAmount = lineItem.amount;
      }

      credit.amount += lineItem.amount;
    }
  });

  return {
    credit,
    debit,
  };
}

/**
 * Info: (20241023 - Murky)
 * @note Used to create a new line item entity directly from scratch
 */
export function initLineItemEntity(
  dto: Partial<PrismaLineItem> & {
    amount: number;
    debit: boolean;
    accountId: number;
    accountEntity?: IAccountEntity;
    voucherEntity?: IVoucherEntity;
  }
): ILineItemEntity {
  const nowInSecond = getTimestampNow();

  const lineItemEntity: ILineItemEntity = {
    id: dto.id || 0,
    amount: dto.amount,
    description: dto.description || '',
    debit: dto.debit,
    accountId: dto.accountId,
    voucherId: dto.voucherId || 0,
    createdAt: dto.createdAt || nowInSecond,
    updatedAt: dto.updatedAt || nowInSecond,
    deletedAt: dto.deletedAt || null,
    account: dto.accountEntity,
    voucher: dto.voucherEntity,
  };

  return lineItemEntity;
}
