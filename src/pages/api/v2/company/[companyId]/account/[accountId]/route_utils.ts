import { SortOrder, SortBy as BetaSortBy } from '@/constants/sort';
import { IGetLineItemByAccount, ILineItemEntity } from '@/interfaces/line_item';
import { IPaginatedData } from '@/interfaces/pagination';
import { Logger } from 'pino';
import { LineItem as PrismaLineItem } from '@prisma/client';
import { AccountCodesOfAPandAR } from '@/constants/asset';
import { parsePrismaLineItemToLineItemEntity } from '@/lib/utils/formatter/line_item.formatter';
import { parsePrismaAccountToAccountEntity } from '@/lib/utils/formatter/account.formatter';
import { parsePrismaVoucherToVoucherEntity } from '@/lib/utils/formatter/voucher.formatter';
import { IAccountEntity } from '@/interfaces/accounting_account';
import { IVoucherEntity } from '@/interfaces/voucher';
import { listLineItemsByAccount } from '@/lib/utils/repo/line_item.beta.repo';
/**
 * Info: (20241113 - Murky)
 * @description for src/pages/api/v2/company/[companyId]/account/[accountId]/lineitem.ts
 */
export const lineItemGetByAccountAPIUtils = {
  reversibleAccountSet: new Set(AccountCodesOfAPandAR),
  /**
   * Info: (20241025 - Murky)
   * @description throw StatusMessage as Error, but it can log the errorMessage
   * @param logger - pino Logger
   * @param options - errorMessage and statusMessage
   * @param options.errorMessage - string, message you want to log
   * @param options.statusMessage - string, status message you want to throw
   * @throws Error - statusMessage
   */
  throwErrorAndLog: (
    logger: Logger,
    {
      errorMessage,
      statusMessage,
    }: {
      errorMessage: string;
      statusMessage: string;
    }
  ) => {
    logger.error(errorMessage);
    throw new Error(statusMessage);
  },
  /**
   * Info: (20241113 - Murky)
   * @description get line items by account id from prisma, and return paginated data
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getLineItemsByAccountIdFromPrisma: async (options: {
    accountId: number;
    companyId: number;
    startDate: number;
    endDate: number;
    sortOption: { sortBy: BetaSortBy; sortOrder: SortOrder }[];
    page?: number;
    pageSize?: number;
    searchQuery?: string;
    isDeleted?: boolean;
  }): Promise<IPaginatedData<IGetLineItemByAccount[]>> => {
    const result: IPaginatedData<IGetLineItemByAccount[]> = await listLineItemsByAccount(options);
    return result;
  },

  /**
   * Info: (20241113 - Murky)
   * @description 從 Prisma回傳的LineItem 抽取出用來反轉的LineItem, 不需要加上accountId判斷，因為從prisma拿出來的時候就已經判斷好了
   */
  getReverseLineItems: (lineItem: IGetLineItemByAccount) => {
    return lineItem.voucher.originalVouchers.flatMap(
      (originalVoucher) => originalVoucher.resultVoucher.lineItems
    );
  },

  /**
   * Info: (20241113 - Murky)
   * @description 判斷這個lineItem被反轉後還剩下多少錢
   * @param options.originDebit - 原始lineItem的debit
   * @param options.reverseLineItems - 反轉的lineItems
   * @param options.originalAmount - 原始lineItem的金額
   */
  calculateLineItemAdjustedAmount: (options: {
    originDebit: boolean;
    reverseLineItems: PrismaLineItem[];
    originalAmount: number;
  }) => {
    const { originDebit, reverseLineItems, originalAmount } = options;
    let adjustedAmount = originalAmount;
    reverseLineItems.forEach((reverseLineItem) => {
      if (reverseLineItem.debit !== originDebit) {
        adjustedAmount -= reverseLineItem.amount;
      }
    });
    return adjustedAmount;
  },

  /**
   * Info: (20241113 - Murky)
   * @description 判斷這個lineItem是否可以被反轉的科目code
   */
  isLineItemCanBeReversed: (lineItem: IGetLineItemByAccount): boolean => {
    const canBeReversed = lineItemGetByAccountAPIUtils.reversibleAccountSet.has(
      lineItem.account.code
    );
    return canBeReversed;
  },

  isLineItemStillReversible: (lineItem: IGetLineItemByAccount): boolean => {
    const originDebit = lineItem.debit;
    const amountThatWillBeReversed = lineItem.amount;
    const reverseItems = lineItemGetByAccountAPIUtils.getReverseLineItems(lineItem);
    const adjustedAmount = lineItemGetByAccountAPIUtils.calculateLineItemAdjustedAmount({
      originDebit,
      reverseLineItems: reverseItems,
      originalAmount: amountThatWillBeReversed,
    });
    return adjustedAmount > 0;
  },

  isLineItemCanBeReversedAndStillReversible: (lineItem: IGetLineItemByAccount): boolean => {
    const canBeReversed = lineItemGetByAccountAPIUtils.isLineItemCanBeReversed(lineItem);
    const isStillReversible = lineItemGetByAccountAPIUtils.isLineItemStillReversible(lineItem);
    return canBeReversed && isStillReversible;
  },

  initLineItemEntity: (
    lineItem: IGetLineItemByAccount
  ): ILineItemEntity & {
    account: IAccountEntity;
    voucher: IVoucherEntity;
  } => {
    const lineItemEntity = parsePrismaLineItemToLineItemEntity(lineItem);
    const accountEntity = parsePrismaAccountToAccountEntity(lineItem.account);
    const voucherEntity = parsePrismaVoucherToVoucherEntity(lineItem.voucher);
    return {
      ...lineItemEntity,
      account: accountEntity,
      voucher: voucherEntity,
    };
  },
};
