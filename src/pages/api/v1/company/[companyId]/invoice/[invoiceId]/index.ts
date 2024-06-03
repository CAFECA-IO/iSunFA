// Info Murky (20240416):  this is mock api need to migrate to microservice
import type { NextApiRequest, NextApiResponse } from 'next';
import { AICH_URI } from '@/constants/config';
import { IResponseData } from '@/interfaces/response_data';
// import {  } from '@/constants/STATUS_MESSAGE';
import { formatApiResponse } from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IInvoiceDataForSavingToDB } from '@/interfaces/invoice';
import { isIInvoiceDataForSavingToDB } from '@/lib/utils/type_guard/invoice';

// Depreciate: (20240603 Murky): This route need to be rewrite into get invoice from prisma

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IInvoiceDataForSavingToDB>>
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

        const ocrResultData: IInvoiceDataForSavingToDB = (await fetchResult.json()).payload;

        if (!ocrResultData || !isIInvoiceDataForSavingToDB(ocrResultData)) {
          throw new Error(STATUS_MESSAGE.BAD_GATEWAY_DATA_FROM_AICH_IS_INVALID_TYPE);
        }

        const { httpCode, result } = formatApiResponse<IInvoiceDataForSavingToDB>(
STATUS_MESSAGE.SUCCESS,
          ocrResultData,
        );

        res.status(httpCode).json(result);
        break;
      }
      default: {
        throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
      }
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IInvoiceDataForSavingToDB>(error.message, {} as IInvoiceDataForSavingToDB);
    res.status(httpCode).json(result);
  }
}
