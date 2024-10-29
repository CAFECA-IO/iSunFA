import { EventEntityFrequency, EventEntityType } from '@/constants/event';
import { VoucherV2Action } from '@/constants/voucher';
import { IEventEntity } from '@/interfaces/event';
import { ILineItemEntity } from '@/interfaces/line_item';
import { IVoucherEntity } from '@/interfaces/voucher';
import { initEventEntity } from '@/lib/utils/event';
import { parsePrismaVoucherToVoucherEntity } from '@/lib/utils/formatter/voucher.formatter';
import { initLineItemEntity } from '@/lib/utils/line_item';
import { Logger } from 'pino';
import {
  Voucher as PrismaVoucher,
  LineItem as PrismaLineItem,
  Counterparty as PrismaCounterParty,
  Asset as PrismaAsset,
  Company as PrismaCompany,
  User as PrismaUser,
} from '@prisma/client';
import { parsePrismaLineItemToLineItemEntity } from '@/lib/utils/formatter/line_item.formatter';
import { initVoucherEntity } from '@/lib/utils/voucher';
import { parsePrismaCounterPartyToCounterPartyEntity } from '@/lib/utils/formatter/counterparty.formatter';
import { parsePrismaAssetToAssetEntity } from '@/lib/utils/formatter/asset.formatter';
import { timestampInSeconds } from '@/lib/utils/common';
import { PUBLIC_COUNTER_PARTY } from '@/constants/counterparty';
import { EventType } from '@/constants/account';
import { JOURNAL_EVENT } from '@/constants/journal';
import { parsePrismaCompanyToCompanyEntity } from '@/lib/utils/formatter/company.formatter';
import { parsePrismaUserToUserEntity } from '@/lib/utils/formatter/user.formatter';
import { IUserEntity } from '@/interfaces/user';
import { ICompanyEntity } from '@/interfaces/company';
import { calculateAssetDepreciationSerial } from '@/lib/utils/asset';
import { IAssetEntity } from '@/interfaces/asset';
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

  /**
   * Info: (20241025 - Murky)
   * @todo implement check voucher exist by voucherId from prisma logic
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isVoucherExistById: async (voucherId: number) => {
    return true;
  },

  /**
   * Info: (20241025 - Murky)
   * @todo implement check asset exist by assetId from prisma logic
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isAssetExistById: async (assetId: number) => {
    return true;
  },

  /**
   * Info: (20241025 - Murky)
   * @todo implement get voucher from prisma logic
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  initVoucherFromPrisma: async (voucherId: number) => {
    // ToDo: (20241025 - Murky) implement get voucher from prisma logic
    const voucherDto = {} as PrismaVoucher;
    const voucher = parsePrismaVoucherToVoucherEntity(voucherDto);
    return voucher;
  },

  /**
   * Info: (20241025 - Murky)
   * @todo implement get line item from prisma logic
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  initLineItemFromPrisma: async (lineItemId: number) => {
    // ToDo: (20241025 - Murky) implement get voucher from prisma logic
    const lineItemDto = {} as PrismaLineItem;
    const lineItem = parsePrismaLineItemToLineItemEntity(lineItemDto);
    return lineItem;
  },

  /**
   * Info: (20241029 - Murky)
   * @todo implement get counter party from prisma logic
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  initCounterPartyFromPrisma: async (counterPartyId: number) => {
    const counterPartyDto = {} as PrismaCounterParty;
    const counterParty = parsePrismaCounterPartyToCounterPartyEntity(counterPartyDto);
    return counterParty;
  },

  /**
   * Info: (20241029 - Murky)
   * @todo implement get asset from prisma logic
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  initAssetFromPrisma: async (assetId: number) => {
    const assetDto = {} as PrismaAsset;
    const asset = parsePrismaAssetToAssetEntity(assetDto);
    return asset;
  },

  /**
   * Info: (20241029 - Murky)
   * @todo implement get company from prisma logic
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  initCompanyFromPrisma: async (assetId: number) => {
    const companyDto = {} as PrismaCompany;
    const company = parsePrismaCompanyToCompanyEntity(companyDto);
    return company;
  },

  /**
   * Info: (20241029 - Murky)
   * @todo implement get issuer from prisma logic
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  initIssuerFromPrisma: async (issuerId: number) => {
    const issuerDto = {} as PrismaUser;
    const issuer = parsePrismaUserToUserEntity(issuerDto);
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
   * @param reverseVouchersInfo - Array, for reverse vouchers relation
   * @param reverseVouchersInfo.voucherId - number, voucherId that be reversed
   * @param reverseVouchersInfo.amount - number, amount of reverse voucher
   * @param reverseVouchersInfo.lineItemIdBeReversed - number, lineItemId that be reversed
   * @param reverseVouchersInfo.lineItemIdReverseOther - number, lineItemId that reverse other
   */
  initRevertAssociateVouchers: async ({
    originalVoucher,
    reverseVouchersInfo,
  }: {
    originalVoucher: IVoucherEntity;
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
          companyId: originalVoucher.companyId,
          type: originalVoucher.type,
          status: originalVoucher.status,
          editable: originalVoucher.editable,
          no: originalVoucher.no,
          date: originalVoucher.date,
        });

        const lineItemBeReversed = await voucherAPIPostUtils.initLineItemFromPrisma(
          reverseVoucher.voucherId
        );

        const lineItemRevertOther = await voucherAPIPostUtils.initLineItemFromPrisma(
          reverseVoucher.voucherId
        );

        reverseVoucherEntity.lineItems = [lineItemRevertOther];
        originalVoucherCopy.lineItems = [lineItemBeReversed];

        return {
          originalVoucher: originalVoucherCopy,
          resultVoucher: reverseVoucherEntity,
          amount: reverseVoucher.amount,
        };
      })
    );
  },

  initDepreciationVoucher: (expenseInfo: {
    issuer: IUserEntity;
    company: ICompanyEntity;
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
      counterPartyId: PUBLIC_COUNTER_PARTY.id,
      companyId,
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
      company: ICompanyEntity;
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
        aiStatus: 'success',
        createAt: 10000000,
        updateAt: 10000000,
      },
    ],
    reverseVoucherIds: [
      // Info: (20240927 - Murky) 或是完整的voucher?
      {
        id: 1111,
        voucherNo: '240817-001',
      },
      {
        id: 1112,
        voucherNo: '240817-002',
      },
    ],
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
