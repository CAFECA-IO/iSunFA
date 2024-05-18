import { AICH_URI } from '@/constants/config';
import { IResponseData } from '@/interfaces/response_data';
import { NextApiRequest, NextApiResponse } from 'next';
import { IAccountResultStatus } from '@/interfaces/accounting_account';
import { formatApiResponse } from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { isIAccountResultStatus } from '@/lib/utils/type_guard/account';
import { isIInvoice } from '@/lib/utils/type_guard/invoice';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAccountResultStatus>>
) {
  try {
    if (req.method === 'POST') {
      const { invoices } = req.body;
      // Info Murky (20240416): Check if invoices is array and is Invoice type
      if (!Array.isArray(invoices) || !invoices.every(isIInvoice)) {
        throw new Error(STATUS_MESSAGE.BAD_GATEWAY_DATA_FROM_AICH_IS_INVALID_TYPE);
      }

      let fetchResult: Response;

      try {
        fetchResult = await fetch(`${AICH_URI}/api/v1/vouchers/upload_invoice`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(invoices),
        });
      } catch (error) {
        throw new Error(STATUS_MESSAGE.BAD_GATEWAY_AICH_FAILED);
      }

      if (!fetchResult.ok) {
        throw new Error(STATUS_MESSAGE.BAD_GATEWAY_AICH_FAILED);
      }

      const resultStatus: IAccountResultStatus = (await fetchResult.json()).payload;

      if (!resultStatus || !isIAccountResultStatus(resultStatus)) {
        throw new Error(STATUS_MESSAGE.BAD_GATEWAY_DATA_FROM_AICH_IS_INVALID_TYPE);
      }

      const { httpCode, result } = formatApiResponse<IAccountResultStatus>(
        STATUS_MESSAGE.CREATED,
        resultStatus
      );
      res.status(httpCode).json(result);
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;

    const { httpCode, result } = formatApiResponse<IAccountResultStatus>(
      error.message,
      {} as IAccountResultStatus
    );
    res.status(httpCode).json(result);
  }
}
