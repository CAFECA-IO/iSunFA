import { NextApiRequest, NextApiResponse } from 'next';

import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import loggerBack, { loggerError } from '@/lib/utils/logger_back';
import { formatApiResponse } from '@/lib/utils/common';
import { APIName } from '@/constants/api_connection';
import {
  mockVouchersReturn,
  voucherAPIPostUtils as postUtils,
} from '@/pages/api/v2/company/[companyId]/voucher/route_utils';
import { withRequestValidation } from '@/lib/utils/middleware';

import { IHandleRequest } from '@/interfaces/handleRequest';
import { initVoucherEntity } from '@/lib/utils/voucher';
import { JOURNAL_EVENT } from '@/constants/journal';
import { getLatestVoucherNoInPrisma } from '@/lib/utils/repo/voucher.repo';
import { VoucherV2Action } from '@/constants/voucher';

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
export const handlePostRequest: IHandleRequest<APIName.VOUCHER_POST_V2, number> = async ({
  body,
  session,
}) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  const payload: number | null = null;
  // const mockPostedVoucherId = 1002;

  try {
    const {
      actions,
      certificateIds,
      lineItems,
      recurringInfo,
      assetIds,
      reverseVouchers: reverseVouchersInfo,
      ...voucherInfo
    } = body;
    const { companyId, userId } = session;
    // Info: (20241025 - Murky) Is xxx exist area
    const doRevert = postUtils.isDoAction({
      actions,
      command: VoucherV2Action.REVERT,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const doAddAsset = postUtils.isDoAction({
      actions,
      command: VoucherV2Action.ADD_ASSET,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const doRecurring = postUtils.isDoAction({
      actions,
      command: VoucherV2Action.RECURRING,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const isCertificateIdsHasItems = postUtils.isArrayHasItems(certificateIds);
    const isLineItemsHasItems = postUtils.isArrayHasItems(lineItems);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const isRecurringInfoExist = postUtils.isItemExist(recurringInfo);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

    // Info: (20241025 - Murky) Get VoucherNo
    const newVoucherNo = await getLatestVoucherNoInPrisma(companyId);

    // Info: (20241025 - Murky) Init Voucher and LineItems Entity

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const voucher = initVoucherEntity({
      issuerId: userId,
      counterPartyId: voucherInfo.counterPartyId,
      companyId,
      type: voucherInfo.type,
      status: JOURNAL_EVENT.UPLOADED,
      editable: isVoucherEditable,
      no: newVoucherNo,
      date: voucherInfo.voucherDate,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const lineItemEntities = postUtils.initLineItemEntities(lineItems);

    // ToDo: (20241025 - Murky) Revert Logic, 也許可以拉到別的地方
    if (doRevert) {
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
          errorMessage: `when post voucher with reverseVouchersInfo, all reverseVoucher need to exist`,
          statusMessage: STATUS_MESSAGE.BAD_REQUEST,
        });
      }

      // Info: (20241025 - Murky) Create Revert Event Entity with reverseVouchersInfo (event not yet created)
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
