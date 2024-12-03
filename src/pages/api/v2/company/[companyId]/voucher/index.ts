// ToDo: (20241029 - Murky) 記得刪掉上面這一段
import { NextApiRequest, NextApiResponse } from 'next';

import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import loggerBack, { loggerError } from '@/lib/utils/logger_back';
import { formatApiResponse, getTimestampNow } from '@/lib/utils/common';
import { APIName } from '@/constants/api_connection';
import {
  voucherAPIPostUtils as postUtils,
  voucherAPIGetUtils as getUtils,
  IGetManyVoucherBetaEntity,
} from '@/pages/api/v2/company/[companyId]/voucher/route_utils';
import { withRequestValidation } from '@/lib/utils/middleware';

import { IHandleRequest } from '@/interfaces/handleRequest';
import { initVoucherEntity } from '@/lib/utils/voucher';
import { JOURNAL_EVENT } from '@/constants/journal';
import { postVoucherV2 } from '@/lib/utils/repo/voucher.repo';
import { PUBLIC_COUNTER_PARTY } from '@/constants/counterparty';
import { initCounterPartyEntity } from '@/lib/utils/counterparty';
import { ICounterPartyEntity } from '@/interfaces/counterparty';
import { IEventEntity } from '@/interfaces/event';
import { IVoucherBeta, IVoucherEntity } from '@/interfaces/voucher';
import { parsePrismaVoucherToVoucherEntity } from '@/lib/utils/formatter/voucher.formatter';
import { IPaginatedData } from '@/interfaces/pagination';
import { VoucherListTabV2, VoucherV2Action } from '@/constants/voucher';

type IVoucherGetOutput = IPaginatedData<{
  unRead: {
    uploadedVoucher: number;
    upcomingEvents: number;
    paymentVoucher: number;
    receivingVoucher: number;
  };
  vouchers: IGetManyVoucherBetaEntity[];
}>;

/**
 * Info: (20241120 - Murky)
 * @todo
 * - 需要同時滿足一般傳票回傳一般voucher和payable, receivable回傳
 * - sortBy 需要提供 issue day, total credit/total debit, payable amount, paid amount, remain amount
 * - 需要同時Post voucherRead
 * - 回傳的時候需要回傳未讀voucher數量
 */
export const handleGetRequest: IHandleRequest<APIName.VOUCHER_LIST_V2, IVoucherGetOutput> = async ({
  query,
  session,
}) => {
  // ToDo: (20240927 - Murky) Remember to add auth check
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IVoucherGetOutput | null = null;
  statusMessage = STATUS_MESSAGE.SUCCESS_LIST;

  const { userId, companyId } = session;

  const { page, pageSize, startDate, endDate, tab, sortOption, searchQuery, type } = query;
  const paginationVouchersFromPrisma = await getUtils.getVoucherListFromPrisma({
    companyId,
    page,
    pageSize,
    startDate,
    endDate,
    tab,
    sortOption,
    searchQuery,
    type,
  });
  const { data: vouchersFromPrisma, where, ...pagination } = paginationVouchersFromPrisma;
  const nowInSecond = getTimestampNow();
  const voucherBetas: IGetManyVoucherBetaEntity[] = vouchersFromPrisma.map((voucherFromPrisma) => {
    const voucherEntity = getUtils.initVoucherEntity(voucherFromPrisma);
    const lineItemEntities = getUtils.initLineItemAndAccountEntities(voucherFromPrisma);
    const counterPartyEntity = getUtils.initCounterPartyEntity(voucherFromPrisma);
    const issuerEntity = getUtils.initIssuerAndFileEntity(voucherFromPrisma);
    const readByUsers = getUtils.initUserVoucherEntities(voucherFromPrisma);
    const sum = getUtils.getLineItemAmountSum(lineItemEntities);
    const originalEventEntities = getUtils.initOriginalEventEntities(voucherFromPrisma);
    const { payableInfo, receivingInfo } =
      getUtils.getPayableReceivableInfoFromVoucher(originalEventEntities);

    const voucherBeta: IGetManyVoucherBetaEntity = {
      ...voucherEntity,
      counterParty: counterPartyEntity,
      issuer: issuerEntity,
      readByUsers,
      lineItems: lineItemEntities,
      sum: {
        debit: false, // Info: (20241104 - Murky) 這個其實永遠是false, 因為debit和credit相同, 然後總和放在credit
        amount: sum,
      },
      payableInfo,
      receivingInfo,
      originalEvents: originalEventEntities,
    };

    return voucherBeta;
  });

  // ToDo: (20241121 - Murky) Sort by total credit/total debit, payable amount, paid amount, remain amount
  getUtils.sortVoucherBetaList(voucherBetas, {
    sortOption,
    tab,
  });

  // ToDo: (20241121 - Murky) Get upload and upcoming unread voucher count
  const unreadUploadedVoucherCounts = await getUtils.getUnreadVoucherCount({
    userId,
    where,
    tab: VoucherListTabV2.UPLOADED,
  });

  const unreadUpcomingEventCounts = await getUtils.getUnreadVoucherCount({
    userId,
    where,
    tab: VoucherListTabV2.UPCOMING,
  });

  const unreadReceivedVoucherCounts = await getUtils.getUnreadVoucherCount({
    userId,
    where,
    tab: VoucherListTabV2.RECEIVING,
  });

  const unreadPayableVoucherCounts = await getUtils.getUnreadVoucherCount({
    userId,
    where,
    tab: VoucherListTabV2.PAYMENT,
  });
  // ToDo: (20241121 - Murky) Post Read info
  getUtils.upsertUserReadVoucher({
    userId,
    voucherIdsBeenRead: voucherBetas.map((voucher) => voucher.id),
    nowInSecond,
  });

  payload = {
    page: pagination.page,
    totalPages: pagination.totalPages,
    totalCount: pagination.totalCount,
    pageSize: pagination.pageSize,
    hasNextPage: pagination.hasNextPage,
    hasPreviousPage: pagination.hasPreviousPage,
    sort: sortOption,
    data: {
      unRead: {
        uploadedVoucher: unreadUploadedVoucherCounts,
        upcomingEvents: unreadUpcomingEventCounts,
        paymentVoucher: unreadPayableVoucherCounts,
        receivingVoucher: unreadReceivedVoucherCounts,
      },
      vouchers: voucherBetas,
    },
  };
  return {
    statusMessage,
    payload,
  };
};

/**
 * Info: (20241025 - Murky)
 * @todo
 * 1. voucher, line_items, recurring_event, asset, revertVoucher 建立 isXXXExist
 * 2. line_items 不存在時直接throw error
 * 3. 將Input 依照voucher, line_items, recurring_event, asset, revertVoucher 進行拆解並建立Entity
 * 4 如果有 recurring_event 建立, upcoming_event, 並先init upcoming傳票Entity
 * 5. 如果有 asset 建立, asset_event, 並建立upcoming傳票
 * 6. 如果有 revertVoucher 建立, 建立revert_event, 並建立revert傳票
 * 7. 用Transaction包住所有的Entity, 一起建立
 * @note
 * 1. voucherNo 不可以是unique(不同公司會撞No)
 * 2. 需要Worker去把upcoming event裡的voucher轉成正式的voucher
 */
export const handlePostRequest: IHandleRequest<APIName.VOUCHER_POST_V2, IVoucherEntity> = async ({
  body,
  session,
}) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IVoucherEntity | null = null;
  // const mockPostedVoucherId = 1002;

  try {
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

    const { userId, companyId } = session;
    // Info: (20241111 - Murky) 暫時先用1002

    /**
     * Info: (20241029 - Murky)
     * @description all timestamp in one post use this timestamp as createdAt
     */
    const nowInSecond = getTimestampNow();

    /**
     * Info: (20241029 - Murky)
     * @description Storing events throughout the process, saving to prisma in the end
     * @property revertEvent - Revert Event Entity (if any)
     * @property recurringEvent - Recurring Event Entity (if any)
     * @property assetEvent - Asset Event Entity (if any)
     */
    const eventControlPanel: {
      revertEvent: IEventEntity | null;
      recurringEvent: IEventEntity | null;
      assetEvent: IEventEntity | null;
    } = {
      revertEvent: null,
      recurringEvent: null,
      assetEvent: null,
    };

    // Info: (20241029 - Murky) Check which action algorithm should be executed
    const doRevert = postUtils.isDoAction({
      actions,
      command: VoucherV2Action.REVERT,
    });

    const doAddAsset = postUtils.isDoAction({
      actions,
      command: VoucherV2Action.ADD_ASSET,
    });

    // const doRecurring = postUtils.isDoAction({
    //   actions,
    //   command: VoucherV2Action.RECURRING,
    // });

    // Info: (20241025 - Murky) Is xxx exist
    const isCertificateIdsHasItems = postUtils.isArrayHasItems(certificateIds);
    const isLineItemsHasItems = postUtils.isArrayHasItems(lineItems);
    // const isRecurringInfoExist = postUtils.isItemExist(recurringInfo);
    const isCounterPartyIdExist = postUtils.isItemExist(counterPartyId);
    const isAssetIdsHasItems = postUtils.isArrayHasItems(assetIds);
    const isReverseVouchersInfoHasItems = postUtils.isArrayHasItems(reverseVouchersInfo);
    const isVoucherInfoExist = postUtils.isItemExist(voucherInfo);
    const isVoucherEditable = true;

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
    // Info: (20241025 - Murky) Early throw error if lineItems is empty and voucherInfo is empty
    if (!isLineItemsHasItems) {
      postUtils.throwErrorAndLog(loggerBack, {
        errorMessage: 'lineItems is required when post voucher',
        statusMessage: STATUS_MESSAGE.BAD_REQUEST,
      });
    }

    if (!isVoucherInfoExist) {
      postUtils.throwErrorAndLog(loggerBack, {
        errorMessage: 'voucherInfo is required when post voucher',
        statusMessage: STATUS_MESSAGE.BAD_REQUEST,
      });
    }

    // Info: (20241111 - Murky) Init Company and Issuer Entity, For Voucher Meta Data and check if they exist in database
    const company = await postUtils.initCompanyFromPrisma(companyId);
    const issuer = await postUtils.initIssuerFromPrisma(userId);

    // Info: (20241025 - Murky) Init Voucher, counterParty LineItems Entity
    const newVoucherNo = ''; // Info: (20241025 - Murky) [Warning!] VoucherNo 需要在存入的transaction中取得

    // Info: (20241029 - Murky) 一開始都先用public counterParty, 進入Reverse邏輯後在使用前端傳進來的counterParty
    const publicCounterPartyEntity: ICounterPartyEntity = initCounterPartyEntity({
      id: PUBLIC_COUNTER_PARTY.id,
      companyId: PUBLIC_COUNTER_PARTY.companyId,
      name: PUBLIC_COUNTER_PARTY.name,
      taxId: PUBLIC_COUNTER_PARTY.taxId,
      type: PUBLIC_COUNTER_PARTY.type,
      note: PUBLIC_COUNTER_PARTY.note,
      createdAt: PUBLIC_COUNTER_PARTY.createdAt,
      updatedAt: PUBLIC_COUNTER_PARTY.updatedAt,
      deletedAt: PUBLIC_COUNTER_PARTY.deletedAt,
    });

    const lineItemEntities = postUtils.initLineItemEntities(lineItems);

    const voucher = initVoucherEntity({
      issuerId: issuer.id,
      counterPartyId: publicCounterPartyEntity.id,
      companyId: company.id,
      type: voucherInfo.type,
      status: JOURNAL_EVENT.UPLOADED,
      editable: isVoucherEditable,
      no: newVoucherNo,
      date: voucherInfo.voucherDate,
    });

    voucher.counterParty = publicCounterPartyEntity;
    voucher.lineItems = lineItemEntities;

    // ToDo: (20241025 - Murky) Revert Logic, 也許可以拉到別的地方
    if (doRevert) {
      // Info: (20241029 - Murky) Revert Event need to use counterParty Provided by frontend
      if (!isCounterPartyIdExist) {
        postUtils.throwErrorAndLog(loggerBack, {
          errorMessage: 'counterPartyId is required when post revert voucher',
          statusMessage: STATUS_MESSAGE.BAD_REQUEST,
        });
      }

      const counterPartyEntity = await postUtils.initCounterPartyFromPrisma(counterPartyId!);

      if (!isReverseVouchersInfoHasItems) {
        postUtils.throwErrorAndLog(loggerBack, {
          errorMessage: 'reverseVouchers is required when post revert voucher',
          statusMessage: STATUS_MESSAGE.BAD_REQUEST,
        });
      }

      // Info: (20241025 - Murky) 檢查是不是所有的revertVoucher都存在, 不存在就throw error
      const revertVoucherIds = reverseVouchersInfo.map(
        (reverseVoucher) => reverseVoucher.voucherId
      );
      const isAllRevertVoucherExist = postUtils.areAllVouchersExistById(revertVoucherIds);
      if (!isAllRevertVoucherExist) {
        postUtils.throwErrorAndLog(loggerBack, {
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

      // Info: (20241025 - Murky) Create Revert Event Entity with reverseVouchersInfo (event not yet created)

      const associateVouchersForRevertEvent = await postUtils.initRevertAssociateVouchers({
        originalVoucher: voucher,
        revertOtherLineItems: lineItemEntities,
        reverseVouchersInfo,
      });

      const revertEventEntity = postUtils.initRevertEventEntity({
        nowInSecond,
        associateVouchers: associateVouchersForRevertEvent,
      });

      // Info: (20241030 - Murky) CounterParty只有在 "Revert事件"的時候會放在voucher裡, 其他時候都用PUBLIC_VOUCHER
      voucher.counterParty = counterPartyEntity;

      // Info: (20241030 - Murky) 將evertEvent放入eventControlPanel, Prisma Transaction時一起建立
      eventControlPanel.revertEvent = revertEventEntity;
    }

    if (doAddAsset) {
      // Info: (20241111 - Murky) 備註： Asset 在Post 的時候就會一起建立 所有折舊的傳票，所以在這邊不需要在建立折舊的傳票
      if (!isAssetIdsHasItems) {
        postUtils.throwErrorAndLog(loggerBack, {
          errorMessage: 'assetIds is required when post voucher with assetIds',
          statusMessage: STATUS_MESSAGE.BAD_REQUEST,
        });
      }

      const isAllAssetExist = postUtils.areAllAssetsExistById(assetIds);

      if (!isAllAssetExist) {
        postUtils.throwErrorAndLog(loggerBack, {
          errorMessage: `when post voucher with assetIds, all asset need to exist in database`,
          statusMessage: STATUS_MESSAGE.BAD_REQUEST,
        });
      }

      const assetEntities = await Promise.all(assetIds.map(postUtils.initAssetFromPrisma));

      // Deprecated: (20241111 - Murky) 不需要再建立Depreciation Voucher, 因為在Post Asset的時候就會一起建立
      // Info: (20241111 - Murky) [Warning!] 這就這邊沒有建立event

      // Info: (20241029 - Murky) Generate all Depreciation Voucher
      // const depreciatedExpenseVouchers = assetEntities
      //   .map((assetEntity) => {
      //     return postUtils.initDepreciationVoucherFromAssetEntity(assetEntity, {
      //       nowInSecond,
      //       issuer,
      //       company,
      //     });
      //   })
      //   .flat();

      // const assetEventEntity = postUtils.initAddAssetEventEntity({
      //   originalVoucher: voucher,
      //   depreciatedExpenseVouchers,
      // });

      // Info: (20241030 - Murky) 將evertEvent放入eventControlPanel , Prisma Transaction時一起建立
      // eventControlPanel.assetEvent = assetEventEntity;
      voucher.asset = assetEntities;
    }

    // Info: (20241111 - Murky) Recurring Logic 暫時不做
    // if (doRecurring) {
    //   if (!isRecurringInfoExist) {
    //     postUtils.throwErrorAndLog(loggerBack, {
    //       errorMessage: 'recurringInfo is required when post recurring voucher',
    //       statusMessage: STATUS_MESSAGE.BAD_REQUEST,
    //     });
    //   }

    //   const recurringAssociateVouchers = postUtils.initRecurringAssociateVouchers({
    //     originalVoucher: voucher,
    //     recurringInfo: recurringInfo!,
    //   });

    //   const recurringEventEntity = postUtils.initRecurringEventEntity({
    //     startDateInSecond: recurringInfo!.startDate,
    //     endDateInSecond: recurringInfo!.endDate,
    //     associateVouchers: recurringAssociateVouchers,
    //     frequency: recurringInfo!.type,
    //     daysOfWeek: recurringInfo!.daysOfWeek,
    //     monthsOfYear: recurringInfo!.monthsOfYear,
    //   });

    //   // Info: (20241030 - Murky) 將evertEvent放入eventControlPanel, Prisma Transaction時一起建立
    //   eventControlPanel.recurringEvent = recurringEventEntity;
    // }
    const createdVoucher = await postVoucherV2({
      nowInSecond,
      originalVoucher: voucher,
      eventControlPanel,
      company,
      issuer,
    });

    // Info: (20241111 - Murky) Output formatter 只要回傳新的voucherId就可以了
    payload = parsePrismaVoucherToVoucherEntity(createdVoucher);
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
    loggerBack.error(error);
  }

  statusMessage = STATUS_MESSAGE.CREATED;
  return {
    statusMessage,
    payload,
  };
};

type APIResponse =
  | IPaginatedData<{
      unRead: {
        uploadedVoucher: number;
        upcomingEvents: number;
      };
      vouchers: IVoucherBeta[];
    }>
  | number
  | null;

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{
    statusMessage: string;
    payload: APIResponse;
  }>;
} = {
  GET: (req, res) => withRequestValidation(APIName.VOUCHER_LIST_V2, req, res, handleGetRequest),
  POST: (req, res) => withRequestValidation(APIName.VOUCHER_POST_V2, req, res, handlePostRequest),
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
