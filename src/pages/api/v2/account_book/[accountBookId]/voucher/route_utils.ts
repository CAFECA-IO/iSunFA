import { EventEntityFrequency, EventEntityType } from '@/constants/event';
import { VoucherListTabV2, VoucherV2Action } from '@/constants/voucher';
import { IEventEntity } from '@/interfaces/event';
import { ILineItemEntity } from '@/interfaces/line_item';
import { IGetManyVoucherResponseButOne, IVoucherEntity } from '@/interfaces/voucher';
import { initEventEntity } from '@/lib/utils/event';
import { parsePrismaVoucherToVoucherEntity } from '@/lib/utils/formatter/voucher.formatter';
import { initLineItemEntity } from '@/lib/utils/line_item';
import { Logger } from 'pino';
import { parsePrismaLineItemToLineItemEntity } from '@/lib/utils/formatter/line_item.formatter';
import { initVoucherEntity } from '@/lib/utils/voucher';
import { parsePartialPrismaCounterPartyToCounterPartyEntity } from '@/lib/utils/formatter/counterparty.formatter';
import { parsePrismaAssetToAssetEntity } from '@/lib/utils/formatter/asset.formatter';
import {
  getDaysBetweenDates,
  getLastDatesOfMonthsBetweenDates,
  isFloatsEqual,
  timestampInSeconds,
} from '@/lib/utils/common';
import { EventType, ProgressStatus, TransactionStatus } from '@/constants/account';
import { JOURNAL_EVENT } from '@/constants/journal';
import { parsePrismaAccountBookToAccountBookEntity } from '@/lib/utils/formatter/account_book.formatter';
import { parsePrismaUserToUserEntity } from '@/lib/utils/formatter/user.formatter';
import { IUserEntity } from '@/interfaces/user';
import { calculateAssetDepreciationSerial } from '@/lib/utils/asset';
import { IAssetEntity } from '@/interfaces/asset';
import { getCompanyById } from '@/lib/utils/repo/account_book.repo';
import { STATUS_MESSAGE } from '@/constants/status_code';
import loggerBack from '@/lib/utils/logger_back';
import { getUserById } from '@/lib/utils/repo/user.repo';
import {
  getManyVoucherV2,
  getOneVoucherByIdWithoutInclude,
  postVoucherV2,
} from '@/lib/utils/repo/voucher.repo';
import { getCounterpartyById } from '@/lib/utils/repo/counterparty.repo';
import { getOneLineItemWithoutInclude } from '@/lib/utils/repo/line_item.repo';
import { getOneAssetByIdWithoutInclude } from '@/lib/utils/repo/asset.repo';
import { getOneCertificateByIdWithoutInclude } from '@/lib/utils/repo/certificate.repo';
import { SortBy, SortOrder } from '@/constants/sort';
import { IPaginatedData } from '@/interfaces/pagination';
import { LineItem as PrismaLineItem, Account as PrismaAccount, Prisma } from '@prisma/client';
import { parsePrismaAccountToAccountEntity } from '@/lib/utils/formatter/account.formatter';
import { parsePrismaFileToFileEntity } from '@/lib/utils/formatter/file.formatter';
import { parsePrismaEventToEventEntity } from '@/lib/utils/formatter/event.formatter';
import { voucherAPIGetOneUtils } from '@/pages/api/v2/account_book/[accountBookId]/voucher/[voucherId]/route_utils';
import { ICounterPartyEntityPartial } from '@/interfaces/counterparty';
import { IAccountEntity } from '@/interfaces/accounting_account';
import { AccountCodesOfAR, AccountCodesOfAP } from '@/constants/asset';
import { IFileEntity } from '@/interfaces/file';
import { IAccountBookWithoutTeamEntity } from '@/interfaces/account_book';

/**
 * Info: (20241121 - Murky)
 * @note 僅限於 GET /voucher 輸出時使用
 */
export type IGetManyVoucherBetaEntity = IVoucherEntity & {
  counterParty: ICounterPartyEntityPartial;
  issuer: IUserEntity & { imageFile: IFileEntity };
  lineItems: (ILineItemEntity & { account: IAccountEntity })[];
  sum: {
    debit: boolean;
    amount: number;
  };
  payableInfo: {
    total: number;
    alreadyHappened: number;
    remain: number;
  };
  receivingInfo: {
    total: number;
    alreadyHappened: number;
    remain: number;
  };
  originalEvents: IEventEntity[];
  resultEvents: IEventEntity[];
};

/**
 * Info: (20241120 - Murky)
 * @description all function need for voucher Post
 */
export const voucherAPIGetUtils = {
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
  getVoucherListFromPrisma: async (options: {
    accountBookId: number;
    startDate: number;
    endDate: number;
    page: number;
    pageSize: number;
    tab: VoucherListTabV2;
    sortOption: {
      sortBy: SortBy;
      sortOrder: SortOrder;
    }[];
    type?: EventType | undefined;
    searchQuery?: string | undefined;
    isDeleted?: boolean | undefined;
    hideReversedRelated?: boolean | undefined;
  }): Promise<
    IPaginatedData<IGetManyVoucherResponseButOne[]> & {
      where: Prisma.VoucherWhereInput;
    }
  > => {
    return getManyVoucherV2(options);
  },

  initVoucherEntity: (voucher: IGetManyVoucherResponseButOne) => {
    const voucherEntity = parsePrismaVoucherToVoucherEntity(voucher);
    voucherEntity.isReverseRelated = voucherAPIGetUtils.isVoucherReverseRelated(voucher);
    return voucherEntity;
  },

  initLineItemAndAccountEntity: (
    lineItem: PrismaLineItem & {
      account: PrismaAccount;
    }
  ) => {
    const lineItemEntity = parsePrismaLineItemToLineItemEntity(lineItem);
    const accountEntity = parsePrismaAccountToAccountEntity(lineItem.account);
    return {
      ...lineItemEntity,
      account: accountEntity,
    };
  },

  initLineItemAndAccountEntities: (voucher: IGetManyVoucherResponseButOne) => {
    const lineItems = voucher.lineItems.map(voucherAPIGetUtils.initLineItemAndAccountEntity);
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

  getLineItemAmountSum(lineItems: ILineItemEntity[]) {
    const sum = lineItems.reduce((acc, lineItem) => {
      if (lineItem.debit) {
        return acc + lineItem.amount;
      }
      return acc;
    }, 0);
    return sum;
  },
  /**
   * Info: (20241112 - Murky)
   * @description originalEvent 指的是 主要voucher 主於 AssociateVoucher中的original Id
   * @todo
   * - eventEntity需要包含：
   * ```
   * associateVouchers: [
   *   {
   *      originalVoucher: mockOriginalVoucher,
   *      resultVoucher: mockRevertVoucher,
   *   },
   * ],
   * ```
   * - originalVoucher和resultVoucher的lineItems需要用initLineItemEntities初始化
   * ```
   * lineItems: mockOriginalLineItems,
   * ```
   */
  initOriginalEventEntities: (voucher: IGetManyVoucherResponseButOne) => {
    const originalVoucher = parsePrismaVoucherToVoucherEntity(voucher);
    // Info: (20241112 - Murky) lineItems 都有 accountEntity
    const originalLineItems = voucherAPIGetUtils.initLineItemAndAccountEntities(voucher);
    originalVoucher.lineItems = originalLineItems;

    const originalEventEntities: IEventEntity[] = voucher.originalVouchers.map(
      (originalEventVoucher) => {
        const event = parsePrismaEventToEventEntity(originalEventVoucher.event);
        const resultVoucher = parsePrismaVoucherToVoucherEntity(originalEventVoucher.resultVoucher);
        // Info: (20241112 - Murky) lineItems 都有 accountEntity
        const resultLineItems = originalEventVoucher.resultVoucher.lineItems.map(
          voucherAPIGetUtils.initLineItemAndAccountEntity
        );
        resultVoucher.lineItems = resultLineItems;

        event.associateVouchers = [
          {
            originalVoucher,
            resultVoucher,
          },
        ];
        return event;
      }
    );
    return originalEventEntities;
  },

  /**
   * Info: (20250120 - Shirley)
   * @description 在 list voucher 時，用來檢查該傳票是否為「被刪除傳票」的迴轉傳票的標準
   */
  initResultEventEntities: (voucher: IGetManyVoucherResponseButOne) => {
    const resultVoucher = parsePrismaVoucherToVoucherEntity(voucher);
    // Info: (20250120 - Shirley) lineItems 都有 accountEntity
    const resultLineItems = voucherAPIGetUtils.initLineItemAndAccountEntities(voucher);
    resultVoucher.lineItems = resultLineItems;

    const resultEventEntities: IEventEntity[] = voucher.resultVouchers.map((resultEventVoucher) => {
      const event = parsePrismaEventToEventEntity(resultEventVoucher.event);
      const originalVoucher = parsePrismaVoucherToVoucherEntity(resultEventVoucher.originalVoucher);
      // Info: (20250120 - Shirley) lineItems 都有 accountEntity
      const originalLineItems = resultEventVoucher.originalVoucher.lineItems.map(
        voucherAPIGetUtils.initLineItemAndAccountEntity
      );
      originalVoucher.lineItems = originalLineItems;

      event.associateVouchers = [
        {
          originalVoucher,
          resultVoucher,
        },
      ];
      return event;
    });
    return resultEventEntities;
  },
  getPayableReceivableInfoFromVoucher: (
    events: IEventEntity[],
    lineItems: (ILineItemEntity & {
      account: IAccountEntity;
    })[]
  ) => {
    const payableTotal = lineItems.reduce((acc, lineItem) => {
      if (!lineItem.debit && AccountCodesOfAP.includes(lineItem.account.code)) {
        return acc + lineItem.amount;
      }
      return acc;
    }, 0);

    const receivingTotal = lineItems.reduce((acc, lineItem) => {
      if (lineItem.debit && AccountCodesOfAR.includes(lineItem.account.code)) {
        return acc + lineItem.amount;
      }
      return acc;
    }, 0);

    const payableInfo = {
      total: payableTotal,
      alreadyHappened: 0,
      remain: 0,
    };

    const receivingInfo = {
      total: receivingTotal,
      alreadyHappened: 0,
      remain: 0,
    };

    events.forEach((event) => {
      const { payableInfo: newPayableInfo, receivingInfo: newReceivingInfo } =
        voucherAPIGetOneUtils.getPayableReceivableInfo(event);
      payableInfo.alreadyHappened += newPayableInfo.alreadyHappened;
      payableInfo.remain += newPayableInfo.remain;

      receivingInfo.alreadyHappened += newReceivingInfo.alreadyHappened;
      receivingInfo.remain += newReceivingInfo.remain;
    });

    return {
      payableInfo,
      receivingInfo,
    };
  },
  getSortFunction: (
    sortBy: SortBy
  ): ((
    a: IGetManyVoucherBetaEntity,
    b: IGetManyVoucherBetaEntity,
    tab?: VoucherListTabV2
  ) => number) => {
    return (a, b, tab) => {
      switch (sortBy) {
        case SortBy.CREDIT:
        case SortBy.DEBIT:
          return a.sum.amount - b.sum.amount;

        case SortBy.PAY_RECEIVE_TOTAL:
          return tab === VoucherListTabV2.PAYMENT
            ? a.payableInfo.total - b.payableInfo.total
            : a.receivingInfo.total - b.receivingInfo.total;

        case SortBy.PAY_RECEIVE_ALREADY_HAPPENED:
          return tab === VoucherListTabV2.PAYMENT
            ? a.payableInfo.alreadyHappened - b.payableInfo.alreadyHappened
            : a.receivingInfo.alreadyHappened - b.receivingInfo.alreadyHappened;

        case SortBy.PAY_RECEIVE_REMAIN:
          return tab === VoucherListTabV2.PAYMENT
            ? a.payableInfo.remain - b.payableInfo.remain
            : a.receivingInfo.remain - b.receivingInfo.remain;

        default:
          return 0; // Info: (20241121 - Murky) 默認不排序
      }
    };
  },
  sortVoucherBetaList: (
    voucherBetas: IGetManyVoucherBetaEntity[],
    options: {
      sortOption: { sortBy: SortBy; sortOrder: SortOrder }[];
      tab: VoucherListTabV2;
    }
  ) => {
    const { sortOption, tab } = options;
    sortOption.forEach((option) => {
      const sortFunction = voucherAPIGetUtils.getSortFunction(option.sortBy);
      voucherBetas.sort(
        (a, b) => sortFunction(a, b, tab) * (option.sortOrder === SortOrder.ASC ? 1 : -1)
      );
    });
  },

  isVoucherReverseRelated: (voucher: IGetManyVoucherResponseButOne) => {
    // Info: (20250117 - Shirley) 檢查是否被刪除
    const isDeleted = !!voucher.deletedAt;

    // Info: (20250117 - Shirley) 檢查是否有關聯的反轉傳票
    const hasOriginalVouchers = voucher.originalVouchers.length > 0;
    const hasResultVouchers = voucher.resultVouchers.length > 0;

    return isDeleted || hasOriginalVouchers || hasResultVouchers;
  },

  filterTransactionStatus: (
    voucherBetas: IGetManyVoucherBetaEntity[],
    tab: VoucherListTabV2,
    status: TransactionStatus | undefined
  ) => {
    return voucherBetas.filter((voucher) => {
      switch (status) {
        case TransactionStatus.PENDING:
          if (tab === VoucherListTabV2.PAYMENT) {
            return voucher.payableInfo.remain > 0;
          } else {
            return voucher.receivingInfo.remain > 0;
          }
        case TransactionStatus.REVERSED:
          if (tab === VoucherListTabV2.PAYMENT) {
            return voucher.payableInfo.remain === 0;
          } else {
            return voucher.receivingInfo.remain === 0;
          }
        case undefined:
        default:
          return true;
      }
    });
  },
};

/**
 * Info: (20241025 - Murky)
 * @description all function need for voucher Post
 */
export const voucherAPIPostUtils = {
  fakeLineItemsRelation: Array<{
    id: number;
    debit: boolean;
    lineItemBeReversed: ILineItemEntity;
    lineItemRevertOther: ILineItemEntity;
    amount: number;
  }>,
  /**
   * Info: (20241025 - Murky)
   * @description determine if certain command is need to be done
   */
  isDoAction: ({ actions, command }: { actions: VoucherV2Action[]; command: VoucherV2Action }) => {
    return actions.includes(command);
  },
  isArrayHasItems: (item: unknown[]) => {
    return item.length > 0;
  },

  isItemExist: <T>(item: T | undefined | null): item is T => {
    return item !== undefined && item !== null;
  },

  isCounterPartyExistById: async (counterPartyId: number) => {
    const counterParty = await getCounterpartyById(counterPartyId);
    return !!counterParty;
  },

  isCertificateExistById: async (certificateId: number) => {
    const certificate = await getOneCertificateByIdWithoutInclude(certificateId);
    return !!certificate;
  },

  /**
   * Info: (20241025 - Murky)
   * @todo implement check voucher exist by voucherId from prisma logic
   */
  isVoucherExistById: async (voucherId: number) => {
    const voucher = await getOneVoucherByIdWithoutInclude(voucherId);
    return !!voucher;
  },

  /**
   * Info: (20241025 - Murky)
   * @todo implement check line item exist by voucherId from prisma logic
   */
  isLineItemExistById: async (lineItemId: number) => {
    const lineItem = await getOneLineItemWithoutInclude(lineItemId);
    return !!lineItem;
  },

  /**
   * Info: (20241025 - Murky)
   * @describe check asset exist by assetId from prisma
   */
  isAssetExistById: async (assetId: number) => {
    const asset = await getOneAssetByIdWithoutInclude(assetId);
    return !!asset;
  },

  isLineItemsBalanced: (
    lineItems: {
      amount: number;
      debit: boolean;
    }[]
  ) => {
    let debit = 0;
    let credit = 0;
    lineItems.forEach((lineItem) => {
      if (lineItem.debit) {
        debit += lineItem.amount;
      } else {
        credit += lineItem.amount;
      }
    });
    return isFloatsEqual(debit, credit);
  },
  /**
   * Info: (20241025 - Murky)
   * @describe convert voucherId to IVoucherEntity
   */
  initVoucherFromPrisma: async (voucherId: number) => {
    const voucherDto = await getOneVoucherByIdWithoutInclude(voucherId);

    if (!voucherDto) {
      voucherAPIPostUtils.throwErrorAndLog(loggerBack, {
        errorMessage: `Voucher not found In Voucher Post, initVoucherFromPrisma, voucherId: ${voucherId}`,
        statusMessage: STATUS_MESSAGE.RESOURCE_NOT_FOUND,
      });
    }

    const voucher = parsePrismaVoucherToVoucherEntity(voucherDto!);
    return voucher;
  },

  /**
   * Info: (20241025 - Murky)
   * @description get lineItem From Prisma and transform to ILineItemEntity
   */
  initLineItemFromPrisma: async (lineItemId: number) => {
    // ToDo: (20241025 - Murky) implement get voucher from prisma logic
    const lineItemDto = await getOneLineItemWithoutInclude(lineItemId);

    if (!lineItemDto) {
      voucherAPIPostUtils.throwErrorAndLog(loggerBack, {
        errorMessage: `LineItem not found In Voucher Post, initLineItemFromPrisma, lineItemId: ${lineItemId}`,
        statusMessage: STATUS_MESSAGE.RESOURCE_NOT_FOUND,
      });
    }

    const lineItem = parsePrismaLineItemToLineItemEntity(lineItemDto!);
    return lineItem;
  },

  /**
   * Info: (20241029 - Murky)
   * @todo implement get counter party from prisma logic
   */
  initCounterPartyFromPrisma: async (counterPartyId: number) => {
    const counterPartyDto = await getCounterpartyById(counterPartyId);
    if (!counterPartyDto) {
      voucherAPIPostUtils.throwErrorAndLog(loggerBack, {
        errorMessage: `CounterParty not found In Voucher Post, initCounterPartyFromPrisma, counterPartyId: ${counterPartyId}`,
        statusMessage: STATUS_MESSAGE.RESOURCE_NOT_FOUND,
      });
    }

    const counterParty = parsePartialPrismaCounterPartyToCounterPartyEntity(counterPartyDto!);
    return counterParty;
  },

  /**
   * Info: (20241029 - Murky)
   * @description get asset From Prisma and transform to IAssetEntity
   */
  initAssetFromPrisma: async (assetId: number) => {
    const assetDto = await getOneAssetByIdWithoutInclude(assetId);

    if (!assetDto) {
      voucherAPIPostUtils.throwErrorAndLog(loggerBack, {
        errorMessage: `Asset not found In Voucher Post, initAssetFromPrisma, assetId: ${assetId}`,
        statusMessage: STATUS_MESSAGE.RESOURCE_NOT_FOUND,
      });
    }

    const asset = parsePrismaAssetToAssetEntity(assetDto!);
    return asset;
  },

  /**
   * Info: (20241029 - Murky)
   * @description get company From Prisma and transform to IAccountBookWithoutTeamEntity
   */
  initCompanyFromPrisma: async (companyId: number) => {
    const companyDto = await getCompanyById(companyId);

    if (!companyDto) {
      voucherAPIPostUtils.throwErrorAndLog(loggerBack, {
        errorMessage: `Company not found In Voucher Post, initCompanyFromPrisma, companyId: ${companyId}`,
        statusMessage: STATUS_MESSAGE.RESOURCE_NOT_FOUND,
      });
    }

    const company: IAccountBookWithoutTeamEntity = parsePrismaAccountBookToAccountBookEntity(
      companyDto!
    );
    return company;
  },

  /**
   * Info: (20241029 - Murky)
   * @description get user From Prisma and transform to IUserEntity
   */
  initIssuerFromPrisma: async (issuerId: number) => {
    const issuerDto = await getUserById(issuerId);

    if (!issuerDto) {
      voucherAPIPostUtils.throwErrorAndLog(loggerBack, {
        errorMessage: `Issuer not found In Voucher Post, initIssuerFromPrisma, issuerId: ${issuerId}`,
        statusMessage: STATUS_MESSAGE.RESOURCE_NOT_FOUND,
      });
    }

    const issuer = parsePrismaUserToUserEntity(issuerDto!);
    return issuer;
  },
  /**
   * Info: (20241025 - Murky)
   * @description init revert event (but not yet save to database)
   * @param options
   * @param options.nowInSecond - number, current time in second
   * @param options.associateVouchers - Array, associateVouchers
   */
  initRevertEventEntity: ({
    nowInSecond,
    associateVouchers,
  }: {
    nowInSecond: number;
    associateVouchers: Array<{
      originalVoucher: IVoucherEntity;
      resultVoucher: IVoucherEntity;
      amount: number;
    }>;
  }) => {
    const revertEvent: IEventEntity = initEventEntity({
      eventType: EventEntityType.REVERT,
      frequency: EventEntityFrequency.ONCE,
      startDate: nowInSecond,
      endDate: nowInSecond,
      associateVouchers,
    });
    return revertEvent;
  },

  initRecurringWeeklyVouchers: ({
    originalVoucher,
    startDate,
    endDate,
    daysOfWeek,
  }: {
    originalVoucher: IVoucherEntity;
    startDate: number;
    endDate: number;
    daysOfWeek: number[];
  }) => {
    const recurringVoucher: IVoucherEntity[] = daysOfWeek
      .map((dayOfWeek) => {
        const voucherRecurringDates: Date[] = getDaysBetweenDates({
          startInSecond: startDate,
          endInSecond: endDate,
          dayByNumber: dayOfWeek,
        });

        const voucherRecurringByDay = voucherRecurringDates.map((date) => {
          return initVoucherEntity({
            issuerId: originalVoucher.issuerId,
            counterPartyId: originalVoucher.counterPartyId,
            accountBookId: originalVoucher.accountBookId,
            type: originalVoucher.type,
            status: JOURNAL_EVENT.UPCOMING,
            editable: true,
            no: originalVoucher.no,
            date: timestampInSeconds(date.getTime()),
          });
        });

        return voucherRecurringByDay;
      })
      .flat();
    return recurringVoucher;
  },

  initRecurringMonthlyVouchers: ({
    originalVoucher,
    startDate,
    endDate,
    monthsOfYear,
  }: {
    originalVoucher: IVoucherEntity;
    startDate: number;
    endDate: number;
    monthsOfYear: number[];
  }) => {
    const recurringVoucher: IVoucherEntity[] = monthsOfYear
      .map((monthOfYear) => {
        const voucherRecurringDates: Date[] = getLastDatesOfMonthsBetweenDates({
          startInSecond: startDate,
          endInSecond: endDate,
          monthByNumber: monthOfYear,
        });
        const voucherRecurringByMonth = voucherRecurringDates.map((date) => {
          return initVoucherEntity({
            issuerId: originalVoucher.issuerId,
            counterPartyId: originalVoucher.counterPartyId,
            accountBookId: originalVoucher.accountBookId,
            type: originalVoucher.type,
            status: JOURNAL_EVENT.UPCOMING,
            editable: true,
            no: originalVoucher.no,
            date: timestampInSeconds(date.getTime()),
          });
        });

        return voucherRecurringByMonth;
      })
      .flat();
    return recurringVoucher;
  },

  initRecurringVouchers: ({
    type,
    voucherDateInSecond,
    originalVoucher,
    startDateInSecond,
    endDateInSecond,
    daysOfWeek,
    monthsOfYear,
  }: {
    type: EventEntityFrequency.MONTHLY | EventEntityFrequency.WEEKLY;
    voucherDateInSecond: number;
    originalVoucher: IVoucherEntity;
    startDateInSecond: number;
    endDateInSecond: number;
    daysOfWeek: number[];
    monthsOfYear: number[];
  }) => {
    let recurringVoucher: IVoucherEntity[];
    // ToDo: (20241030 - Murky)  要小心同一天可能是月底的問題, 或是同一個星期天
    const now = new Date(timestampInSeconds(voucherDateInSecond));

    // Info: (20241030 - Murky) Start date 不可以比voucherDate早
    const startDate = new Date(
      timestampInSeconds(Math.max(startDateInSecond, voucherDateInSecond))
    );
    switch (type) {
      case EventEntityFrequency.WEEKLY: {
        let startDateAdjust = startDateInSecond;
        const nextDayOfWeek = daysOfWeek.find((dayOfWeek) => dayOfWeek > now.getDay());

        // Info: (20241030 - Murky) 如果Recurring的第一天是startDate, 且是VoucherDate, 那麼就要往後一天
        if (
          nextDayOfWeek &&
          nextDayOfWeek === startDate.getDay() &&
          startDate.getDate() === now.getDate() &&
          startDate.getMonth() === now.getMonth()
        ) {
          startDateAdjust = timestampInSeconds(startDate.setDate(startDate.getDate() + 1));
        }

        recurringVoucher = voucherAPIPostUtils.initRecurringWeeklyVouchers({
          originalVoucher,
          startDate: startDateAdjust,
          endDate: endDateInSecond,
          daysOfWeek,
        });

        break;
      }
      case EventEntityFrequency.MONTHLY: {
        let startDateAdjust = startDateInSecond;

        const nextMonthOfYear = monthsOfYear.find(
          (monthOfYear) => monthOfYear > startDate.getMonth()
        );
        const lastDateOfMonth = new Date(
          startDate.getFullYear(),
          startDate.getMonth() + 1,
          0
        ).getDate();
        // Info: (20241030 - Murky) 如果Recurring的第一天是startDate 也就是月底, 那麼就要往後一天
        if (
          nextMonthOfYear &&
          nextMonthOfYear === startDate.getMonth() &&
          startDate.getDate() === lastDateOfMonth
        ) {
          startDateAdjust = timestampInSeconds(startDate.setDate(startDate.getDate() + 1));
        }

        recurringVoucher = voucherAPIPostUtils.initRecurringMonthlyVouchers({
          originalVoucher,
          startDate: startDateAdjust,
          endDate: endDateInSecond,
          monthsOfYear,
        });
        break;
      }
      default:
        throw new Error(STATUS_MESSAGE.NOT_YET_IMPLEMENTED);
    }
    return recurringVoucher;
  },

  initRecurringAssociateVouchers: ({
    originalVoucher,
    recurringInfo,
  }: {
    originalVoucher: IVoucherEntity;
    recurringInfo: {
      type: EventEntityFrequency.MONTHLY | EventEntityFrequency.WEEKLY;
      startDate: number;
      endDate: number;
      daysOfWeek: number[];
      monthsOfYear: number[];
    };
  }) => {
    const recurringVoucher: IVoucherEntity[] = voucherAPIPostUtils.initRecurringVouchers({
      type: recurringInfo.type,
      voucherDateInSecond: originalVoucher.date,
      originalVoucher,
      startDateInSecond: recurringInfo.startDate,
      endDateInSecond: recurringInfo.endDate,
      daysOfWeek: recurringInfo.daysOfWeek,
      monthsOfYear: recurringInfo.monthsOfYear,
    });
    // ToDo: (20241030 - Murky)  要小心同一天可能是月底的問題, 或是同一個星期天

    const associateVouchers = recurringVoucher.map((voucher) => {
      return {
        originalVoucher,
        resultVoucher: voucher,
      };
    });

    return associateVouchers;
  },

  /**
   * Info: (20241025 - Murky)
   * @description init recurring event (but not yet save to database)
   * @param options
   * @param options.nowInSecond - number, current time in second
   * @param options.associateVouchers - Array, associateVouchers with originalVoucher and resultVoucher
   */
  initRecurringEventEntity: ({
    startDateInSecond,
    endDateInSecond,
    associateVouchers,
    frequency,
    daysOfWeek,
    monthsOfYear,
  }: {
    startDateInSecond: number;
    endDateInSecond: number;
    frequency: EventEntityFrequency.MONTHLY | EventEntityFrequency.WEEKLY;
    daysOfWeek: number[];
    monthsOfYear: number[];
    associateVouchers: Array<{
      originalVoucher: IVoucherEntity;
      resultVoucher: IVoucherEntity;
    }>;
  }) => {
    const revertEvent: IEventEntity = initEventEntity({
      eventType: EventEntityType.REPEAT,
      frequency,
      startDate: startDateInSecond,
      endDate: endDateInSecond,
      associateVouchers,
      daysOfWeek,
      monthsOfYear,
    });
    return revertEvent;
  },
  areAllCertificatesExistById: async (certificateIds: number[]): Promise<boolean> => {
    const results = await Promise.all(
      certificateIds.map(async (id) => voucherAPIPostUtils.isCertificateExistById(id))
    );
    return results.every((result) => result === true);
  },

  /**
   * Info: (20241025 - Murky)
   * @description check all vouchers exist by voucherIds in prisma
   */
  areAllVouchersExistById: async (voucherIds: number[]): Promise<boolean> => {
    const results = await Promise.all(
      voucherIds.map(async (id) => voucherAPIPostUtils.isVoucherExistById(id))
    );
    return results.every((result) => result === true);
  },

  /**
   * Info: (20241025 - Murky)
   * @description check all lineItem exist by lineItemIds in prisma
   */
  areAllLineItemsExistById: async (lineItemIds: number[]): Promise<boolean> => {
    const results = await Promise.all(
      lineItemIds.map(async (id) => voucherAPIPostUtils.isLineItemExistById(id))
    );
    return results.every((result) => result === true);
  },

  /**
   * Info: (20241025 - Murky)
   * @description check all asset exist by voucherIds in prisma
   */
  areAllAssetsExistById: async (assetIds: number[]): Promise<boolean> => {
    const results = await Promise.all(
      assetIds.map(async (id) => voucherAPIPostUtils.isAssetExistById(id))
    );
    return results.every((result) => result === true);
  },

  /**
   * Info: (20241025 - Murky)
   * @description init lineItemEntities from lineItems in body
   */
  initLineItemEntities: (
    lineItems: {
      debit: boolean;
      description: string;
      amount: number;
      accountId: number;
    }[]
  ) => {
    const lineItemEntities: ILineItemEntity[] = lineItems.map((lineItem) => {
      return initLineItemEntity({
        amount: lineItem.amount,
        debit: lineItem.debit,
        description: lineItem.description,
        accountId: lineItem.accountId,
      });
    });

    return lineItemEntities;
  },

  /**
   * Info: (20241029 - Murky)
   * @description convert associateVoucherInfo from front-end
   *  to "associateVouchers" in IEventEntity
   * @param originalVoucher - IVoucherEntity, for original voucher
   * @param revertOtherLineItems - ILineItemEntity[], for lineItems post by front-end
   * @param reverseVouchersInfo - Array, for reverse vouchers relation
   * @param reverseVouchersInfo.voucherId - number, voucherId that be reversed
   * @param reverseVouchersInfo.amount - number, amount of reverse voucher
   * @param reverseVouchersInfo.lineItemIdBeReversed - number, lineItemId that be reversed
   * @param reverseVouchersInfo.lineItemIdReverseOther - number, lineItem Index (in originalLineItems) that reverse other,
   * since lineItems that reverse others not yet created
   * @returns Array, associateVouchers
   * - originalVoucher 是從資料庫拿出來，用戶打勾選的
   * - reversedVoucher 是這次新建的
   */
  initRevertAssociateVouchers: async ({
    originalVoucher,
    revertOtherLineItems,
    reverseVouchersInfo,
  }: {
    originalVoucher: IVoucherEntity;
    revertOtherLineItems: ILineItemEntity[];
    reverseVouchersInfo: Array<{
      voucherId: number;
      amount: number;
      lineItemIdBeReversed: number;
      lineItemIdReverseOther: number;
    }>;
  }) => {
    return Promise.all(
      reverseVouchersInfo.map(async (reverseVoucher) => {
        const reverseVoucherEntity = await voucherAPIPostUtils.initVoucherFromPrisma(
          reverseVoucher.voucherId
        );
        // Info: (20241029 - Murky) Deep copy original voucher
        const originalVoucherCopy = initVoucherEntity({
          issuerId: originalVoucher.issuerId,
          counterPartyId: originalVoucher.counterPartyId,
          accountBookId: originalVoucher.accountBookId,
          type: originalVoucher.type,
          status: originalVoucher.status,
          editable: originalVoucher.editable,
          no: originalVoucher.no,
          date: originalVoucher.date,
        });

        const lineItemBeReversed = await voucherAPIPostUtils.initLineItemFromPrisma(
          reverseVoucher.lineItemIdBeReversed
        );

        // Info: (20241111 - Murky) [Warning!] 用來Reverse別人的lineItems根本還沒有建立，所以是originalLineItems 的id
        // const lineItemRevertOther = await voucherAPIPostUtils.initLineItemFromPrisma(
        //   reverseVoucher.voucherId
        // );
        const lineItemRevertOther = revertOtherLineItems[reverseVoucher.lineItemIdReverseOther];

        reverseVoucherEntity.lineItems = [lineItemBeReversed];
        originalVoucherCopy.lineItems = [lineItemRevertOther];

        return {
          originalVoucher: reverseVoucherEntity,
          resultVoucher: originalVoucherCopy,
          amount: reverseVoucher.amount,
        };
      })
    );
  },

  initDepreciationVoucher: (expenseInfo: {
    issuer: IUserEntity;
    company: IAccountBookWithoutTeamEntity;
    currentPeriodYear: number;
    currentPeriodMonth: number;
  }) => {
    const {
      issuer: { id: userId },
      company: { id: companyId },
      currentPeriodYear,
      currentPeriodMonth,
    } = expenseInfo;
    // Info: (20241029 - Murky) currentPeriodMonth is 1-based
    const lastDateOfMonth = new Date(currentPeriodYear, currentPeriodMonth - 1, 0).getDate();

    // Info: (20241029 - Murky) 需要從折舊當天取得voucherNo
    const voucherDate = new Date(currentPeriodYear, currentPeriodMonth - 1, lastDateOfMonth);
    const voucherDateInSecond = timestampInSeconds(voucherDate.getTime());
    const depreciateExpenseVoucherNo = ''; // Info: (20241029 - Murky) 需要在存入database的時候取得voucherNo
    const depreciateExpenseVoucher = initVoucherEntity({
      issuerId: userId,
      counterPartyId: null,
      accountBookId: companyId,
      type: EventType.TRANSFER,
      status: JOURNAL_EVENT.UPCOMING,
      editable: true,
      no: depreciateExpenseVoucherNo,
      date: voucherDateInSecond,
    });

    return depreciateExpenseVoucher;
  },

  initDepreciationVoucherFromAssetEntity: (
    assetEntity: IAssetEntity,
    {
      nowInSecond,
      issuer,
      company,
    }: {
      nowInSecond: number;
      issuer: IUserEntity;
      company: IAccountBookWithoutTeamEntity;
    }
  ) => {
    // Info: (20241029 - Murky) 每個asset都有一整串的折舊
    const depreciateExpenseInfoArray = calculateAssetDepreciationSerial(assetEntity, {
      nowInSecond,
    });

    const depreciateExpenseVouchers = depreciateExpenseInfoArray.map((info) => {
      const depreciateExpenseVoucher = voucherAPIPostUtils.initDepreciationVoucher({
        issuer,
        company,
        currentPeriodMonth: info.currentPeriodMonth,
        currentPeriodYear: info.currentPeriodYear,
      });

      return depreciateExpenseVoucher;
    });

    return depreciateExpenseVouchers;
  },

  initAddAssetAssociateVouchers: ({
    originalVoucher,
    depreciatedExpenseVouchers,
  }: {
    originalVoucher: IVoucherEntity;
    depreciatedExpenseVouchers: IVoucherEntity[];
  }) => {
    const associateVouchers = depreciatedExpenseVouchers.map((depreciatedExpenseVoucher) => {
      return {
        originalVoucher,
        resultVoucher: depreciatedExpenseVoucher,
      };
    });

    return associateVouchers;
  },

  initAddAssetEventEntity: ({
    originalVoucher,
    depreciatedExpenseVouchers,
  }: {
    originalVoucher: IVoucherEntity;
    depreciatedExpenseVouchers: IVoucherEntity[];
  }) => {
    const associateVouchers = voucherAPIPostUtils.initAddAssetAssociateVouchers({
      originalVoucher,
      depreciatedExpenseVouchers,
    });

    // Info: (20241029 - Murky) Warning: 折舊活動目前先放Once
    const addAssetEvent: IEventEntity = initEventEntity({
      eventType: EventEntityType.ASSET,
      frequency: EventEntityFrequency.ONCE,
      startDate: originalVoucher.date,
      endDate: originalVoucher.date,
      associateVouchers,
    });

    return addAssetEvent;
  },

  saveVoucherToPrisma: async (options: {
    nowInSecond: number;
    company: IAccountBookWithoutTeamEntity;
    originalVoucher: IVoucherEntity;
    issuer: IUserEntity;
    eventControlPanel: {
      revertEvent: IEventEntity | null;
      recurringEvent: IEventEntity | null;
      assetEvent: IEventEntity | null;
    };
    certificateIds: number[];
    invoiceRC2Ids: number[];
  }) => {
    const newVoucher = await postVoucherV2(options);

    // Deprecated: (20241111 - Murky) 如果沒有Post成功， 暫時先throw error

    if (!newVoucher) {
      voucherAPIPostUtils.throwErrorAndLog(loggerBack, {
        errorMessage: 'Voucher not save in database',
        statusMessage: STATUS_MESSAGE.INTERNAL_SERVICE_ERROR,
      });
    }

    return newVoucher;
  },

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
};

/**
 * Info: (20240927 - Murky)
 * This file is not router, but all small function for voucher/index and voucher/read
 */
export const mockVouchersReturn = [
  {
    id: 1001,
    eventId: null, // Info: (20240927 - Murky) will be null if not recurring, integer if recurring
    hasRead: true,
    status: 'uploaded', // Info: (20240927 - Murky) "uploaded" or "upcoming"
    canBeEdit: true, // Info: (20240927 - Murky) true or false
    voucherNo: '240417-001',
    voucherDate: 1000000,
    type: 'payment', // Info: (20240927 - Murky)  payment or transfer or receiving
    note: 'This is a note',
    createAt: 1000000,
    updateAt: 1000000,
    deletedAt: null, // Info: (20240927 - Murky) if have Number then it is deleted
    reverseAt: 1727317, // Info: (20240927 - Murky) if have Number then it is reversed
    certificates: [
      {
        id: 1,
        inputOrOutput: 'input',
        certificateDate: 10000001,
        certificateNo: 'AB-12345678',
        currencyAlias: 'TWD',
        priceBeforeTax: 4000,
        taxRatio: 5,
        taxPrice: 200,
        totalPrice: 4200,
        counterPartyId: 1,
        invoiceType: 'triplicate_uniform_invoice',
        deductible: true,
        connectToId: null,
        name: 'invoice001.jpg',
        url: '/api/v2/certificate/1',
        type: 'invoice',
        connectToType: 'voucher',
        mimeTYpe: 'image/jpeg',
        size: '3.0 MB',
        uploadProgress: 50,
        aiResultId: 'douhvjax_-1',
        aiStatus: ProgressStatus.SUCCESS,
        createAt: 10000000,
        updateAt: 10000000,
      },
    ],
    reverseVoucherIds: [
      // Info: (20240927 - Murky) 或是完整的voucher?
      {
        id: 1111,
        voucherNo: '240817-001',
        type: 'reverse',
      },
      {
        id: 1112,
        voucherNo: '240817-002',
        type: 'reverse',
      },
    ],
    deletedReverseVoucherIds: [],
    issuer: {
      // Info: (20240927 - Murky) IUser
      id: 1001,
      name: 'Murky',
      fullName: 'Tiny Murky',
      email: 'fakeemail@cool.com',
      phone: '1234567890',
      imageId: '/api/v2/image/1001.jpg',
      agreementList: ['agreement1', 'agreement2'],
      createdAt: 1000000,
      updatedAt: 1000000,
    },
    counterParty: {
      // Info: (20240927 - Murky) ICounterparty
      id: 1001,
      companyId: 1001,
      name: 'Cool LLC',
      taxId: '12345678',
      type: 'customer',
      note: 'This is a note',
      createdAt: 1000000,
      updatedAt: 1000000,
    },
    payableInfo: {
      // Info: (20240927 - Murky) payableInfo 如果存在，那麼receivingInfo就會都是0
      total: 1000,
      alreadyHappened: 400,
      remain: 600,
    },
    receivingInfo: {
      total: 1000,
      alreadyHappened: 400,
      remain: 600,
    },
    recurringInfo: {
      type: 'month', // Info: (20240927 - Murky) month or year or week or atOnce
      startDate: 1000000,
      endDate: 1000100,
      daysOfWeek: [0, 1, 2], // Info: (20240927 - Murky) 這邊是示範，如果type是week, 這個array才有東西, 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
      daysOfMonth: [1, 15, 30], // Info: (20240927 - Murky) 這邊是示範，如果type是month, 這個array才有東西
      daysOfYears: [
        {
          month: 1,
          day: 1,
        },
        {
          month: 12,
          day: 25,
        },
      ], // Info: (20240927 - Murky) 這邊是示範，如果type是year, 這個array才有東西
    },
    assets: [
      // Info: (20240927 - Murky) IAssetItem
      {
        id: 1,
        acquisitionDate: 1632511200,
        assetType: '123 Machinery',
        assetNumber: 'A000010',
        assetName: 'MackBook',
        purchasePrice: 100000,
        accumulatedDepreciation: 5000,
        residualValue: 5000,
        remainingTimestamp: 1761580800,
        assetStatus: 'normal', // Info: (20240927 - Murky) AssetStatus.NORMAL,
      },
    ],
    lineItemsInfo: {
      sum: {
        debit: true,
        amount: 1000,
      },
      lineItems: [
        {
          id: 1001,
          amount: 1000,
          description: 'This is a description',
          debit: true,
          account: {
            id: 1001,
            companyId: 1001,
            system: 'IFRS',
            type: 'Asset',
            debit: true,
            liquidity: true,
            code: '1001',
            name: 'Cash',
            forUser: true,
            parentCode: '1000',
            rootCode: '1000',
            createdAt: 1000000,
            updatedAt: 1000000,
            level: 1,
            deletedAt: null,
          },
          voucherId: 1001,
          createdAt: 1000000,
          updatedAt: 1000000,
          deletedAt: null,
        },
        {
          id: 1002,
          amount: 1001,
          description: 'This is a description',
          debit: false,
          account: {
            id: 1002,
            companyId: 1001,
            system: 'IFRS',
            type: 'Asset',
            debit: true,
            liquidity: true,
            code: '1002',
            name: 'Accounts Receivable',
            forUser: true,
            parentCode: '1000',
            rootCode: '1000',
            createdAt: 1000000,
            updatedAt: 1000000,
            level: 1,
            deletedAt: null,
          },
          voucherId: 1001,
          createdAt: 1000000,
          updatedAt: 1000000,
          deletedAt: null,
        },
      ],
    },
  },
];
