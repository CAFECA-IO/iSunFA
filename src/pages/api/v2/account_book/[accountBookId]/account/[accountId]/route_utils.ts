import { SortOrder, SortBy as BetaSortBy } from '@/constants/sort';
import { IGetLineItemByAccount, ILineItemEntity } from '@/interfaces/line_item';
import { IPaginatedData } from '@/interfaces/pagination';
import { Logger } from 'pino';
import {
  LineItem as PrismaLineItem,
  Account as PrismaAccount,
  Voucher as PrismaVoucher,
  AssociateLineItem as PrismaAssociateLineItem,
  AssociateVoucher as PrismaAssociateVoucher,
  Event as PrismaEvent,
} from '@prisma/client';
import {
  AccountCodesOfAPandAR,
  AccountCodesOfAPRegex,
  AccountCodesOfARRegex,
} from '@/constants/asset';
import { parsePrismaLineItemToLineItemEntity } from '@/lib/utils/formatter/line_item.formatter';
import { parsePrismaAccountToAccountEntity } from '@/lib/utils/formatter/account.formatter';
import { parsePrismaVoucherToVoucherEntity } from '@/lib/utils/formatter/voucher.formatter';
import { IAccountEntity } from '@/interfaces/accounting_account';
import { IGetManyVoucherResponseButOne, IVoucherEntity } from '@/interfaces/voucher';
import { listLineItemsByAccount } from '@/lib/utils/repo/line_item.beta.repo';
import { findFirstAccountInPrisma } from '@/lib/utils/repo/account.repo';
import { getManyVoucherByAccountV2 } from '@/lib/utils/repo/voucher.repo';
import { parsePartialPrismaCounterPartyToCounterPartyEntity } from '@/lib/utils/formatter/counterparty.formatter';
import { parsePrismaUserToUserEntity } from '@/lib/utils/formatter/user.formatter';
import { parsePrismaFileToFileEntity } from '@/lib/utils/formatter/file.formatter';
import { parsePrismaEventToEventEntity } from '@/lib/utils/formatter/event.formatter';
import { parsePrismaAssociateLineItemToEntity } from '@/lib/utils/formatter/associate_line_item.formatter';
import { parsePrismaAssociateVoucherToEntity } from '@/lib/utils/formatter/associate_voucher.formatter';
import { IAssociateLineItemEntity } from '@/interfaces/associate_line_item';
import { IAssociateVoucherEntity } from '@/interfaces/associate_voucher';
import { IEventEntity } from '@/interfaces/event';

type ILineItemEntityWithAssociate = ILineItemEntity & {
  account: IAccountEntity;
  lineItemsAssociateThatWriteOffMe: (IAssociateLineItemEntity & {
    resultLineItem: ILineItemEntity & {
      account: IAccountEntity;
    };
    associateVoucher: IAssociateVoucherEntity & {
      event: IEventEntity;
    };
  })[];
  lineItemsAssociateBeenWriteOffByMe: (IAssociateLineItemEntity & {
    originalLineItem: ILineItemEntity & {
      account: IAccountEntity;
      lineItemsAssociateThatWriteOffMe: (IAssociateLineItemEntity & {
        resultLineItem: ILineItemEntity & {
          account: IAccountEntity;
        };
        associateVoucher: IAssociateVoucherEntity & {
          event: IEventEntity;
        };
      })[];
    };
    associateVoucher: IAssociateVoucherEntity & {
      event: IEventEntity;
    };
  })[];
};

/**
 * Info: (20241113 - Murky)
 * @description for src/pages/api/v2/company/[companyId]/account/[accountId]/lineitem.ts
 */
export const lineItemGetByAccountAPIUtils = {
  reversibleAccountSetRegex: new RegExp(`^(${AccountCodesOfAPandAR.join('|')})`),
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
    accountBookId: number;
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
    const canBeReversed = lineItemGetByAccountAPIUtils.reversibleAccountSetRegex.test(
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

export const voucherGetByAccountAPIUtils = {
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
  getAccountFromPrisma: async (options: { accountId: number; accountBookId: number }) => {
    const { accountId, accountBookId } = options;
    return findFirstAccountInPrisma(accountId, accountBookId);
  },

  getVouchersFromPrisma: async (options: {
    accountBookId: number;
    accountId: number;
    startDate: number;
    endDate: number;
    page: number;
    pageSize: number;
    sortOption: {
      sortBy: BetaSortBy;
      sortOrder: SortOrder;
    }[];
    searchQuery?: string | undefined;
    isDeleted?: boolean | undefined;
  }) => {
    return getManyVoucherByAccountV2(options);
  },

  initAccountEntity: (account: PrismaAccount): IAccountEntity => {
    return parsePrismaAccountToAccountEntity(account);
  },

  isAccountAR: (account: IAccountEntity): boolean => {
    return AccountCodesOfARRegex.test(account.code);
  },

  isAccountAP: (account: IAccountEntity): boolean => {
    return AccountCodesOfAPRegex.test(account.code);
  },

  isAccountARorAP: (account: IAccountEntity): boolean => {
    return (
      voucherGetByAccountAPIUtils.isAccountAR(account) ||
      voucherGetByAccountAPIUtils.isAccountAP(account)
    );
  },

  isARorAPBeenWriteOff: (lineItemWithAssociate: ILineItemEntityWithAssociate): boolean => {
    const targetAccountId = lineItemWithAssociate.account.id;
    let remainingAmount = lineItemWithAssociate.amount;
    lineItemWithAssociate.lineItemsAssociateThatWriteOffMe.forEach((associate) => {
      const isSameAccount = associate.resultLineItem.account.id === targetAccountId;
      const isSameDirection = associate.resultLineItem.debit === lineItemWithAssociate.debit;
      // Info: (20250423 - Anna) associate.amount 替換為 associate.resultLineItem.amount
      const adjustedAmount = associate.resultLineItem.amount * (isSameDirection ? 1 : -1);

      // Info: (20250423 - Anna) Debug
      // eslint-disable-next-line no-console
      // console.log('📦 lineItemWithAssociate:', JSON.stringify(lineItemWithAssociate, null, 2));
      // eslint-disable-next-line no-console
      // console.log('📦 associate:', JSON.stringify(associate, null, 2));

      if (isSameAccount) {
        remainingAmount += adjustedAmount;
      }
    });
    // Info: (20250423 - Anna) 是否剩餘金額為0
    return remainingAmount === 0;
  },

  isARorAPWriteOffOriginalVoucher: (
    lineItemWithAssociate: ILineItemEntityWithAssociate
  ): boolean => {
    const targetAccountId = lineItemWithAssociate.account.id;
    return lineItemWithAssociate.lineItemsAssociateBeenWriteOffByMe.every((associate) => {
      return associate.originalLineItem.lineItemsAssociateThatWriteOffMe.every(
        (originalAssociate) => {
          const isSameAccount = originalAssociate.resultLineItem.account.id === targetAccountId;
          let writeOffAmount = lineItemWithAssociate.amount;
          if (isSameAccount) {
            const isSameDirection =
              originalAssociate.resultLineItem.debit === lineItemWithAssociate.debit;
            writeOffAmount += originalAssociate.amount * (isSameDirection ? 1 : -1);
          }
          return writeOffAmount === 0;
        }
      );
    });
  },

  isLineItemWriteOff: (lineItemWithAssociate: ILineItemEntityWithAssociate): boolean => {
    const { lineItemsAssociateThatWriteOffMe, lineItemsAssociateBeenWriteOffByMe } =
      lineItemWithAssociate;

    if (lineItemsAssociateThatWriteOffMe.length && lineItemsAssociateBeenWriteOffByMe.length) {
      return (
        voucherGetByAccountAPIUtils.isARorAPBeenWriteOff(lineItemWithAssociate) &&
        voucherGetByAccountAPIUtils.isARorAPWriteOffOriginalVoucher(lineItemWithAssociate)
      );
    } else if (lineItemsAssociateThatWriteOffMe.length) {
      return voucherGetByAccountAPIUtils.isARorAPBeenWriteOff(lineItemWithAssociate);
    } else if (lineItemsAssociateBeenWriteOffByMe.length) {
      return voucherGetByAccountAPIUtils.isARorAPWriteOffOriginalVoucher(lineItemWithAssociate);
    }
    return false;
  },
  initVoucherEntity: (voucher: IGetManyVoucherResponseButOne) => {
    const voucherEntity = parsePrismaVoucherToVoucherEntity(voucher);
    return voucherEntity;
  },

  initLineItemsAssociateThatWriteOffMe(
    entities: (PrismaAssociateLineItem & {
      resultLineItem: PrismaLineItem & {
        account: PrismaAccount;
      };
      associateVoucher: PrismaAssociateVoucher & {
        event: PrismaEvent;
      };
    })[]
  ) {
    return entities.map((data) => {
      const associateLineItem = parsePrismaAssociateLineItemToEntity(data);
      const resultLineItem = parsePrismaLineItemToLineItemEntity(data.resultLineItem);
      const account = parsePrismaAccountToAccountEntity(data.resultLineItem.account);
      const associateVoucher = parsePrismaAssociateVoucherToEntity(data.associateVoucher);
      const event = parsePrismaEventToEventEntity(data.associateVoucher.event);
      return {
        ...associateLineItem,
        resultLineItem: {
          ...resultLineItem,
          account,
        },
        associateVoucher: {
          ...associateVoucher,
          event,
        },
      };
    });
  },

  initLineItemAndAccountEntity: (
    lineItem: PrismaLineItem & {
      account: PrismaAccount;
      originalLineItem: (PrismaAssociateLineItem & {
        resultLineItem: PrismaLineItem & {
          account: PrismaAccount;
        };
        associateVoucher: PrismaAssociateVoucher & {
          event: PrismaEvent;
        };
      })[];
      resultLineItem: (PrismaAssociateLineItem & {
        originalLineItem: PrismaLineItem & {
          account: PrismaAccount;
          originalLineItem: (PrismaAssociateLineItem & {
            resultLineItem: PrismaLineItem & {
              account: PrismaAccount;
            };
            associateVoucher: PrismaAssociateVoucher & {
              event: PrismaEvent;
            };
          })[];
        };
        associateVoucher: PrismaAssociateVoucher & {
          event: PrismaEvent;
          originalVoucher: PrismaVoucher;
        };
      })[];
    }
  ) => {
    const lineItemEntity = parsePrismaLineItemToLineItemEntity(lineItem);
    const accountEntity = parsePrismaAccountToAccountEntity(lineItem.account);

    const lineItemsAssociateThatWriteOffMe =
      voucherGetByAccountAPIUtils.initLineItemsAssociateThatWriteOffMe(lineItem.originalLineItem);

    const lineItemsAssociateBeenWriteOffByMe = lineItem.resultLineItem.map((data) => {
      const associateLineItem = parsePrismaAssociateLineItemToEntity(data);
      const originalLineItem = parsePrismaLineItemToLineItemEntity(data.originalLineItem);
      const account = parsePrismaAccountToAccountEntity(data.originalLineItem.account);
      const associateVoucher = parsePrismaAssociateVoucherToEntity(data.associateVoucher);
      const event = parsePrismaEventToEventEntity(data.associateVoucher.event);
      const originalVoucher = parsePrismaVoucherToVoucherEntity(
        data.associateVoucher.originalVoucher
      );
      const writeOffLineItem = voucherGetByAccountAPIUtils.initLineItemsAssociateThatWriteOffMe(
        data.originalLineItem.originalLineItem
      );
      return {
        ...associateLineItem,
        originalLineItem: {
          ...originalLineItem,
          account,
          lineItemsAssociateThatWriteOffMe: writeOffLineItem,
        },
        associateVoucher: {
          ...associateVoucher,
          event,
          originalVoucher,
        },
      };
    });

    const lineItemEntityWithAssociate: ILineItemEntityWithAssociate = {
      ...lineItemEntity,
      account: accountEntity,
      lineItemsAssociateThatWriteOffMe,
      lineItemsAssociateBeenWriteOffByMe,
    };

    return lineItemEntityWithAssociate;
  },

  initLineItemAndAccountEntities: (voucher: IGetManyVoucherResponseButOne) => {
    const lineItems = voucher.lineItems.map(
      voucherGetByAccountAPIUtils.initLineItemAndAccountEntity
    );
    return lineItems;
  },

  initCounterPartyEntity: (voucher: IGetManyVoucherResponseButOne) => {
    const counterParty = parsePartialPrismaCounterPartyToCounterPartyEntity(voucher.counterparty);
    return counterParty;
  },

  initIssuerAndFileEntity: (voucher: IGetManyVoucherResponseButOne) => {
    const issuer = parsePrismaUserToUserEntity(voucher.issuer);
    const imageFile = parsePrismaFileToFileEntity(voucher.issuer.imageFile);
    return {
      ...issuer,
      imageFile,
    };
  },
};
