// Info Murky (20240416):  this is mock api need to migrate to microservice
import type { NextApiRequest, NextApiResponse } from 'next';
import { AICH_URI } from '@/constants/config';
import { IResponseData } from '@/interfaces/response_data';
import { IInvoice } from '@/interfaces/invoice';
import { formatApiResponse } from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { isIInvoice } from '@/lib/utils/type_guard/invoice';

// Info (20240522 - Murky): This OCR now can only be used on Invoice
// use

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IInvoice[]>>
) {
  try {
    const { invoiceId } = req.query;
    // Info Murky (20240416): Check if invoiceId is string
    if (Array.isArray(invoiceId) || !invoiceId || typeof invoiceId !== 'string') {
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    }

    switch (req.method) {
      case 'GET': {
        const fetchResult = await fetch(`${AICH_URI}/api/v1/ocr/${invoiceId}/result`);

        if (!fetchResult.ok) {
          throw new Error(STATUS_MESSAGE.BAD_GATEWAY_AICH_FAILED);
        }

        const ocrResultData: IInvoice = (await fetchResult.json()).payload;

        if (!ocrResultData || !isIInvoice(ocrResultData)) {
          throw new Error(STATUS_MESSAGE.BAD_GATEWAY_DATA_FROM_AICH_IS_INVALID_TYPE);
        }

        const { httpCode, result } = formatApiResponse<IInvoice[]>(STATUS_MESSAGE.SUCCESS, [
          ocrResultData,
        ]);

        res.status(httpCode).json(result);
        break;
      }
      default: {
        throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
      }
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IInvoice[]>(error.message, {} as IInvoice[]);
    res.status(httpCode).json(result);
  }
}
