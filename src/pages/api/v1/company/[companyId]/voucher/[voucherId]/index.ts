import { AICH_URI } from '@/constants/config';
import { IResponseData } from '@/interfaces/response_data';
import { IVoucher } from '@/interfaces/voucher';
import { errorMessageToErrorCode } from '@/lib/utils/errorCode';
import version from '@/lib/version';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IVoucher>>
) {
  try {
    if (req.method === 'GET') {
      if (!req.query.voucherId) {
        throw new Error('Invalid input parameter');
      }

      const result = await fetch(`${AICH_URI}/api/v1/vouchers/${req.query.voucherId}/result`);

      if (!result.ok) {
        res.status(500).json({
          powerby: 'ISunFa api ' + version,
          success: false,
          code: '500',
          message: 'Internal Server Error in voucher api, error in fetching voucher from AICH',
          payload: {},
        });
      }

      const voucher: IVoucher = (await result.json()).payload;

      res.status(200).json({
        powerby: 'ISunFa api ' + version,
        success: true,
        code: '200',
        message: 'get voucher by id',
        payload: voucher,
      });
    } else {
      throw new Error('Method Not Allowed');
    }
  } catch (_error) {
    const error = _error as Error;
    const statusCode = errorMessageToErrorCode(error.message);
    res.status(statusCode).json({
      powerby: 'ISunFa api ' + version,
      success: false,
      code: String(statusCode),
      payload: {},
      message: error.message,
    });
  }
}
