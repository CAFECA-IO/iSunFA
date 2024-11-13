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
