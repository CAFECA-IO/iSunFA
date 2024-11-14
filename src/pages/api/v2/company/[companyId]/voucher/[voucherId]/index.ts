import { NextApiRequest, NextApiResponse } from 'next';

import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import loggerBack, { loggerError } from '@/lib/utils/logger_back';
import { formatApiResponse } from '@/lib/utils/common';
import { APIName } from '@/constants/api_connection';
import { ICounterPartyEntity } from '@/interfaces/counterparty';
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
} from '@/pages/api/v2/company/[companyId]/voucher/[voucherId]/route_utils';
import { voucherAPIPostUtils as postUtils } from '@/pages/api/v2/company/[companyId]/voucher/route_utils';
import { withRequestValidation } from '@/lib/utils/middleware';
import { IHandleRequest } from '@/interfaces/handleRequest';
import type { AccountingSetting as PrismaAccountingSetting } from '@prisma/client';
import { IUserEntity } from '@/interfaces/user';
import { IUserCertificateEntity } from '@/interfaces/user_certificate';
import { putVoucherWithoutCreateNew } from '@/lib/utils/repo/voucher.repo';

type GetOneVoucherResponse = IVoucherEntity & {
  issuer: IUserEntity;
  accountSetting: PrismaAccountingSetting; // ToDo: (20241105 - Murky)  換成entity
  counterParty: ICounterPartyEntity;
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
   */
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: GetOneVoucherResponse | null = null;

  const { userId } = session;
  const accountSettingCompanyId = 1001;
  try {
    const { voucherId } = query;
    const voucherFromPrisma: IGetOneVoucherResponse =
      await getUtils.getVoucherFromPrisma(voucherId);

    const voucher: IVoucherEntity = getUtils.initVoucherEntity(voucherFromPrisma);
    const lineItems: (ILineItemEntity & { account: IAccountEntity })[] =
      getUtils.initLineItemEntities(voucherFromPrisma);
    const accountSetting: PrismaAccountingSetting =
      await getUtils.getAccountingSettingFromPrisma(accountSettingCompanyId);
    const issuer: IUserEntity = getUtils.initIssuerEntity(voucherFromPrisma);
    const counterParty: ICounterPartyEntity = getUtils.initCounterPartyEntity(voucherFromPrisma);
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
    statusMessage = STATUS_MESSAGE.SUCCESS_GET;
  } catch (_error) {
    const error = _error as Error;
    loggerError(userId, 'Voucher Get One handleGetRequest', error.message).error(error);
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
  const { userId } = session;

  const { voucherId } = query;
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
    const voucherFromPrisma: IGetOneVoucherResponse =
      await getUtils.getVoucherFromPrisma(voucherId);

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
    const isNewVoucherNeeded = putUtils.isLineItemEntitiesSame(
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
      reverseVouchersInfo
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
    payload = updatedVoucher.id;
  } catch (_error) {
    const error = _error as Error;
    loggerError(userId, 'Voucher Put handlePutRequest', error.message).error(error);
  }

  return {
    statusMessage,
    payload,
    userId,
  };
};

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
  const { userId } = session;
  const mockDeleteVoucherId = 1002;

  // ToDo: (20240927 - Murky) Remember to add auth check
  if (query) {
    statusMessage = STATUS_MESSAGE.SUCCESS_DELETE;
    payload = mockDeleteVoucherId;
  }

  return {
    statusMessage,
    payload,
    userId,
  };
};

type APIResponse = IVoucherDetailForFrontend | object | number | null;

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{
    statusMessage: string;
    payload: APIResponse;
  }>;
} = {
  GET: (req, res) =>
    withRequestValidation(APIName.VOUCHER_GET_BY_ID_V2, req, res, handleGetRequest),
  PUT: (req, res) => withRequestValidation(APIName.VOUCHER_PUT_V2, req, res, handlePutRequest),
  DELETE: (req, res) =>
    withRequestValidation(APIName.VOUCHER_DELETE_V2, req, res, handleDeleteRequest),
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
    const logger = loggerError(userId, error.name, error.message);
    logger.error(error);
    statusMessage = error.message;
  }
  const { httpCode, result } = formatApiResponse<APIResponse>(statusMessage, payload);
  res.status(httpCode).json(result);
}
