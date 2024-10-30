// ToDo: (20241029 - Murky) 記得刪掉上面這一段
import { NextApiRequest, NextApiResponse } from 'next';

import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import loggerBack, { loggerError } from '@/lib/utils/logger_back';
import { formatApiResponse, getTimestampNow } from '@/lib/utils/common';
import { APIName } from '@/constants/api_connection';
import {
  mockVouchersReturn,
  voucherAPIPostUtils as postUtils,
} from '@/pages/api/v2/company/[companyId]/voucher/route_utils';
import { withRequestValidation } from '@/lib/utils/middleware';

import { IHandleRequest } from '@/interfaces/handleRequest';
import { initVoucherEntity } from '@/lib/utils/voucher';
import { JOURNAL_EVENT } from '@/constants/journal';
import { postVoucherV2 } from '@/lib/utils/repo/voucher.repo';
import { VoucherV2Action } from '@/constants/voucher';
import { PUBLIC_COUNTER_PARTY } from '@/constants/counterparty';
import { initCounterPartyEntity } from '@/lib/utils/counterparty';
import { ICounterPartyEntity } from '@/interfaces/counterparty';
import { IEventEntity } from '@/interfaces/event';
import { IVoucherEntity } from '@/interfaces/voucher';
import { parsePrismaVoucherToVoucherEntity } from '@/lib/utils/formatter/voucher.formatter';

export const handleGetRequest: IHandleRequest<APIName.VOUCHER_LIST_V2, object> = async ({
  query,
}) => {
  // ToDo: (20240927 - Murky) Remember to add auth check
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: object | null = null;
  if (query) {
    statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
    payload = {
      page: 1, // Info: (20240927 - Murky) current page
      totalUnRead: 99,
      totalPages: 3,
      totalCount: 30,
      pageSize: 10,
      hasNextPage: true,
      hasPreviousPage: true,
      sort: [
        {
          sortBy: 'createAt',
          sortOrder: 'desc',
        },
      ],
      data: mockVouchersReturn,
    };
  }
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

    const { companyId, userId } = session;

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

    const doRecurring = postUtils.isDoAction({
      actions,
      command: VoucherV2Action.RECURRING,
    });

    // Info: (20241025 - Murky) Is xxx exist
    // const isCertificateIdsHasItems = postUtils.isArrayHasItems(certificateIds);
    const isLineItemsHasItems = postUtils.isArrayHasItems(lineItems);
    const isRecurringInfoExist = postUtils.isItemExist(recurringInfo);
    const isCounterPartyIdExist = postUtils.isItemExist(counterPartyId);
    const isAssetIdsHasItems = postUtils.isArrayHasItems(assetIds);
    const isReverseVouchersInfoHasItems = postUtils.isArrayHasItems(reverseVouchersInfo);
    const isVoucherInfoExist = postUtils.isItemExist(voucherInfo);
    const isVoucherEditable = true;

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

      // ToDo: (20241025 - Murky) areAllVouchersExistById has not implemented yet
      const isAllRevertVoucherExist = postUtils.areAllVouchersExistById(revertVoucherIds);

      if (!isAllRevertVoucherExist) {
        postUtils.throwErrorAndLog(loggerBack, {
          errorMessage: `when post voucher with reverseVouchersInfo, all reverseVoucher need to exist in database`,
          statusMessage: STATUS_MESSAGE.BAD_REQUEST,
        });
      }

      // Info: (20241025 - Murky) Create Revert Event Entity with reverseVouchersInfo (event not yet created)

      const associateVouchersForRevertEvent = await postUtils.initRevertAssociateVouchers({
        originalVoucher: voucher,
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

      // Info: (20241029 - Murky) Generate all Depreciation Voucher
      const depreciatedExpenseVouchers = assetEntities
        .map((assetEntity) => {
          return postUtils.initDepreciationVoucherFromAssetEntity(assetEntity, {
            nowInSecond,
            issuer,
            company,
          });
        })
        .flat();

      const assetEventEntity = postUtils.initAddAssetEventEntity({
        originalVoucher: voucher,
        depreciatedExpenseVouchers,
      });

      // Info: (20241030 - Murky) 將evertEvent放入eventControlPanel , Prisma Transaction時一起建立
      eventControlPanel.assetEvent = assetEventEntity;
    }

    if (doRecurring) {
      if (!isRecurringInfoExist) {
        postUtils.throwErrorAndLog(loggerBack, {
          errorMessage: 'recurringInfo is required when post recurring voucher',
          statusMessage: STATUS_MESSAGE.BAD_REQUEST,
        });
      }

      const recurringAssociateVouchers = postUtils.initRecurringAssociateVouchers({
        originalVoucher: voucher,
        recurringInfo: recurringInfo!,
      });

      const recurringEventEntity = postUtils.initRecurringEventEntity({
        startDateInSecond: recurringInfo!.startDate,
        endDateInSecond: recurringInfo!.endDate,
        associateVouchers: recurringAssociateVouchers,
        frequency: recurringInfo!.type,
        daysOfWeek: recurringInfo!.daysOfWeek,
        monthsOfYear: recurringInfo!.monthsOfYear,
      });

      // Info: (20241030 - Murky) 將evertEvent放入eventControlPanel, Prisma Transaction時一起建立
      eventControlPanel.recurringEvent = recurringEventEntity;

      const createdVoucher = await postVoucherV2({
        nowInSecond,
        originalVoucher: voucher,
        eventControlPanel,
        company,
        issuer,
      });

      payload = parsePrismaVoucherToVoucherEntity(createdVoucher);
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
  }

  statusMessage = STATUS_MESSAGE.CREATED;
  return {
    statusMessage,
    payload,
  };
};

type APIResponse = object | number | null;

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
    const logger = loggerError(userId, error.name, error.message);
    logger.error(error);
    statusMessage = error.message;
  }
  const { httpCode, result } = formatApiResponse<APIResponse>(statusMessage, payload);
  res.status(httpCode).json(result);
}
