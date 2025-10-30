// Info: (20250416 - Tzuhan) Voucher List API handler 改寫為統一風格
import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/utils/session';
import {
  checkSessionUser,
  checkRequestData,
  checkUserAuthorization,
  logUserAction,
} from '@/lib/utils/middleware';
import { STATUS_CODE, STATUS_MESSAGE } from '@/constants/status_code';
import loggerBack from '@/lib/utils/logger_back';
import { formatApiResponse, getTimestampNow } from '@/lib/utils/common';
import { APIName, HttpMethod } from '@/constants/api_connection';
import {
  voucherAPIPostUtils as postUtils,
  voucherAPIGetUtils as getUtils,
  IGetManyVoucherBetaEntity,
} from '@/pages/api/v2/account_book/[accountBookId]/voucher/route_utils';
import { initVoucherEntity } from '@/lib/utils/voucher';
import { JOURNAL_EVENT } from '@/constants/journal';
import { IEventEntity } from '@/interfaces/event';
import { IGetManyVoucherResponseButOne, IVoucherBeta, IVoucherEntity } from '@/interfaces/voucher';
import { parsePrismaVoucherToVoucherEntity } from '@/lib/utils/formatter/voucher.formatter';
import { IPaginatedData } from '@/interfaces/pagination';
// Info: (20250422 - Tzuhan) 這邊的 import 會用在 incomplete 的 note 裡面
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { VoucherListTabV2, VoucherV2Action } from '@/constants/voucher';
import { EventType, TransactionStatus } from '@/constants/account';
import { HTTP_STATUS } from '@/constants/http';
import { assertUserCanByAccountBook } from '@/lib/utils/permission/assert_user_team_permission';
import { TeamPermissionAction } from '@/interfaces/permissions';
import { validateOutputData } from '@/lib/utils/validator';
import { toPaginatedData } from '@/lib/utils/formatter/pagination.formatter';
import { countIncompleteVouchersByTab } from '@/lib/utils/voucher_common';

type IVoucherGetOutput = IPaginatedData<IGetManyVoucherBetaEntity[]>;

export const buildVoucherBeta = (
  voucher: IGetManyVoucherResponseButOne
): IGetManyVoucherBetaEntity => {
  const entity = getUtils.initVoucherEntity(voucher);

  const lineItems = getUtils.initLineItemAndAccountEntities(voucher);
  const originalEvents = getUtils.initOriginalEventEntities(voucher);
  const resultEvents = getUtils.initResultEventEntities(voucher);
  const lineItemSum = getUtils.getLineItemAmountSum(lineItems);

  const { payableInfo, receivingInfo } = getUtils.getPayableReceivableInfoFromVoucher(
    [...originalEvents, ...resultEvents],
    lineItems
  );

  return {
    ...entity,
    counterParty: getUtils.initCounterPartyEntity(voucher),
    issuer: getUtils.initIssuerAndFileEntity(voucher),
    lineItems,
    sum: {
      debit: false,
      amount: lineItemSum ?? '0',
    },
    payableInfo: {
      total: payableInfo?.total ?? '0',
      alreadyHappened: payableInfo?.alreadyHappened ?? '0',
      remain: payableInfo?.remain ?? '0',
    },
    receivingInfo: {
      total: receivingInfo?.total ?? '0',
      alreadyHappened: receivingInfo?.alreadyHappened ?? '0',
      remain: receivingInfo?.remain ?? '0',
    },
    originalEvents,
    resultEvents,
  };
};

const handleGetRequest = async (req: NextApiRequest) => {
  const apiName = APIName.VOUCHER_LIST_V2;
  const session = await getSession(req);
  const { userId } = session;
  await checkSessionUser(session, apiName, req);
  await checkUserAuthorization(apiName, req, session);

  const { query } = checkRequestData(apiName, req, session);
  if (!query) {
    const error = new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    error.name = STATUS_CODE.INVALID_INPUT_PARAMETER;
    throw error;
  }

  const { accountBookId } = query;

  const { can } = await assertUserCanByAccountBook({
    userId,
    accountBookId,
    action: TeamPermissionAction.VIEW_VOUCHER_LIST,
  });

  if (!can) {
    const error = new Error(STATUS_MESSAGE.PERMISSION_DENIED);
    error.name = STATUS_CODE.PERMISSION_DENIED;
    throw error;
  }

  const {
    page,
    pageSize,
    startDate,
    endDate,
    tab,
    sortOption,
    searchQuery,
    type,
    hideReversedRelated,
  } = query;

  const getTypeFilter = (selectedType: EventType | TransactionStatus | undefined) => {
    switch (selectedType) {
      case EventType.INCOME:
      case EventType.OPENING:
      case EventType.PAYMENT:
      case EventType.TRANSFER:
        return { type: selectedType, condition: undefined };
      case TransactionStatus.REVERSED:
      case TransactionStatus.PENDING:
        return { type: undefined, condition: selectedType };
      default:
        return { type: undefined, condition: undefined };
    }
  };

  let statusMessage: string = STATUS_MESSAGE.SUCCESS_LIST;
  let payload: IPaginatedData<IVoucherBeta[]> | null = null;

  try {
    const typeFilter = getTypeFilter(type);
    const paginationVouchers = await getUtils.getVoucherListFromPrisma({
      accountBookId,
      page,
      pageSize,
      startDate,
      endDate,
      tab,
      sortOption,
      searchQuery,
      type: typeFilter.type,
      hideReversedRelated,
    });

    const { data, ...pagination } = paginationVouchers;

    const voucherBetas = data.map(buildVoucherBeta);
    const note = {
      incomplete: {
        uploadedVoucher: 0,
        upcomingEvents: 0,
        paymentVoucher: 0,
        receivingVoucher: 0,
      },
    };

    const paginatedVoucher: IVoucherGetOutput = toPaginatedData({
      ...pagination,
      sort: sortOption,
      data: getUtils.filterTransactionStatus(voucherBetas, tab, typeFilter.condition),
      note: JSON.stringify(note),
    });

    const { isOutputDataValid, outputData } = validateOutputData(
      APIName.VOUCHER_LIST_V2,
      paginatedVoucher
    );

    if (!isOutputDataValid) {
      statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
    } else {
      if (outputData) {
        note.incomplete = countIncompleteVouchersByTab(outputData.data);
        outputData.note = JSON.stringify(note);
      }
      payload = outputData;
    }
  } catch (error) {
    statusMessage = (error as Error).message;
    loggerBack.error(error);
  }

  const response = formatApiResponse(statusMessage, payload);
  return { response, statusMessage };
};

const handlePostRequest = async (req: NextApiRequest) => {
  const apiName = APIName.VOUCHER_POST_V2;

  const session = await getSession(req);
  await checkSessionUser(session, apiName, req);
  await checkUserAuthorization(apiName, req, session);

  const { query, body } = checkRequestData(apiName, req, session);
  if (!query || !body) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const { userId } = session;

  const { accountBookId } = query;

  const { can } = await assertUserCanByAccountBook({
    userId,
    accountBookId,
    action: TeamPermissionAction.CREATE_VOUCHER,
  });

  if (!can) {
    const error = new Error(STATUS_MESSAGE.PERMISSION_DENIED);
    error.name = STATUS_CODE.PERMISSION_DENIED;
    throw error;
  }

  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IVoucherEntity | null = null;

  try {
    const nowInSecond = getTimestampNow();

    const {
      actions,
      certificateIds,
      invoiceRC2Ids,
      lineItems,
      assetIds,
      reverseVouchers: reverseVouchersInfo,
      counterPartyId,
      ...voucherInfo
    } = body;

    const eventControlPanel = {
      revertEvent: null,
      recurringEvent: null,
      assetEvent: null,
    } as {
      revertEvent: IEventEntity | null;
      recurringEvent: IEventEntity | null;
      assetEvent: IEventEntity | null;
    };

    const doRevert = postUtils.isDoAction({ actions, command: VoucherV2Action.REVERT });
    const isOffsetOnly =
      reverseVouchersInfo?.length > 0 && actions?.includes(VoucherV2Action.REVERT) === false;

    if (isOffsetOnly && doRevert) {
      loggerBack.info(`[防呆觸發] 嘗試在沖銷行為中建立 REVERT 傳票，已拒絕執行。body=${body}`);

      const error = new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      error.name = STATUS_CODE.INVALID_INPUT_PARAMETER;
      throw error;
    }

    const doAddAsset = postUtils.isDoAction({ actions, command: VoucherV2Action.ADD_ASSET });

    const isLineItemsHasItems = postUtils.isArrayHasItems(lineItems);
    const isVoucherInfoExist = postUtils.isItemExist(voucherInfo);

    if (!isLineItemsHasItems) {
      const error = new Error(STATUS_MESSAGE.MISSING_LINE_ITEMS);
      error.name = STATUS_CODE.MISSING_LINE_ITEMS;
      throw error;
    }
    if (!isVoucherInfoExist) {
      const error = new Error(STATUS_MESSAGE.MISSING_VOUCHER_INFO);
      error.name = STATUS_CODE.MISSING_VOUCHER_INFO;
      throw error;
    }

    const isLineItemsBalanced = postUtils.isLineItemsBalanced(lineItems);
    if (!isLineItemsBalanced) {
      throw new Error(STATUS_MESSAGE.UNBALANCED_DEBIT_CREDIT);
    }

    if (postUtils.isArrayHasItems(certificateIds)) {
      const isAllCertificateExist = postUtils.areAllCertificatesExistById(certificateIds);
      if (!isAllCertificateExist) {
        const error = new Error(STATUS_MESSAGE.CERTIFICATE_IDS_NOT_EXIST);
        error.name = STATUS_CODE.CERTIFICATE_IDS_NOT_EXIST;
        throw error;
      }
    }

    const company = await postUtils.initCompanyFromPrisma(accountBookId);
    const issuer = await postUtils.initIssuerFromPrisma(userId);
    const counterPartyEntity = postUtils.isItemExist(counterPartyId)
      ? await postUtils.initCounterPartyFromPrisma(counterPartyId)
      : null;

    const lineItemEntities = postUtils.initLineItemEntities(lineItems);
    const voucher = initVoucherEntity({
      issuerId: issuer.id,
      counterPartyId: counterPartyEntity?.id || null,
      accountBookId: company.id,
      type: voucherInfo.type,
      status: JOURNAL_EVENT.UPLOADED,
      editable: true,
      no: '',
      date: voucherInfo.voucherDate,
      note: voucherInfo.note,
    });

    voucher.counterParty = counterPartyEntity;
    voucher.lineItems = lineItemEntities;

    if (doRevert) {
      if (!postUtils.isArrayHasItems(reverseVouchersInfo)) {
        const error = new Error(STATUS_MESSAGE.REVERSE_VOUCHERS_NOT_EXIST);
        error.name = STATUS_CODE.REVERSE_VOUCHERS_NOT_EXIST;
        throw error;
      }

      const revertVoucherIds = reverseVouchersInfo.map((v) => v.voucherId);
      if (!postUtils.areAllVouchersExistById(revertVoucherIds)) {
        const error = new Error(STATUS_MESSAGE.REVERSE_VOUCHERS_NOT_EXIST);
        error.name = STATUS_CODE.REVERSE_VOUCHERS_NOT_EXIST;
        throw error;
      }

      const revertLineItemIds = reverseVouchersInfo.map((v) => v.lineItemIdBeReversed);
      if (!postUtils.areAllLineItemsExistById(revertLineItemIds)) {
        const error = new Error(STATUS_MESSAGE.REVERSE_LINE_ITEMS_NOT_EXIST);
        error.name = STATUS_CODE.REVERSE_LINE_ITEMS_NOT_EXIST;
        throw error;
      }

      const associateVouchers = await postUtils.initRevertAssociateVouchers({
        originalVoucher: voucher,
        revertOtherLineItems: lineItemEntities,
        reverseVouchersInfo,
      });

      eventControlPanel.revertEvent = postUtils.initRevertEventEntity({
        nowInSecond,
        associateVouchers,
      });
    }

    if (doAddAsset) {
      if (!postUtils.isArrayHasItems(assetIds)) {
        const error = new Error(STATUS_MESSAGE.ASSET_IDS_NOT_EXIST);
        error.name = STATUS_CODE.ASSET_IDS_NOT_EXIST;
        throw error;
      }
      if (!postUtils.areAllAssetsExistById(assetIds)) {
        const error = new Error(STATUS_MESSAGE.ASSET_IDS_NOT_EXIST);
        error.name = STATUS_CODE.ASSET_IDS_NOT_EXIST;
        throw error;
      }

      voucher.asset = await Promise.all(assetIds.map(postUtils.initAssetFromPrisma));
    }

    const createdVoucher = await postUtils.saveVoucherToPrisma({
      nowInSecond,
      originalVoucher: voucher,
      eventControlPanel,
      company,
      issuer,
      certificateIds,
      invoiceRC2Ids,
    });
    payload = parsePrismaVoucherToVoucherEntity(createdVoucher);
    // Todo: (20250416 - Tzuhan) 先前的 zod 寫法似乎有問題，導致無法正確驗證輸出資料
    // const parsedVouchers = parsePrismaVoucherToVoucherEntity(createdVoucher);
    // const { isOutputDataValid, outputData } = validateOutputData(
    //   APIName.VOUCHER_POST_V2,
    //   parsedVouchers
    // );
    // if (!isOutputDataValid) {
    //   statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
    // } else {
    //   payload = outputData;
    // }

    statusMessage = STATUS_MESSAGE.CREATED;
  } catch (error) {
    statusMessage = (error as Error).message;
    loggerBack.error(error);
  }

  const response = formatApiResponse(statusMessage, payload);
  return { response, statusMessage };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = req.method || HttpMethod.GET;
  let statusMessage: string = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  let httpCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let result;
  let apiName: APIName = APIName.VOUCHER_LIST_V2;

  const session = await getSession(req);
  try {
    switch (method) {
      case HttpMethod.GET:
        apiName = APIName.VOUCHER_LIST_V2;
        ({
          response: { httpCode, result },
          statusMessage,
        } = await handleGetRequest(req));
        break;
      case HttpMethod.POST:
        apiName = APIName.VOUCHER_POST_V2;
        ({
          response: { httpCode, result },
          statusMessage,
        } = await handlePostRequest(req));
        break;
      default:
        statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
        ({ httpCode, result } = formatApiResponse(statusMessage, null));
        break;
    }
  } catch (error) {
    const err = error as Error;
    statusMessage = STATUS_MESSAGE[err.name as keyof typeof STATUS_MESSAGE] || err.message;
    ({ httpCode, result } = formatApiResponse<null>(statusMessage, null));
  }

  await logUserAction(session, apiName, req, statusMessage);
  res.status(httpCode).json(result);
}
