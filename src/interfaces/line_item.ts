import { Prisma } from '@prisma/client';
import { IAccount } from '@/interfaces/accounting_account';

export interface ILineItem {
  lineItemIndex: string;
  account: string;
  description: string;
  debit: boolean;
  amount: number;
  accountId: number;
}

// Info: (20240619 - Murky) LineItem that aich produces do not have accountId
export interface ILineItemFromAICH extends Omit<ILineItem, 'accountId'> {}

export type ILineItemIncludeAccount = Prisma.LineItemGetPayload<{
  include: {
    account: true;
  };
}>;

// Info: (20241011 - Julian) for frontend testing
export interface ILineItemBeta {
  id: number;
  account: IAccount | null;
  particulars: string;
  debit: number;
  credit: number;
}
