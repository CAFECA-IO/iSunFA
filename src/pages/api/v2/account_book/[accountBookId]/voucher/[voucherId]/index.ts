import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/utils/session';
import {
  checkSessionUser,
  checkRequestData,
  checkUserAuthorization,
  logUserAction,
} from '@/lib/utils/middleware';
import { STATUS_CODE, STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse, getTimestampNow } from '@/lib/utils/common';
import { APIName, HttpMethod } from '@/constants/api_connection';
import { HTTP_STATUS } from '@/constants/http';
import {
  voucherAPIGetOneUtils as getUtils,
  voucherAPIPutUtils as putUtils,
  voucherAPIDeleteUtils as deleteUtils,
} from '@/pages/api/v2/account_book/[accountBookId]/voucher/[voucherId]/route_utils';
import { voucherAPIPostUtils as postUtils } from '@/pages/api/v2/account_book/[accountBookId]/voucher/route_utils';
import { parsePrismaVoucherToVoucherEntity } from '@/lib/utils/formatter/voucher.formatter';
import {
  deleteVoucherByCreateReverseVoucher,
  postVoucherV2,
  putVoucherWithoutCreateNew,
} from '@/lib/utils/repo/voucher.repo';
import { assertUserCanByAccountBook } from '@/lib/utils/permission/assert_user_team_permission';
import { TeamPermissionAction } from '@/interfaces/permissions';
import { validateOutputData } from '@/lib/utils/validator';
import loggerBack from '@/lib/utils/logger_back';
import { IGetOneVoucherResponse, IVoucherEntity } from '@/interfaces/voucher';
import { IUserEntity } from '@/interfaces/user';
import { ICounterPartyEntityPartial } from '@/interfaces/counterparty';
import { IEventEntity } from '@/interfaces/event';
import { IAssetEntity } from '@/interfaces/asset';
import type { AccountingSetting as PrismaAccountingSetting } from '@prisma/client';
import { ICertificateEntity } from '@/interfaces/certificate';
import { IInvoiceEntity } from '@/interfaces/invoice';
import { IFileEntity } from '@/interfaces/file';
import { ILineItemEntity } from '@/interfaces/line_item';
import { IAccountEntity } from '@/interfaces/accounting_account';
import { InvoiceRC2WithFullRelations } from '@/lib/utils/repo/invoice_rc2.repo';

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
  })[];
  invoiceRC2List: InvoiceRC2WithFullRelations[];
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

const handleGetRequest = async (req: NextApiRequest) => {
  const apiName = APIName.VOUCHER_GET_BY_ID_V2;
  const session = await getSession(req);
  await checkSessionUser(session, apiName, req);
  await checkUserAuthorization(apiName, req, session);

  const { query } = checkRequestData(apiName, req, session);
  if (!query) throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);

  const { userId } = session;
  const { accountBookId } = query;

  const { can } = await assertUserCanByAccountBook({
    userId,
    accountBookId,
    action: TeamPermissionAction.VIEW_VOUCHER,
  });

  if (!can) {
    const error = new Error(STATUS_MESSAGE.PERMISSION_DENIED);
    error.name = STATUS_CODE.PERMISSION_DENIED;
    throw error;
  }

  const { voucherId, isVoucherNo } = query;

  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload = null;

  try {
    const voucherFromPrisma: IGetOneVoucherResponse = await getUtils.getVoucherFromPrisma(
      voucherId,
      {
        isVoucherNo,
        companyId: accountBookId,
      }
    );

    const voucher: IVoucherEntity = getUtils.initVoucherEntity(voucherFromPrisma);
    const lineItems = getUtils.initLineItemEntities(voucherFromPrisma);
    const accountSetting: PrismaAccountingSetting =
      await getUtils.getAccountingSettingFromPrisma(accountBookId);
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
      invoiceRC2List: voucherFromPrisma.InvoiceRC2,
      lineItems,
      payableInfo,
      receivingInfo,
    };

    loggerBack.info(`handleGetRequest voucherFromPrisma: ${JSON.stringify(voucherFromPrisma)}`);
    const { isOutputDataValid, outputData } = validateOutputData(
      APIName.VOUCHER_GET_BY_ID_V2,
      mockVoucher
    );
    loggerBack.info(`handleGetRequest outputData: ${JSON.stringify(outputData)}`);

    if (!isOutputDataValid) {
      statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
    } else {
      payload = outputData;
    }

    statusMessage = STATUS_MESSAGE.SUCCESS_GET;
  } catch (error) {
    statusMessage = (error as Error).message;
  }

  const response = formatApiResponse(statusMessage, payload);
  return { response, statusMessage };
};

/**  Info: (Tzuhan - 20250612)
 * 若 lineItem 有變更，則整張傳票視為需重建，
 * 執行：1. 建立 delete version 傳票並與 event 綁定
 *       2. 建立新傳票並儲存新內容
 * 若 lineItem 無變，才執行 partial update：
 * 包含 certificate/invoiceRC2/asset/reverseVoucher 等維度的關聯性變更
 */
const handlePutRequest = async (req: NextApiRequest) => {
  const apiName = APIName.VOUCHER_PUT_V2;
  const session = await getSession(req);
  await checkSessionUser(session, apiName, req);
  await checkUserAuthorization(apiName, req, session);

  const { query, body } = checkRequestData(apiName, req, session);
  if (!query || !body) throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);

  const { accountBookId, voucherId, isVoucherNo } = query;
  const { userId } = session;

  const { can } = await assertUserCanByAccountBook({
    userId,
    accountBookId,
    action: TeamPermissionAction.MODIFY_VOUCHER,
  });

  if (!can) {
    const error = new Error(STATUS_MESSAGE.PERMISSION_DENIED);
    error.name = STATUS_CODE.PERMISSION_DENIED;
    throw error;
  }

  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload = null;

  try {
    const origin = await getUtils.getVoucherFromPrisma(voucherId, {
      isVoucherNo,
      companyId: accountBookId,
    });
    const originLineItems = getUtils.initLineItemEntities(origin);
    const certificates = getUtils.initCertificateEntities(origin);
    const asset = getUtils.initAssetEntities(origin);

    const {
      certificateIds,
      invoiceRC2Ids,
      lineItems,
      assetIds,
      reverseVouchers,
      counterPartyId,
      ...voucherInfo
    } = body;

    if (!postUtils.isArrayHasItems(lineItems)) {
      const error = new Error(STATUS_MESSAGE.MISSING_LINE_ITEMS);
      error.name = STATUS_CODE.MISSING_LINE_ITEMS;
      throw error;
    }
    if (!postUtils.isItemExist(voucherInfo)) {
      const error = new Error(STATUS_MESSAGE.MISSING_VOUCHER_INFO);
      error.name = STATUS_CODE.MISSING_VOUCHER_INFO;
      throw error;
    }
    if (!postUtils.isLineItemsBalanced(lineItems)) {
      throw new Error(STATUS_MESSAGE.UNBALANCED_DEBIT_CREDIT);
    }

    if (counterPartyId && !postUtils.isCounterPartyExistById(counterPartyId)) {
      const error = new Error(STATUS_MESSAGE.COUNTERPARTY_NOT_EXIST);
      error.name = STATUS_CODE.COUNTERPARTY_NOT_EXIST;
      throw error;
    }

    if (
      postUtils.isArrayHasItems(certificateIds) &&
      !postUtils.areAllCertificatesExistById(certificateIds)
    ) {
      const error = new Error(STATUS_MESSAGE.CERTIFICATE_IDS_NOT_EXIST);
      error.name = STATUS_CODE.CERTIFICATE_IDS_NOT_EXIST;
      throw error;
    }

    const issuer = await postUtils.initIssuerFromPrisma(userId);
    const newLineItems = postUtils.initLineItemEntities(lineItems);

    const hasLineItemChanged = !putUtils.isLineItemEntitiesSame(originLineItems, newLineItems);

    // Info: (Tzuhan - 20250612) 若 lineItem 有改變，觸發反轉與新增流程
    if (hasLineItemChanged) {
      const nowInSecond = getTimestampNow();
      const { deleteVoucher, deleteEvent, newVoucher } = putUtils.createReversedAndNewVoucherEntity(
        {
          nowInSecond,
          voucherFromPrisma: origin,
          newLineItems,
        }
      );

      const company = await postUtils.initCompanyFromPrisma(accountBookId);
      const originLineItemsWithEntity = deleteUtils.initOriginalLineItemEntities(origin);

      const deleteVersionReverseLineItemPairs =
        deleteUtils.getDeleteVersionReverseLineItemPairs(originLineItemsWithEntity);

      await deleteVoucherByCreateReverseVoucher({
        nowInSecond,
        companyId: accountBookId,
        issuerId: issuer.id,
        voucherDeleteOtherEntity: deleteVoucher,
        deleteVersionOriginVoucher: parsePrismaVoucherToVoucherEntity(origin),
        deleteEvent,
        deleteVersionReverseLineItemPairs,
      });

      const savedNewVoucher = await postVoucherV2({
        nowInSecond,
        company,
        originalVoucher: newVoucher,
        issuer,
        eventControlPanel: {
          revertEvent: deleteEvent,
          recurringEvent: null,
          assetEvent: null,
        },
        certificateIds,
        invoiceRC2Ids,
      });

      // Info: (Tzuhan - 20250612) 提前 return，不再做後續 update（因為新的已建立）
      payload = savedNewVoucher.id;
      statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
      const response = formatApiResponse(statusMessage, payload);
      return { response, statusMessage };
    }

    const { assetIdsNeedToBeRemoved, assetIdsNeedToBeAdded } = putUtils.getDifferentAssetId({
      originalAssetIds: asset.map((a) => a.id),
      newAssetIds: assetIds,
    });

    const newReverseRelations = putUtils.constructNewLineItemReverseRelationship(
      newLineItems,
      reverseVouchers,
      originLineItems
    );
    const oldReverseRelations = putUtils.constructOldLineItemReverseRelationship(origin);

    const reverseRelationNeedToBeReplace = putUtils.getDifferentReverseRelationship(
      oldReverseRelations,
      newReverseRelations
    );

    const { certificateIdsNeedToBeRemoved, certificateIdsNeedToBeAdded } =
      putUtils.getDifferentCertificateId({
        originalCertificateIds: certificates.map((c) => c.id),
        newCertificateIds: certificateIds,
      });

    const {
      idNeedToBeRemoved: invoiceRC2IdsNeedToBeRemoved,
      idNeedToBeAdded: invoiceRC2IdsNeedToBeAdded,
    } = putUtils.getDifferentIds(
      origin.InvoiceRC2.map((i) => i.id),
      invoiceRC2Ids
    );

    const updated = await putVoucherWithoutCreateNew(voucherId, {
      issuerId: issuer.id,
      counterPartyId,
      voucherInfo,
      certificateOptions: {
        certificateIdsNeedToBeRemoved,
        certificateIdsNeedToBeAdded,
      },
      invoiceRC2Options: {
        invoiceRC2IdsNeedToBeRemoved,
        invoiceRC2IdsNeedToBeAdded,
      },
      assetOptions: {
        assetIdsNeedToBeRemoved,
        assetIdsNeedToBeAdded,
      },
      reverseRelationNeedToBeReplace,
    });

    payload = updated?.id || null;
    statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
  } catch (error) {
    statusMessage = (error as Error).message;
  }

  const response = formatApiResponse(statusMessage, payload);
  return { response, statusMessage };
};

const handleDeleteRequest = async (req: NextApiRequest) => {
  const apiName = APIName.VOUCHER_DELETE_V2;
  const session = await getSession(req);
  await checkSessionUser(session, apiName, req);
  await checkUserAuthorization(apiName, req, session);

  const { query } = checkRequestData(apiName, req, session);
  if (!query) throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);

  const { accountBookId, voucherId, isVoucherNo } = query;
  const { userId } = session;
  const { can } = await assertUserCanByAccountBook({
    userId,
    accountBookId,
    action: TeamPermissionAction.DELETE_VOUCHER,
  });

  if (!can) {
    const error = new Error(STATUS_MESSAGE.PERMISSION_DENIED);
    error.name = STATUS_CODE.PERMISSION_DENIED;
    throw error;
  }

  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload = null;

  try {
    const nowInSecond = getTimestampNow();
    const voucher = await getUtils.getVoucherFromPrisma(voucherId, {
      isVoucherNo,
      companyId: accountBookId,
    });
    const origin = parsePrismaVoucherToVoucherEntity(voucher);
    if (origin.deletedAt) {
      const error = new Error(STATUS_MESSAGE.VOUCHER_ALREADY_DELETED);
      error.name = STATUS_CODE.VOUCHER_ALREADY_DELETED;
      throw error;
    }

    const lineItems = deleteUtils.initOriginalLineItemEntities(voucher);
    const asset = getUtils.initAssetEntities(voucher);
    const certificates = getUtils.initCertificateEntities(voucher);
    // TODO: (20250213 - Shirley) 實作資產折舊後，需檢查「已經折舊的資產，對應的 voucher 無法被刪除」
    const reverseLineItemPairs = deleteUtils.getDeleteVersionReverseLineItemPairs(lineItems);
    const deleteEntity = deleteUtils.initDeleteVoucherEntity({
      nowInSecond,
      voucherBeenDeleted: origin,
      deleteVersionLineItems: reverseLineItemPairs.map((pair) => pair.newDeleteReverseLineItem),
    });

    deleteEntity.asset = asset;
    deleteEntity.certificates = certificates;

    const deleteEvent = deleteUtils.initDeleteEventEntity({
      nowInSecond,
      voucherBeenDeleted: deleteUtils.deepCopyVoucherEntity(origin),
      voucherDeleteOther: deleteEntity,
    });

    const result = await deleteVoucherByCreateReverseVoucher({
      nowInSecond,
      companyId: accountBookId,
      issuerId: userId,
      voucherDeleteOtherEntity: deleteEntity,
      deleteVersionOriginVoucher: origin,
      deleteEvent,
      deleteVersionReverseLineItemPairs: reverseLineItemPairs,
    });

    payload = result.voucherId;
    statusMessage = STATUS_MESSAGE.SUCCESS_DELETE;
  } catch (error) {
    statusMessage = (error as Error).message;
  }

  const response = formatApiResponse(statusMessage, payload);
  return { response, statusMessage };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = req.method || HttpMethod.GET;
  const session = await getSession(req);

  let httpCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let statusMessage: string = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  let result;
  let apiName: APIName = APIName.VOUCHER_GET_BY_ID_V2;

  try {
    let response;
    switch (method) {
      case HttpMethod.GET:
        apiName = APIName.VOUCHER_GET_BY_ID_V2;
        ({ response, statusMessage } = await handleGetRequest(req));
        break;
      case HttpMethod.PUT:
        apiName = APIName.VOUCHER_PUT_V2;
        ({ response, statusMessage } = await handlePutRequest(req));
        break;
      case HttpMethod.DELETE:
        apiName = APIName.VOUCHER_DELETE_V2;
        ({ response, statusMessage } = await handleDeleteRequest(req));
        break;
      default:
        statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
        response = formatApiResponse(statusMessage, null);
        break;
    }
    ({ httpCode, result } = response);
  } catch (error) {
    const err = error as Error;
    statusMessage = STATUS_MESSAGE[err.name as keyof typeof STATUS_MESSAGE] || err.message;
    ({ httpCode, result } = formatApiResponse<null>(statusMessage, null));
  }

  await logUserAction(session, apiName, req, statusMessage);
  res.status(httpCode).json(result);
}
