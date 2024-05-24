// Info Murky (20240416):  this is mock api need to migrate to microservice
import type { NextApiRequest, NextApiResponse } from 'next';
import { AICH_URI } from '@/constants/config';
import { IResponseData } from '@/interfaces/response_data';
import { IInvoiceDataForSavingToDB } from '@/interfaces/invoice';
import { formatApiResponse } from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { isIInvoiceDataForSavingToDB } from '@/lib/utils/type_guard/invoice';

// Info (20240522 - Murky): This OCR now can only be used on Invoice

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IInvoiceDataForSavingToDB>>
) {
  try {
    const { resultId } = req.query;
    // Info Murky (20240416): Check if resultId is string
    if (Array.isArray(resultId) || !resultId || typeof resultId !== 'string') {
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    }

    switch (req.method) {
      case 'GET': {
        const fetchResult = await fetch(`${AICH_URI}/api/v1/ocr/${resultId}/result`);

        if (!fetchResult.ok) {
          throw new Error(STATUS_MESSAGE.BAD_GATEWAY_AICH_FAILED);
        }

        const ocrResultData: IInvoiceDataForSavingToDB = (await fetchResult.json()).payload;

        if (!ocrResultData) {
          throw new Error(STATUS_MESSAGE.AICH_SUCCESSFUL_RETURN_BUT_RESULT_IS_NULL);
        }

        ocrResultData.journalId = null;

        if (!isIInvoiceDataForSavingToDB(ocrResultData)) {
          throw new Error(STATUS_MESSAGE.BAD_GATEWAY_DATA_FROM_AICH_IS_INVALID_TYPE);
        }

        const { httpCode, result } = formatApiResponse<IInvoiceDataForSavingToDB>(
          STATUS_MESSAGE.SUCCESS,
          ocrResultData
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
    const { httpCode, result } = formatApiResponse<IInvoiceDataForSavingToDB>(
      error.message,
      {} as IInvoiceDataForSavingToDB
    );
    res.status(httpCode).json(result);
  }
}
