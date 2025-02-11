import { NextApiRequest, NextApiResponse } from 'next';

import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import loggerBack, { loggerError } from '@/lib/utils/logger_back';
import { formatApiResponse, getTimestampNow } from '@/lib/utils/common';
import { APIName } from '@/constants/api_connection';
import { ICounterPartyEntityPartial } from '@/interfaces/counterparty';
import { IEventEntity } from '@/interfaces/event';
import { ILineItemEntity } from '@/interfaces/line_item';
import { IAccountEntity } from '@/interfaces/accounting_account';
import {
  IGetOneVoucherResponse,
  IVoucherDetailForFrontend,
  IVoucherEntity,
} from '@/interfaces/voucher';
import { IAssetEntity } from '@/interfaces/asset';
import { IInvoiceEntity } from '@/interfaces/invoice';
import { IFileEntity } from '@/interfaces/file';
import { ICertificateEntity } from '@/interfaces/certificate';
import {
  voucherAPIGetOneUtils as getUtils,
  voucherAPIPutUtils as putUtils,
  voucherAPIDeleteUtils as deleteUtils,
} from '@/pages/api/v2/company/[companyId]/voucher/[voucherId]/route_utils';
import { voucherAPIPostUtils as postUtils } from '@/pages/api/v2/company/[companyId]/voucher/route_utils';
import { withRequestValidation } from '@/lib/utils/middleware';
import { IHandleRequest } from '@/interfaces/handleRequest';
import type { AccountingSetting as PrismaAccountingSetting } from '@prisma/client';
import { IUserEntity } from '@/interfaces/user';
import { IUserCertificateEntity } from '@/interfaces/user_certificate';
import {
  deleteVoucherByCreateReverseVoucher,
  putVoucherWithoutCreateNew,
} from '@/lib/utils/repo/voucher.repo';

type GetOneVoucherResponse = IVoucherEntity & {
  issuer: IUserEntity;
  accountSetting: PrismaAccountingSetting; // ToDo: (20241105 - Murky)  換成entity
  counterParty: ICounterPartyEntityPartial;
  originalEvents: IEventEntity[];
  resultEvents: IEventEntity[];
  asset: IAssetEntity[];
  certificates: (ICertificateEntity & {
    invoice: IInvoiceEntity;
    file: IFileEntity;
    userCertificates: IUserCertificateEntity[];
  })[];
  lineItems: (ILineItemEntity & { account: IAccountEntity })[];
  payableInfo?: {
    total: number;
    alreadyHappened: number;
    remain: number;
  };
  receivingInfo?: {
    total: number;
    alreadyHappened: number;
    remain: number;
  };
};

export const handleGetRequest: IHandleRequest<
  APIName.VOUCHER_GET_BY_ID_V2,
  GetOneVoucherResponse
> = async ({ query, session }) => {
  /**
   * Info: (20241112 - Murky)
   * @todo
   * - Get voucher with all needed in GetOneVoucherResponse
   * - Init every part of GetOneVoucherResponse
   * - Calculate payableInfo and receivingInfo
   * @note line items 裡面也要提供Reverse lineItem, 需要什麼資料要看 src/components/voucher/reverse_item.tsx
   * -  voucherNo, account, description, reverseAmount
   */
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: GetOneVoucherResponse | null = null;

  const { userId, companyId } = session;
  const accountSettingCompanyId = companyId;
  try {
    const { voucherId, isVoucherNo } = query;
    const voucherFromPrisma: IGetOneVoucherResponse = await getUtils.getVoucherFromPrisma(
      voucherId,
      {
        isVoucherNo,
        companyId,
      }
    );

    const voucher: IVoucherEntity = getUtils.initVoucherEntity(voucherFromPrisma);
    const lineItems = getUtils.initLineItemEntities(voucherFromPrisma);
    const accountSetting: PrismaAccountingSetting =
      await getUtils.getAccountingSettingFromPrisma(accountSettingCompanyId);
    const issuer: IUserEntity = getUtils.initIssuerEntity(voucherFromPrisma);
    const counterParty: ICounterPartyEntityPartial =
      getUtils.initCounterPartyEntity(voucherFromPrisma);
    const originalEvents: IEventEntity[] = getUtils.initOriginalEventEntities(voucherFromPrisma);
    const resultEvents: IEventEntity[] = getUtils.initResultEventEntities(voucherFromPrisma);
    const asset: IAssetEntity[] = getUtils.initAssetEntities(voucherFromPrisma);
    const certificates = getUtils.initCertificateEntities(voucherFromPrisma);

    // ToDo: (20241112 - Murky) 剩下下面這兩個
    const { payableInfo, receivingInfo } =
      getUtils.getPayableReceivableInfoFromVoucher(originalEvents);
    const mockVoucher: GetOneVoucherResponse = {
      ...voucher,
      issuer,
      accountSetting,
      counterParty,
      originalEvents,
      resultEvents,
      asset,
      certificates,
      lineItems,
      payableInfo,
      receivingInfo,
    };
    payload = mockVoucher;
    loggerBack.info(`Get voucher by id: ${JSON.stringify(mockVoucher)}`);
    statusMessage = STATUS_MESSAGE.SUCCESS_GET;
  } catch (_error) {
    const error = _error as Error;
    loggerError({
      userId,
      errorType: 'Voucher Get One handleGetRequest',
      errorMessage: error.message,
    });
  }

  return {
    statusMessage,
    payload,
    userId,
  };
};

export const handlePutRequest: IHandleRequest<APIName.VOUCHER_PUT_V2, number> = async ({
  query,
  body,
  session,
}) => {
  /**
   * Info: (20240927 - Murky)
   * Put is not actually put, but add an reverse voucher and link to current voucher
   * maybe non lineItem put can just put original voucher?? => flow chart is needed
   */
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: number | null = null;
  const { userId, companyId } = session;

  const { voucherId, isVoucherNo } = query;
  const {
    actions,
    certificateIds,
    lineItems,
    recurringInfo,
    assetIds,
    reverseVouchers: reverseVouchersInfo,
    counterPartyId,
    ...voucherInfo
  } = body;

  try {
    const voucherFromPrisma: IGetOneVoucherResponse = await getUtils.getVoucherFromPrisma(
      voucherId,
      {
        isVoucherNo,
        companyId,
      }
    );

    // Info: (20241113 - Murky) 變了不用新增reverse voucher，只要更新原本的voucher
    // const originVoucher: IVoucherEntity = getUtils.initVoucherEntity(voucherFromPrisma);
    // const originIssuer: IUserEntity = getUtils.initIssuerEntity(voucherFromPrisma);
    // const originCounterParty: ICounterPartyEntity = getUtils.initCounterPartyEntity(voucherFromPrisma);
    const certificates = getUtils.initCertificateEntities(voucherFromPrisma);

    const asset: IAssetEntity[] = getUtils.initAssetEntities(voucherFromPrisma);
    // Info: (20241113 - Murky)
    const originLineItems: (ILineItemEntity & { account: IAccountEntity })[] =
      getUtils.initLineItemEntities(voucherFromPrisma);

    // Info: (20241113 - Murky) 不知道怎麼處理
    // const resultEvents: IEventEntity[] = getUtils.initResultEventEntities(voucherFromPrisma);
    // const originalEvents: IEventEntity[] = getUtils.initOriginalEventEntities(voucherFromPrisma);

    // Info: (20241114 - Murky) 下面是新來的voucher

    const isCertificateIdsHasItems = postUtils.isArrayHasItems(certificateIds);
    const isLineItemsHasItems = postUtils.isArrayHasItems(lineItems);
    const isCounterPartyIdExist = postUtils.isItemExist(counterPartyId);
    const isAssetIdsHasItems = postUtils.isArrayHasItems(assetIds);
    // const isReverseVouchersInfoHasItems = postUtils.isArrayHasItems(reverseVouchersInfo);
    const isVoucherInfoExist = postUtils.isItemExist(voucherInfo);
    // const isVoucherEditable = true;

    // Info: (20241025 - Murky) Early throw error if lineItems is empty and voucherInfo is empty
    if (!isLineItemsHasItems) {
      putUtils.throwErrorAndLog(loggerBack, {
        errorMessage: 'lineItems is required when post voucher',
        statusMessage: STATUS_MESSAGE.BAD_REQUEST,
      });
    }

    // Info: (20241226 - Murky) Check if lineItems credit and debit are equal
    const isLineItemsBalanced = postUtils.isLineItemsBalanced(lineItems);
    if (!isLineItemsBalanced) {
      postUtils.throwErrorAndLog(loggerBack, {
        errorMessage: 'lineItems credit and debit should be equal',
        statusMessage: STATUS_MESSAGE.UNBALANCED_DEBIT_CREDIT,
      });
    }

    if (!isVoucherInfoExist) {
      putUtils.throwErrorAndLog(loggerBack, {
        errorMessage: 'voucherInfo is required when post voucher',
        statusMessage: STATUS_MESSAGE.BAD_REQUEST,
      });
    }

    if (isCounterPartyIdExist) {
      const isCounterPartyExist = postUtils.isCounterPartyExistById(counterPartyId);
      if (!isCounterPartyExist) {
        putUtils.throwErrorAndLog(loggerBack, {
          errorMessage: `when post voucher with counterPartyId, counterParty need to exist in database`,
          statusMessage: STATUS_MESSAGE.BAD_REQUEST,
        });
      }
    }

    // Info: (20241114 - Murky) 檢查是不是所有的asset都存在, 不存在就throw error
    if (isAssetIdsHasItems) {
      const isAllAssetExist = postUtils.areAllAssetsExistById(assetIds);

      if (!isAllAssetExist) {
        putUtils.throwErrorAndLog(loggerBack, {
          errorMessage: `when post voucher with assetIds, all asset need to exist in database`,
          statusMessage: STATUS_MESSAGE.BAD_REQUEST,
        });
      }
    }

    // Info: (20241025 - Murky) 檢查是不是所有的revertVoucher都存在, 不存在就throw error
    const revertVoucherIds = reverseVouchersInfo.map((reverseVoucher) => reverseVoucher.voucherId);
    const isAllRevertVoucherExist = postUtils.areAllVouchersExistById(revertVoucherIds);
    if (!isAllRevertVoucherExist) {
      putUtils.throwErrorAndLog(loggerBack, {
        errorMessage: `when post voucher with reverseVouchersInfo, all reverseVoucher need to exist in database`,
        statusMessage: STATUS_MESSAGE.BAD_REQUEST,
      });
    }

    // Info: (20241111 - Murky) 只要檢查被Reverse 的lineItems, Reverse 別人的lineItems還沒有被建立起來
    const revertLineItemIds = reverseVouchersInfo.map(
      (reverseVoucher) => reverseVoucher.lineItemIdBeReversed
    );
    const isAllRevertLineItemExist = postUtils.areAllLineItemsExistById(revertLineItemIds);
    if (!isAllRevertLineItemExist) {
      postUtils.throwErrorAndLog(loggerBack, {
        errorMessage: `when post voucher with reverseVouchersInfo, all reverseLineItem need to exist in database`,
        statusMessage: STATUS_MESSAGE.BAD_REQUEST,
      });
    }

    // Info: (20241114 - Murky) 檢查 certificateIds 是否都存在
    if (isCertificateIdsHasItems) {
      // Info: (20241111 - Murky) 檢查是不是所有的certificate都存在, 不存在就throw error
      const isAllCertificateExist = postUtils.areAllCertificatesExistById(certificateIds);
      if (!isAllCertificateExist) {
        postUtils.throwErrorAndLog(loggerBack, {
          errorMessage: `when post voucher with certificateIds, all certificate need to exist in database`,
          statusMessage: STATUS_MESSAGE.BAD_REQUEST,
        });
      }
    }

    // Info: (20241111 - Murky) Init Company and Issuer Entity, For Voucher Meta Data and check if they exist in database
    const issuer = await postUtils.initIssuerFromPrisma(userId);

    const newLineItemEntities: ILineItemEntity[] = postUtils.initLineItemEntities(lineItems);

    /**
     * Info: (20241113 - Murky)
     * @description 決定是不是要新增一張新的voucher, 只有在line items有動到amount, accountId, debit的時候才需要新增
     */
    const isNewVoucherNeeded = !putUtils.isLineItemEntitiesSame(
      originLineItems,
      newLineItemEntities
    );

    // Info: (20241113 - Murky) 如果同時修改藍色與非藍色區域
    // 要同時除存在原本的voucher與新增一張reverse voucher, 新增voucher有會有新的 非藍色區域
    if (isNewVoucherNeeded) {
      putUtils.throwErrorAndLog(loggerBack, {
        errorMessage: 'Please use post + delete to update lineItem',
        statusMessage: STATUS_MESSAGE.BAD_REQUEST,
      });
    }

    // ToDo: (20241114 - Murky) delete asset voucher associate if asset is different

    const { assetIdsNeedToBeRemoved, assetIdsNeedToBeAdded } = putUtils.getDifferentAssetId({
      originalAssetIds: asset.map((a) => a.id),
      newAssetIds: assetIds,
    });

    // ToDo: (20241114 - Murky) delete associate lineItem if revert lineItem is different

    const newLineItemReverseRelations = putUtils.constructNewLineItemReverseRelationship(
      newLineItemEntities,
      reverseVouchersInfo,
      originLineItems
    );

    const oldLineItemReverseRelations =
      putUtils.constructOldLineItemReverseRelationship(voucherFromPrisma);

    const reverseRelationNeedToBeReplace = putUtils.getDifferentReverseRelationship(
      oldLineItemReverseRelations,
      newLineItemReverseRelations
    );

    const { certificateIdsNeedToBeRemoved, certificateIdsNeedToBeAdded } =
      putUtils.getDifferentCertificateId({
        originalCertificateIds: certificates.map((c) => c.id),
        newCertificateIds: certificateIds,
      });

    const updatedVoucher = await putVoucherWithoutCreateNew(voucherId, {
      issuerId: issuer.id,
      counterPartyId,
      voucherInfo,
      certificateOptions: {
        certificateIdsNeedToBeRemoved,
        certificateIdsNeedToBeAdded,
      },
      assetOptions: {
        assetIdsNeedToBeRemoved,
        assetIdsNeedToBeAdded,
      },
      reverseRelationNeedToBeReplace,
    });

    statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
    payload = updatedVoucher?.id || null;
  } catch (_error) {
    const error = _error as Error;
    loggerError({
      userId,
      errorType: 'Voucher Put handlePutRequest',
      errorMessage: error.message,
    });
  }

  return {
    statusMessage,
    payload,
    userId,
  };
};

/**
 * Info: (20241118 - Murky)
 * @todo
 * - Copy 一模一樣的 lineItem然後反過來
 * - 前一筆的asset 也要加上去 assetVoucher
 * - revert事件除了delete 這張的關係， 這張reverse 以前的voucher也要多加上這層關係
 */
export const handleDeleteRequest: IHandleRequest<APIName.VOUCHER_DELETE_V2, number> = async ({
  query,
  session,
}) => {
  /**
   * Info: (20240927 - Murky)
   * Delete is not actually put, but add an reverse voucher and link to current voucher
   */
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: number | null = null;
  const { userId, companyId } = session;
  try {
    const nowInSecond = getTimestampNow();
    const { voucherId, isVoucherNo } = query;
    const voucherFromPrisma: IGetOneVoucherResponse = await getUtils.getVoucherFromPrisma(
      voucherId,
      {
        isVoucherNo,
        companyId,
      }
    );

    const originVoucher: IVoucherEntity = getUtils.initVoucherEntity(voucherFromPrisma);

    if (originVoucher.deletedAt) {
      deleteUtils.throwErrorAndLog(loggerBack, {
        errorMessage: 'Voucher already deleted',
        statusMessage: STATUS_MESSAGE.BAD_REQUEST,
      });
    }

    const originLineItems = deleteUtils.initOriginalLineItemEntities(voucherFromPrisma);

    // const issuer: IUserEntity = getUtils.initIssuerEntity(voucherFromPrisma);
    // const counterParty: ICounterPartyEntity = getUtils.initCounterPartyEntity(voucherFromPrisma);
    // const originalEvents: IEventEntity[] = getUtils.initOriginalEventEntities(voucherFromPrisma);
    // const resultEvents: IEventEntity[] = getUtils.initResultEventEntities(voucherFromPrisma);
    const asset: IAssetEntity[] = getUtils.initAssetEntities(voucherFromPrisma);
    const certificates = getUtils.initCertificateEntities(voucherFromPrisma);

    // Info: (20241119 - Murky) 需要多加reverse voucher嗎？
    // const isReverseEventNeeded = deleteUtils.isReverseEventNeeded(voucherFromPrisma);

    // Info: (20241119 - Murky) 需要多加asset voucher嗎？
    const isAssetVoucherNeeded = deleteUtils.isAssetEventNeeded(voucherFromPrisma);

    // ToDo: (20241118 - Murky) 先組合出要刪除的voucherEntity
    const deleteVersionReverseLineItemPairs =
      deleteUtils.getDeleteVersionReverseLineItemPairs(originLineItems);

    const voucherDeleteOtherEntity = deleteUtils.initDeleteVoucherEntity({
      nowInSecond,
      voucherBeenDeleted: originVoucher,
      deleteVersionLineItems: deleteVersionReverseLineItemPairs.map(
        (pair) => pair.newDeleteReverseLineItem
      ),
    });

    if (isAssetVoucherNeeded) {
      voucherDeleteOtherEntity.asset = asset;
    }

    if (certificates.length > 0) {
      voucherDeleteOtherEntity.certificates = certificates;
    }

    const deleteVersionOriginVoucher = deleteUtils.deepCopyVoucherEntity(originVoucher);

    // Info: (20241119 - Murky) 這邊lineIt{em不用塞在voucher裡面
    const deleteEvent: IEventEntity = deleteUtils.initDeleteEventEntity({
      nowInSecond,
      voucherBeenDeleted: deleteVersionOriginVoucher,
      voucherDeleteOther: voucherDeleteOtherEntity,
    });

    const { voucherId: newVoucherId } = await deleteVoucherByCreateReverseVoucher({
      nowInSecond,
      companyId,
      issuerId: userId,
      voucherDeleteOtherEntity,
      deleteVersionOriginVoucher,
      deleteEvent,
      deleteVersionReverseLineItemPairs,
    });
    payload = newVoucherId;
    statusMessage = STATUS_MESSAGE.SUCCESS_DELETE;
  } catch (_error) {
    const error = _error as Error;
    loggerError({
      userId,
      errorType: 'Voucher Delete handleDeleteRequest',
      errorMessage: error.message,
    });
  }
  return {
    statusMessage,
    payload,
  };
};

type APIResponse = IVoucherDetailForFrontend | number | null;

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{
    statusMessage: string;
    payload: APIResponse;
  }>;
} = {
  GET: (req) => withRequestValidation(APIName.VOUCHER_GET_BY_ID_V2, req, handleGetRequest),
  PUT: (req) => withRequestValidation(APIName.VOUCHER_PUT_V2, req, handlePutRequest),
  DELETE: (req) => withRequestValidation(APIName.VOUCHER_DELETE_V2, req, handleDeleteRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<APIResponse>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: APIResponse = null;
  const userId: number = -1;

  try {
    const handleRequest = methodHandlers[req.method || ''];
    if (handleRequest) {
      ({ statusMessage, payload } = await handleRequest(req, res));
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    const error = _error as Error;
    loggerError({
      userId,
      errorType: error.name,
      errorMessage: error.message,
    });
    statusMessage = error.message;
  }
  const { httpCode, result } = formatApiResponse<APIResponse>(statusMessage, payload);
  res.status(httpCode).json(result);
}
