import { Prisma } from '@prisma/client';
import { IAccount } from '@/interfaces/accounting_account';
import type { IAccountEntity } from '@/interfaces/accounting_account';
import type { IVoucherEntity } from '@/interfaces/voucher';

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
  amount: number;
  description: string;
  debit: boolean | null;
  account: IAccount | null;
}

export interface ILineItemUI extends ILineItemBeta {
  isReverse: boolean;
  reverseList: IReverseItem[];
}

// Info: (20241014 - Julian) 初始傳票列
export const initialVoucherLine: ILineItemUI = {
  id: 0,
  account: null,
  description: '',
  debit: null,
  amount: 0,
  isReverse: false,
  reverseList: [],
};

export interface IReverseItem {
  id: number;
  amount: number;
  description: string;
  debit: boolean | null;
  account: IAccount | null;
  voucherNo: string;
  reverseAmount: number;
}

export interface IReverseItemUI extends IReverseItem {
  isSelected: boolean;
}

export const dummyReverseData: IReverseItem[] = [
  {
    id: 1,
    voucherNo: '2021100001',
    account: null,
    description: 'Salary',
    debit: true,
    amount: 30000,
    reverseAmount: 0,
  },
  {
    id: 2,
    voucherNo: '2021100002',
    account: null,
    description: 'Bonus',
    debit: true,
    amount: 20000,
    reverseAmount: 0,
  },
  {
    id: 3,
    voucherNo: '2021100003',
    account: null,
    description: 'Overtime',
    debit: true,
    amount: 50000,
    reverseAmount: 0,
  },
];

/**
 * Info: (20241023 - Murky)
 * @description this line item interface specifies for backend usage
 * @note use parsePrismaLineItemToLineItemEntity to convert Prisma.LineItem to ILineItemEntity
 * @note use initLineItemEntity to create a new ILineItemEntity from scratch
 */
export interface ILineItemEntity {
  /**
   * Info: (20241023 - Murky)
   * @description line item id from database, 0 means not created in database yet
   */
  id: number;

  /**
   * Info: (20241023 - Murky)
   * @description how much money is this line item
   */
  amount: number;

  /**
   * Info: (20241023 - Murky)
   * @description description input by user
   */
  description: string;

  /**
   * Info: (20241023 - Murky)
   * @description true means debit, false means credit, if it is not equal debit of account, it meas this line item is decreasing the account
   */
  debit: boolean;

  /**
   * Info: (20241023 - Murky)
   * @description account id that this line item is related to, should not be negative
   */
  accountId: number;

  /**
   * Info: (20241023 - Murky)
   * @description voucher id that this line item is related to, 0 means not related to any voucher
   */
  voucherId: number;

  /**
   * Info: (20241023 - Murky)
   * @note need to be in seconds
   */
  createdAt: number;

  /**
   * Info: (20241023 - Murky)
   * @note need to be in seconds
   */
  updatedAt: number;

  /**
   * Info: (20241023 - Murky)
   * @note need to be in seconds, null if not deleted
   */
  deletedAt: number | null;

  /**
   * Info: (20241023 - Murky)
   * @description account that this line item is related to
   */
  account?: IAccountEntity;

  /**
   * Info: (20241023 - Murky)
   * @description voucher that this line item is related to
   */
  voucher?: IVoucherEntity;
}
