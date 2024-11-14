import { IEventEntity } from '@/interfaces/event';
import { ILineItemEntity } from '@/interfaces/line_item';
import { AccountCodesOfAR, AccountCodesOfAP } from '@/constants/asset';
import { Logger } from 'pino';
import { IGetOneVoucherResponse } from '@/interfaces/voucher';
import loggerBack from '@/lib/utils/logger_back';
import { STATUS_MESSAGE } from '@/constants/status_code';
import type { AccountingSetting as PrismaAccountingSetting } from '@prisma/client';
import {
  Asset as PrismaAsset,
  AssetVoucher as PrismaAssetVoucher,
  Account as PrismaAccount,
  LineItem as PrismaLineItem,
  Certificate as PrismaCertificate,
  Invoice as PrismaInvoice,
  File as PrismaFile,
  UserCertificate as PrismaUserCertificate,
} from '@prisma/client';
import { IAssetEntity } from '@/interfaces/asset';
import { getOneVoucherV2 } from '@/lib/utils/repo/voucher.repo';
import { getAccountingSettingByCompanyId } from '@/lib/utils/repo/accounting_setting.repo';
import { parsePrismaUserToUserEntity } from '@/lib/utils/formatter/user.formatter';
import { parsePrismaCounterPartyToCounterPartyEntity } from '@/lib/utils/formatter/counterparty.formatter';
import { parsePrismaVoucherToVoucherEntity } from '@/lib/utils/formatter/voucher.formatter';
import { parsePrismaLineItemToLineItemEntity } from '@/lib/utils/formatter/line_item.formatter';
import { parsePrismaEventToEventEntity } from '@/lib/utils/formatter/event.formatter';
import { parsePrismaAssetToAssetEntity } from '@/lib/utils/formatter/asset.formatter';
import { parsePrismaAccountToAccountEntity } from '@/lib/utils/formatter/account.formatter';
import { parsePrismaInvoiceToInvoiceEntity } from '@/lib/utils/formatter/invoice.formatter';
import { parsePrismaUserCertificateToUserCertificateEntity } from '@/lib/utils/formatter/user_certificate.formatter';
import { parsePrismaFileToFileEntity } from '@/lib/utils/formatter/file.formatter';
import { parsePrismaCertificateToCertificateEntity } from '@/lib/utils/formatter/certificate.formatter';

export const voucherAPIGetOneUtils = {
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
   * Info: (20241112 - Murky)
   * @description call repo function and get voucher from prisma
   * @error throw Error if voucher not found (null)
   */
  getVoucherFromPrisma: async (voucherId: number): Promise<IGetOneVoucherResponse> => {
    const voucher: IGetOneVoucherResponse | null = await getOneVoucherV2(voucherId);
    if (!voucher) {
      voucherAPIGetOneUtils.throwErrorAndLog(loggerBack, {
        errorMessage: `voucherId: ${voucherId} not found`,
        statusMessage: STATUS_MESSAGE.RESOURCE_NOT_FOUND,
      });
    }
    return voucher!;
  },

  /**
   * Info: (20241112 - Murky)
   * @describe get account setting from prisma, in order to get currency
   */
  getAccountingSettingFromPrisma: async (companyId: number): Promise<PrismaAccountingSetting> => {
    const accountingSetting: PrismaAccountingSetting | null =
      await getAccountingSettingByCompanyId(companyId);
    if (!accountingSetting) {
      voucherAPIGetOneUtils.throwErrorAndLog(loggerBack, {
        errorMessage: `companyId: ${companyId} not found`,
        statusMessage: STATUS_MESSAGE.RESOURCE_NOT_FOUND,
      });
    }
    return accountingSetting!;
  },

  /**
   * Info: (20241112 - Murky)
   * @describe extract issuer entity from voucher
   */
  initIssuerEntity: (voucher: IGetOneVoucherResponse) => {
    const issuerDto = voucher.issuer;
    const issuer = parsePrismaUserToUserEntity(issuerDto);
    return issuer;
  },

  /**
   * Info: (20241112 - Murky)
   * @describe extract counter party entity from voucher
   */
  initCounterPartyEntity: (voucher: IGetOneVoucherResponse) => {
    const counterPartyDto = voucher.counterparty;
    const counterParty = parsePrismaCounterPartyToCounterPartyEntity(counterPartyDto);
    return counterParty;
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
  initOriginalEventEntities: (voucher: IGetOneVoucherResponse) => {
    const originalVoucher = parsePrismaVoucherToVoucherEntity(voucher);
    // Info: (20241112 - Murky) lineItems 都有 accountEntity
    const originalLineItems = voucher.lineItems.map(voucherAPIGetOneUtils.initLineItemEntity);
    originalVoucher.lineItems = originalLineItems;

    const originalEventEntities: IEventEntity[] = voucher.originalVouchers.map(
      (originalEventVoucher) => {
        const event = parsePrismaEventToEventEntity(originalEventVoucher.event);
        const resultVoucher = parsePrismaVoucherToVoucherEntity(originalEventVoucher.resultVoucher);
        // Info: (20241112 - Murky) lineItems 都有 accountEntity
        const resultLineItems = originalEventVoucher.resultVoucher.lineItems.map(
          voucherAPIGetOneUtils.initLineItemEntity
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
  initResultEventEntities: (voucher: IGetOneVoucherResponse) => {
    const resultVoucher = parsePrismaVoucherToVoucherEntity(voucher);
    // Info: (20241112 - Murky) lineItems 都有 accountEntity
    const resultLineItems = voucher.lineItems.map(voucherAPIGetOneUtils.initLineItemEntity);
    resultVoucher.lineItems = resultLineItems;

    const resultEventEntities: IEventEntity[] = voucher.resultVouchers.map((resultEventVoucher) => {
      const event = parsePrismaEventToEventEntity(resultEventVoucher.event);
      const originalVoucher = parsePrismaVoucherToVoucherEntity(resultEventVoucher.originalVoucher);
      // Info: (20241112 - Murky) lineItems 都有 accountEntity
      const originalLineItems = resultEventVoucher.originalVoucher.lineItems.map(
        voucherAPIGetOneUtils.initLineItemEntity
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

  /**
   * Info: (20241112 - Murky)
   * @description init asset entity from assetVoucher
   */
  initAssetEntity: (
    assetVoucher: PrismaAssetVoucher & {
      asset: PrismaAsset;
    }
  ) => {
    const assetDto = assetVoucher.asset;
    const asset = parsePrismaAssetToAssetEntity(assetDto);
    return asset;
  },

  /**
   * Info: (20241112 - Murky)
   * @description init asset entities from assetVouchers
   */
  initAssetEntities: (voucher: IGetOneVoucherResponse) => {
    const assetEntities: IAssetEntity[] = voucher.assetVouchers.map((assetVoucher) => {
      return voucherAPIGetOneUtils.initAssetEntity(assetVoucher);
    });
    return assetEntities;
  },

  /**
   * Info: (20241112 - Murky)
   * @description init lineItem entity from lineItem, and init account entity from account and combine
   */
  initLineItemEntity: (
    lineItem: PrismaLineItem & {
      account: PrismaAccount;
    }
  ) => {
    const lineItemEntity = parsePrismaLineItemToLineItemEntity(lineItem);
    const accountEntity = parsePrismaAccountToAccountEntity(lineItem.account);
    const newLineItem = Object.assign(lineItemEntity, { account: accountEntity });
    return newLineItem;
  },

  /**
   * Info: (20241112 - Murky)
   * @description init lineItem entities from lineItems, entity contain account entity
   */
  initLineItemEntities: (voucher: IGetOneVoucherResponse) => {
    const lineItemsDto = voucher.lineItems;
    const lineItemEntities = lineItemsDto.map(voucherAPIGetOneUtils.initLineItemEntity);
    return lineItemEntities;
  },

  /**
   * Info: (20241112 - Murky)
   * @description determine is lineItem is same direction (debit or credit) as account, for calculate payable and receivable
   */
  isLineItemMatchesAccountDirection: (
    lineItem: ILineItemEntity,
    option: {
      isSameDebitAsAccount: boolean;
      accountSet: Set<string>;
    }
  ) => {
    const { isSameDebitAsAccount, accountSet } = option;
    if (!lineItem.account) return false;

    if (!accountSet.has(lineItem.account.code)) return false;

    if (isSameDebitAsAccount) {
      return lineItem.debit === lineItem.account.debit;
    } else {
      return lineItem.debit !== lineItem.account.debit;
    }
  },

  /**
   * Info: (20241112 - Murky)
   * @description init certificate entity from certificate with invoice, file and userCertificate
   * @note 這邊invoice 是一對一的關係, 所以直接取第一個
   */
  initCertificate: (
    certificate: PrismaCertificate & {
      invoices: PrismaInvoice[];
      file: PrismaFile;
      UserCertificate: PrismaUserCertificate[];
    }
  ) => {
    const invoiceDto = certificate.invoices[0];
    const fileDto = certificate.file;
    const userCertificatesDto = certificate.UserCertificate;

    const invoice = parsePrismaInvoiceToInvoiceEntity(invoiceDto);
    const file = parsePrismaFileToFileEntity(fileDto);
    const userCertificates = userCertificatesDto.map(
      parsePrismaUserCertificateToUserCertificateEntity
    );
    const certificateEntity = parsePrismaCertificateToCertificateEntity(certificate);

    const newCertificate = Object.assign(certificateEntity, {
      invoice,
      file,
      userCertificates,
    });
    return newCertificate;
  },

  /**
   * Info: (20241112 - Murky)
   * @description init certificate entities from voucherCertificates
   */
  initCertificateEntities: (voucher: IGetOneVoucherResponse) => {
    const certificateEntities = voucher.voucherCertificates.map((voucherCertificate) => {
      return voucherAPIGetOneUtils.initCertificate(voucherCertificate.certificate);
    });
    return certificateEntities;
  },

  /**
   * Info: (20241112 - Murky)
   * @description init voucher entity from voucher
   */
  initVoucherEntity: (voucher: IGetOneVoucherResponse) => {
    const voucherEntity = parsePrismaVoucherToVoucherEntity(voucher);
    return voucherEntity;
  },

  /**
   * Info: (20241112 - Murky)
   * @todo
   * - 先從AccountCode加總 payable or Receivable
   * - 再從AssociateVoucher的lineItem扣掉已經發生的
   * - 如果total是0直接回傳undefined
   */
  // getPayableReceivableInfo: (
  //   // eslint-disable-next-line @typescript-eslint/no-unused-vars
  //   voucher: IGetOneVoucherResponse,
  //   // eslint-disable-next-line @typescript-eslint/no-unused-vars
  //   options: {
  //     payableOrReceivable: 'payable' | 'receivable';
  //   }
  // ): {
  //   total: number;
  //   alreadyHappened: number;
  //   remain: number;
  // } | undefined => {
  //   return undefined;
  // },

  setLineItemIntoMap: (lineItems: ILineItemEntity, map: Map<string, ILineItemEntity>) => {
    if (!lineItems.account) return;

    if (map.has(lineItems.account.code)) {
      const originalLineItem = map.get(lineItems.account.code);
      if (originalLineItem) {
        originalLineItem.amount += lineItems.amount;
      }
    } else {
      map.set(lineItems.account.code, lineItems);
    }
  },

  /**
   * Info: (20241105 - Murky)
   * @todo 把這個函數拆開
   */
  getPayableReceivableInfo: (event: IEventEntity) => {
    const apSet = new Set(AccountCodesOfAP);
    const arSet = new Set(AccountCodesOfAR);
    const originalARLineItem: Map<string, ILineItemEntity> = new Map();
    const originalAPLineItem: Map<string, ILineItemEntity> = new Map();

    const revertARLineItem: Map<string, ILineItemEntity> = new Map();
    const revertAPLineItem: Map<string, ILineItemEntity> = new Map();

    event.associateVouchers.forEach((associateVoucher) => {
      // Info: (20241105 - Murky) 把和Account 同向的 lineItem 且是可以反轉的 lineItem 存起來
      associateVoucher.originalVoucher.lineItems.forEach((lineItem) => {
        if (
          voucherAPIGetOneUtils.isLineItemMatchesAccountDirection(lineItem, {
            isSameDebitAsAccount: true,
            accountSet: arSet,
          })
        ) {
          voucherAPIGetOneUtils.setLineItemIntoMap(lineItem, originalARLineItem);
        } else if (
          voucherAPIGetOneUtils.isLineItemMatchesAccountDirection(lineItem, {
            isSameDebitAsAccount: true,
            accountSet: apSet,
          })
        ) {
          voucherAPIGetOneUtils.setLineItemIntoMap(lineItem, originalAPLineItem);
        }
      });

      associateVoucher.resultVoucher.lineItems.forEach((lineItem) => {
        if (
          voucherAPIGetOneUtils.isLineItemMatchesAccountDirection(lineItem, {
            isSameDebitAsAccount: false,
            accountSet: arSet,
          })
        ) {
          voucherAPIGetOneUtils.setLineItemIntoMap(lineItem, revertARLineItem);
        } else if (
          voucherAPIGetOneUtils.isLineItemMatchesAccountDirection(lineItem, {
            isSameDebitAsAccount: false,
            accountSet: apSet,
          })
        ) {
          voucherAPIGetOneUtils.setLineItemIntoMap(lineItem, revertAPLineItem);
        }
      });
    });

    const payableInfo = {
      total: 0,
      alreadyHappened: 0,
      remain: 0,
    };

    // ToDo: (20241105 - Murky) 需要refactor
    Array.from(originalAPLineItem.keys()).forEach((key) => {
      const lineItem = originalAPLineItem.get(key);
      if (lineItem) {
        payableInfo.total += lineItem.amount;
        payableInfo.remain += lineItem.amount;
      }
    });

    Array.from(revertAPLineItem.keys()).forEach((key) => {
      const lineItem = revertAPLineItem.get(key);
      if (lineItem) {
        if (originalAPLineItem.has(key)) {
          payableInfo.alreadyHappened += lineItem.amount;
          payableInfo.remain -= lineItem.amount;
        }
      }
    });

    const receivingInfo = {
      total: 0,
      alreadyHappened: 0,
      remain: 0,
    };

    Array.from(originalARLineItem.keys()).forEach((key) => {
      const lineItem = originalARLineItem.get(key);
      if (lineItem) {
        receivingInfo.total += lineItem.amount;
        receivingInfo.remain += lineItem.amount;
      }
    });

    Array.from(revertARLineItem.keys()).forEach((key) => {
      const lineItem = revertARLineItem.get(key);
      if (lineItem) {
        if (originalARLineItem.has(key)) {
          receivingInfo.alreadyHappened += lineItem.amount;
          receivingInfo.remain -= lineItem.amount;
        }
      }
    });

    return {
      payableInfo,
      receivingInfo,
    };
  },

  getPayableReceivableInfoFromVoucher: (events: IEventEntity[]) => {
    const payableInfo = {
      total: 0,
      alreadyHappened: 0,
      remain: 0,
    };

    const receivingInfo = {
      total: 0,
      alreadyHappened: 0,
      remain: 0,
    };

    events.forEach((event) => {
      const { payableInfo: newPayableInfo, receivingInfo: newReceivingInfo } =
        voucherAPIGetOneUtils.getPayableReceivableInfo(event);
      payableInfo.total += newPayableInfo.total;
      payableInfo.alreadyHappened += newPayableInfo.alreadyHappened;
      payableInfo.remain += newPayableInfo.remain;

      receivingInfo.total += newReceivingInfo.total;
      receivingInfo.alreadyHappened += newReceivingInfo.alreadyHappened;
      receivingInfo.remain += newReceivingInfo.remain;
    });

    return {
      payableInfo: payableInfo.total === 0 ? undefined : payableInfo,
      receivingInfo: receivingInfo.total === 0 ? undefined : receivingInfo,
    };
  },
};

export const voucherAPIPutUtils = {
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
   * @description 創造用來比對兩個 lineItem 是否相同的 key, 只比較
   * - amount
   * - debit
   * - accountId
   * - 不比較 id, description, voucherId, createdAt, updatedAt, deletedAt
   */
  createLineItemComparisonKey: (lineItem: ILineItemEntity) => {
    const key = `${lineItem.accountId}-${lineItem.debit}-${lineItem.amount}`;
    return key;
  },

  isLineItemEntitiesSame: (
    lineItems1: ILineItemEntity[],
    lineItems2: ILineItemEntity[]
  ): boolean => {
    if (lineItems1.length !== lineItems2.length) return false;

    const lineItemKeyMap1 = lineItems1.map(voucherAPIPutUtils.createLineItemComparisonKey).sort();
    const lineItemKeyMap2 = lineItems2.map(voucherAPIPutUtils.createLineItemComparisonKey).sort();

    const isSame = lineItemKeyMap1.every((key, index) => key === lineItemKeyMap2[index]);
    return isSame;
  },

  initAccountEntity: (account: PrismaAccount) => {
    const accountEntity = parsePrismaAccountToAccountEntity(account);
    return accountEntity;
  },

  /**
   * Info: (20241112 - Murky)
   * @description init lineItem entity from lineItem
   */
  initLineItemEntity: (lineItem: PrismaLineItem) => {
    const lineItemEntity = parsePrismaLineItemToLineItemEntity(lineItem);
    return lineItemEntity;
  },

  initLineItemWithAccountEntity: (
    lineItem: PrismaLineItem & {
      account: PrismaAccount;
    }
  ) => {
    const lineItemEntity = voucherAPIPutUtils.initLineItemEntity(lineItem);
    const accountEntity = voucherAPIPutUtils.initAccountEntity(lineItem.account);
    const newLineItem = Object.assign(lineItemEntity, { account: accountEntity });
    return newLineItem;
  },

  /**
   * Info: (20241114 - Murky)
   * @description 取得兩組id中應該被刪除與應該被新增的id
   * @param originalIds - number[], 原本的id
   * @param newIds - number[], 新的id
   * @returns { idNeedToBeRemoved: number[], idNeedToBeAdded: number[] }
   * - idNeedToBeRemoved - number[], 原本有的id, 但新的id沒有, 要被刪掉
   * - idNeedToBeAdded - number[], 新的id有, 但原本的id沒有, 要被新增
   */
  getDifferentIds: (originalIds: number[], newIds: number[]) => {
    const originalSet = new Set(originalIds);
    const newSet = new Set(newIds);

    const idNeedToBeRemoved: number[] = [];
    const idNeedToBeAdded: number[] = [];

    originalSet.forEach((id) => {
      if (!newSet.has(id)) {
        idNeedToBeRemoved.push(id);
      }
    });

    newSet.forEach((id) => {
      if (!originalSet.has(id)) {
        idNeedToBeAdded.push(id);
      }
    });

    return {
      idNeedToBeRemoved,
      idNeedToBeAdded,
    };
  },

  getDifferentAssetId: (options: { originalAssetIds: number[]; newAssetIds: number[] }) => {
    const { idNeedToBeRemoved, idNeedToBeAdded } = voucherAPIPutUtils.getDifferentIds(
      options.originalAssetIds,
      options.newAssetIds
    );
    return {
      assetIdsNeedToBeRemoved: idNeedToBeRemoved,
      assetIdsNeedToBeAdded: idNeedToBeAdded,
    };
  },

  getDifferentCertificateId: (options: {
    originalCertificateIds: number[];
    newCertificateIds: number[];
  }) => {
    const { idNeedToBeRemoved, idNeedToBeAdded } = voucherAPIPutUtils.getDifferentIds(
      options.originalCertificateIds,
      options.newCertificateIds
    );
    return {
      certificateIdsNeedToBeRemoved: idNeedToBeRemoved,
      certificateIdsNeedToBeAdded: idNeedToBeAdded,
    };
  },

  constructNewLineItemReverseRelationship: (
    newLineItems: ILineItemEntity[],
    reverseVouchers: {
      amount: number;
      voucherId: number;
      lineItemIdBeReversed: number;
      lineItemIdReverseOther: number;
    }[]
  ) => {
    /**
     * Info: (20241114 - Murky)
     * @description 從database拿出來, 要被反轉的是 lineItemIdBeReversed (只需要id), 反轉的是 lineItemIdReverseOther
     */
    const reversePairs: {
      lineItemIdBeReversed: number;
      lineItemReverseOther: ILineItemEntity;
      amount: number;
      voucherId: number;
    }[] = [];

    reverseVouchers.forEach((reverseVoucher) => {
      const lineItemReverseOther = newLineItems[reverseVoucher.lineItemIdReverseOther];
      reversePairs.push({
        lineItemIdBeReversed: reverseVoucher.lineItemIdBeReversed,
        lineItemReverseOther,
        amount: reverseVoucher.amount,
        voucherId: reverseVoucher.voucherId,
      });
    });

    return reversePairs;
  },

  constructOldLineItemReverseRelationship: (voucherFromPrisma: IGetOneVoucherResponse) => {
    const reversePairs: {
      eventId: number;
      lineItemIdBeReversed: number;
      lineItemReverseOther: ILineItemEntity;
      amount: number;
      voucherId: number;
    }[] = [];

    voucherFromPrisma.lineItems.forEach((lineItem) => {
      const lineItemReverseOther = voucherAPIPutUtils.initLineItemEntity(lineItem);
      lineItem.originalLineItem.forEach((originLineItem) => {
        const lineItemIdBeReversed = originLineItem.resultLineItemId;
        const { eventId } = originLineItem.accociateVoucher;
        reversePairs.push({
          eventId,
          lineItemIdBeReversed,
          lineItemReverseOther,
          amount: originLineItem.amount,
          voucherId: originLineItem.resultLineItem.voucherId,
        });
      });
    });
    return reversePairs;
  },

  createReverseLineItemKey: (lineItemRelationPair: {
    lineItemIdBeReversed: number;
    lineItemReverseOther: ILineItemEntity;
    amount: number;
    voucherId: number;
  }) => {
    const { lineItemIdBeReversed, lineItemReverseOther, amount, voucherId } = lineItemRelationPair;
    const key = `${lineItemIdBeReversed}-${lineItemReverseOther.accountId}-${lineItemReverseOther.debit}-${lineItemReverseOther.amount}-${amount}-${voucherId}`;
    return key;
  },

  getNewReverseLineItemMap: (
    reversePairs: {
      lineItemIdBeReversed: number;
      lineItemReverseOther: ILineItemEntity;
      amount: number;
      voucherId: number;
    }[]
  ) => {
    const reverseLineItemMap: Map<
      string,
      {
        lineItemIdBeReversed: number;
        lineItemReverseOther: ILineItemEntity;
        amount: number;
        voucherId: number;
      }
    > = new Map();

    reversePairs.forEach((pair) => {
      const key = voucherAPIPutUtils.createReverseLineItemKey(pair);
      reverseLineItemMap.set(key, pair);
    });

    return reverseLineItemMap;
  },

  getOldReverseLineItemMap: (
    reversePairs: {
      eventId: number;
      lineItemIdBeReversed: number;
      lineItemReverseOther: ILineItemEntity;
      amount: number;
      voucherId: number;
    }[]
  ) => {
    const reverseLineItemMap: Map<
      string,
      {
        eventId: number;
        lineItemIdBeReversed: number;
        lineItemReverseOther: ILineItemEntity;
        amount: number;
        voucherId: number;
      }
    > = new Map();

    reversePairs.forEach((pair) => {
      const key = voucherAPIPutUtils.createReverseLineItemKey(pair);
      reverseLineItemMap.set(key, pair);
    });

    return reverseLineItemMap;
  },

  /**
   * Info: (20241114 - Murky)
   * @description 這邊只做1對1的
   */
  getDifferentReverseRelationship: (
    originalReversePairs: {
      eventId: number;
      lineItemIdBeReversed: number;
      lineItemReverseOther: ILineItemEntity;
      amount: number;
      voucherId: number;
    }[],
    newReversePairs: {
      lineItemIdBeReversed: number;
      lineItemReverseOther: ILineItemEntity;
      amount: number;
      voucherId: number;
    }[]
  ) => {
    const originalReverseMap = voucherAPIPutUtils.getOldReverseLineItemMap(originalReversePairs);
    const newReverseMap = voucherAPIPutUtils.getNewReverseLineItemMap(newReversePairs);

    const reverseRelationNeedToBeRemovedMap: Map<
      string,
      {
        eventId: number;
        lineItemIdBeReversed: number;
        lineItemReverseOther: ILineItemEntity;
        amount: number;
        voucherId: number;
      }
    > = new Map();

    const reverseRelationNeedToBeAddedMap: Map<
      string,
      {
        lineItemIdBeReversed: number;
        lineItemReverseOther: ILineItemEntity;
        amount: number;
        voucherId: number;
      }
    > = new Map();

    originalReverseMap.forEach((pair, key) => {
      if (!newReverseMap.has(key)) {
        const newKey = voucherAPIPutUtils.createLineItemComparisonKey(pair.lineItemReverseOther);
        reverseRelationNeedToBeRemovedMap.set(newKey, pair);
      }
    });

    newReverseMap.forEach((pair, key) => {
      if (!originalReverseMap.has(key)) {
        const newKey = voucherAPIPutUtils.createLineItemComparisonKey(pair.lineItemReverseOther);
        reverseRelationNeedToBeAddedMap.set(newKey, pair);
      }
    });

    const reverseRelationNeedToBeReplace: {
      eventId: number;
      original: {
        eventId: number;
        lineItemIdBeReversed: number;
        lineItemReverseOther: ILineItemEntity;
        amount: number;
        voucherId: number;
      };
      new: {
        lineItemIdBeReversed: number;
        lineItemReverseOther: ILineItemEntity;
        amount: number;
        voucherId: number;
      };
    }[] = [];

    reverseRelationNeedToBeRemovedMap.forEach((originalPair, key) => {
      if (reverseRelationNeedToBeAddedMap.has(key)) {
        const newPair = reverseRelationNeedToBeAddedMap.get(key);
        if (newPair) {
          reverseRelationNeedToBeReplace.push({
            eventId: originalPair.eventId,
            original: originalPair,
            new: newPair,
          });
        }
      }
    });
    return reverseRelationNeedToBeReplace;
  },
};
