import { NextApiRequest, NextApiResponse } from 'next';
import { APIName, HttpMethod } from '@/constants/api_connection';
import { getSession } from '@/lib/utils/session';
import { checkRequestData, checkUserAuthorization, logUserAction } from '@/lib/utils/middleware';
import { formatApiResponse } from '@/lib/utils/common';
import { HTTP_STATUS } from '@/constants/http';
import { STATUS_MESSAGE } from '@/constants/status_code';
import loggerBack from '@/lib/utils/logger_back';
import { listBaifaVouchers } from '@/lib/utils/repo/voucher.repo';
import { validateOutputData } from '@/lib/utils/validator';
import { buildVoucherBeta } from '@/pages/api/v2/account_book/[accountBookId]/voucher';
import { toPaginatedData } from '@/lib/utils/formatter/pagination.formatter';
import { IPaginatedData } from '@/interfaces/pagination';
import { IGetManyVoucherBetaEntity } from '@/pages/api/v2/account_book/[accountBookId]/voucher/route_utils';

const handleGetRequest = async (req: NextApiRequest) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload = null;
  const session = await getSession(req);

  await checkUserAuthorization(APIName.LIST_BAIFA_VOUCHER, req, session);

  const { query } = checkRequestData(APIName.LIST_BAIFA_VOUCHER, req, session);

  if (!query) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }
  const paginationVouchers = await listBaifaVouchers(query);
  const { data, ...pagination } = paginationVouchers;

  const voucherBetas = data.map(buildVoucherBeta);

  const paginatedVoucher: IPaginatedData<IGetManyVoucherBetaEntity[]> = toPaginatedData({
    ...pagination,
    data: voucherBetas,
  });

  const { isOutputDataValid, outputData } = validateOutputData(
    APIName.LIST_BAIFA_VOUCHER,
    paginatedVoucher
  );

  statusMessage = isOutputDataValid ? STATUS_MESSAGE.SUCCESS : STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  payload = isOutputDataValid ? outputData : null;

  const response = formatApiResponse(statusMessage, payload);
  return { response, statusMessage };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = req.method || HttpMethod.GET;
  let httpCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let result;
  let response;
  let statusMessage: string = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  const session = await getSession(req);
  const apiName = APIName.LIST_BAIFA_VOUCHER;

  try {
    switch (method) {
      case HttpMethod.GET:
        ({ response, statusMessage } = await handleGetRequest(req));
        ({ httpCode, result } = response);
        break;
      default:
        statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
        ({ httpCode, result } = formatApiResponse<null>(statusMessage, null));
        break;
    }
  } catch (error) {
    loggerBack.error(`error: ${JSON.stringify(error)}`);
    const err = error as Error;
    statusMessage = STATUS_MESSAGE[err.name as keyof typeof STATUS_MESSAGE] || err.message;
    ({ httpCode, result } = formatApiResponse<null>(statusMessage, null));
  }

  await logUserAction(session, apiName, req, statusMessage);
  res.status(httpCode).json(result);
}
