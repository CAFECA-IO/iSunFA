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
} from '@/pages/api/v2/company/[companyId]/voucher/[voucherId]/route_utils';
import { voucherAPIPostUtils as postUtils } from '@/pages/api/v2/company/[companyId]/voucher/route_utils';
import { parsePrismaVoucherToVoucherEntity } from '@/lib/utils/formatter/voucher.formatter';
import {
  deleteVoucherByCreateReverseVoucher,
  putVoucherWithoutCreateNew,
} from '@/lib/utils/repo/voucher.repo';
import { assertUserCanByCompany } from '@/lib/utils/permission/assert_user_team_permission';
import { TeamPermissionAction } from '@/interfaces/permissions';
import { validateOutputData } from '@/lib/utils/validator';

const handleGetRequest = async (req: NextApiRequest) => {
  const apiName = APIName.VOUCHER_GET_BY_ID_V2;
  const session = await getSession(req);
  await checkSessionUser(session, apiName, req);
  await checkUserAuthorization(apiName, req, session);

  const { query } = checkRequestData(apiName, req, session);
  if (!query) throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);

  const { userId, companyId } = session;

  const { can } = await assertUserCanByCompany({
    userId,
    companyId,
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
    const voucherFromPrisma = await getUtils.getVoucherFromPrisma(voucherId, {
      isVoucherNo,
      companyId,
    });

    const voucher = parsePrismaVoucherToVoucherEntity(voucherFromPrisma);

    const { isOutputDataValid, outputData } = validateOutputData(
      APIName.VOUCHER_GET_BY_ID_V2,
      voucher
    );

    if (!isOutputDataValid) {
      statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
    } else {
      payload = outputData;
    }

    statusMessage = STATUS_MESSAGE.SUCCESS_GET;
    payload = voucher;
  } catch (error) {
    statusMessage = (error as Error).message;
  }

  const response = formatApiResponse(statusMessage, payload);
  return { response, statusMessage };
};

const handlePutRequest = async (req: NextApiRequest) => {
  const apiName = APIName.VOUCHER_PUT_V2;
  const session = await getSession(req);
  await checkSessionUser(session, apiName, req);
  await checkUserAuthorization(apiName, req, session);

  const { query, body } = checkRequestData(apiName, req, session);
  if (!query || !body) throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);

  const { voucherId, isVoucherNo } = query;
  const { userId, companyId } = session;

  const { can } = await assertUserCanByCompany({
    userId,
    companyId,
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
    const origin = await getUtils.getVoucherFromPrisma(voucherId, { isVoucherNo, companyId });
    const originLineItems = getUtils.initLineItemEntities(origin);
    const certificates = getUtils.initCertificateEntities(origin);
    const asset = getUtils.initAssetEntities(origin);

    const { certificateIds, lineItems, assetIds, reverseVouchers, counterPartyId, ...voucherInfo } =
      body;

    // 驗證輸入資料完整性與一致性
    if (!postUtils.isArrayHasItems(lineItems)) throw new Error('lineItems is required');
    if (!postUtils.isItemExist(voucherInfo)) throw new Error('voucherInfo is required');
    if (!postUtils.isLineItemsBalanced(lineItems)) {
      throw new Error(STATUS_MESSAGE.UNBALANCED_DEBIT_CREDIT);
    }

    if (counterPartyId && !postUtils.isCounterPartyExistById(counterPartyId)) {
      throw new Error('CounterParty does not exist');
    }

    if (
      postUtils.isArrayHasItems(certificateIds) &&
      !postUtils.areAllCertificatesExistById(certificateIds)
    ) {
      throw new Error('Certificates do not all exist');
    }

    const issuer = await postUtils.initIssuerFromPrisma(userId);
    const newLineItems = postUtils.initLineItemEntities(lineItems);

    if (!putUtils.isLineItemEntitiesSame(originLineItems, newLineItems)) {
      throw new Error('Use POST + DELETE instead to modify lineItems');
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

    const updated = await putVoucherWithoutCreateNew(voucherId, {
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

  const { voucherId, isVoucherNo } = query;
  const { userId, companyId } = session;
  const { can } = await assertUserCanByCompany({
    userId,
    companyId,
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
    const voucher = await getUtils.getVoucherFromPrisma(voucherId, { isVoucherNo, companyId });
    const origin = parsePrismaVoucherToVoucherEntity(voucher);
    if (origin.deletedAt) throw new Error('Voucher already deleted');

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
      companyId,
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
