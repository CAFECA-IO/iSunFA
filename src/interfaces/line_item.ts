import {
  Prisma,
  Voucher as PrismaVoucher,
  AssociateVoucher as PrismaAssociateVoucher,
  LineItem as PrismaLineItem,
  Account as PrismaAccount,
} from '@prisma/client';
import { IAccount } from '@/interfaces/accounting_account';
import type { IAccountEntity } from '@/interfaces/accounting_account';
import type { IVoucherEntity } from '@/interfaces/voucher';

export interface ILineItem {
  lineItemIndex: string;
  account: string;
  description: string;
  debit: boolean;
  amount: string;
  accountId: number;
}

export type ILineItemIncludeAccount = Prisma.LineItemGetPayload<{
  include: {
    account: true;
  };
}>;

// Info: (20241011 - Julian) for frontend testing
export interface ILineItemBeta {
  id: number;
  amount: string;
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
  amount: '0',
  isReverse: false,
  reverseList: [],
};

/**
 * Info: (20241111 - Murky)
 * @description REVERSE_LINE_ITEM_GET_BY_ACCOUNT_V2, 後端提供用來取得某個account 可以revert的 line_item
 * @julian Post Voucher的時候 reverseVouchers[0].lineItemIdBeReversed 填寫這邊取得的id,
 * reverseVouchers[0].lineItemIdReverseOther 放的則是要被Reverse的lineItem 在 Post lineItem array中的id
 */
export interface IReverseItem {
  voucherId: number;
  amount: string;
  description: string;
  debit: boolean;
  account: IAccount;
  voucherNo: string;
  /**
   * Info: (20241111 - Murky)
   * @description 在 Post Voucher 的時候, 需要填入被Reverse的 LineItem 的 id,
   * 而id 可以在 REVERSE_LINE_ITEM_GET_BY_ACCOUNT_V2, 中取得
   */
  lineItemBeReversedId: number;
}

export interface IReverseItemUI extends IReverseItem {
  lineItemIndex: number;
  isSelected: boolean;
  reverseAmount: string;
}

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
   * @description how much money is this line item (string for API consistency)
   */
  amount: string;

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
/**
 * Info: (20241113 - Murky)
 * @description for src/pages/api/v2/company/[companyId]/account/[accountId]/lineitem.ts,
 * one item in the response data
 */
export type IGetLineItemByAccount = PrismaLineItem & {
  account: PrismaAccount;
  voucher: PrismaVoucher & {
    originalVouchers: (PrismaAssociateVoucher & {
      resultVoucher: PrismaVoucher & {
        lineItems: (PrismaLineItem & {
          account: PrismaAccount;
        })[];
      };
    })[];
  };
};

export interface ILineItemSimpleAccountVoucher extends PrismaLineItem {
  account: {
    id: number;
    code: string;
    name: string;
    parentId: number;
  };
  voucher: {
    id: number;
    type: string;
    no: string;
    date: number;
  };
}
