import { AICH_URI } from '@/constants/config';
import { IResponseData } from '@/interfaces/response_data';
import { IVoucherDataForSavingToDB } from '@/interfaces/voucher';
import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';

type ApiResponseType = IVoucherDataForSavingToDB | null;
// Info: （ 20240522 - Murkky）目前只可以使用Voucher Return
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ApiResponseType>>
) {
  try {
    if (req.method === 'GET') {
      const { resultId, aiApi = "vouchers" } = req.query;

      // Info Murky (20240416): Check if resultId is string
      if (typeof resultId !== 'string' || !resultId || Array.isArray(resultId)) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }

      const fetchResult = await fetch(`${AICH_URI}/api/v1/${aiApi}/${resultId}/result`);

      if (!fetchResult.ok) {
        throw new Error(STATUS_MESSAGE.BAD_GATEWAY_AICH_FAILED);
      }

      const rawVoucher: ApiResponseType = (await fetchResult.json()).payload;
      if (!rawVoucher) {
        const { httpCode, result } = formatApiResponse<ApiResponseType>(
          STATUS_MESSAGE.SUCCESS_GET,
          rawVoucher
        );
        res.status(httpCode).json(result);
      }

    // Deprecated: （ 20240522 - Murkky）
    //   if (!isIVoucher(rawVoucher)) {
    //     throw new Error(STATUS_MESSAGE.BAD_GATEWAY_DATA_FROM_AICH_IS_INVALID_TYPE);
    //   }

      const { httpCode, result } = formatApiResponse<ApiResponseType>(
        STATUS_MESSAGE.SUCCESS_GET,
        rawVoucher
      );
      res.status(httpCode).json(result);
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<ApiResponseType>(error.message, {} as ApiResponseType);
    res.status(httpCode).json(result);
  }
}
