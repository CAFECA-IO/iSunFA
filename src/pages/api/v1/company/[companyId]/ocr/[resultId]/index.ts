// Info Murky (20240416):  this is mock api need to migrate to microservice
import type { NextApiRequest, NextApiResponse } from 'next';
import { AICH_URI } from '@/constants/config';
import { IResponseData } from '@/interfaces/response_data';
import { IInvoiceDataForSavingToDB } from '@/interfaces/invoice';
import { formatApiResponse } from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { isIInvoiceDataForSavingToDB } from '@/lib/utils/type_guard/invoice';

// Info (20240522 - Murky): This OCR now can only be used on Invoice

function isResultIdValid(resultId: string | string[] | undefined): resultId is string {
  if (Array.isArray(resultId) || !resultId || typeof resultId !== 'string') {
    return false;
  }
  return true;
}

async function fetchOCRResult(resultId: string) {
  let response: Response;

  try {
    response = await fetch(`${AICH_URI}/api/v1/ocr/${resultId}/result`);
  } catch (error) {
    throw new Error(STATUS_MESSAGE.BAD_GATEWAY_AICH_FAILED);
  }

  if (!response.ok) {
    throw new Error(STATUS_MESSAGE.BAD_GATEWAY_AICH_FAILED);
  }

  return response.json() as Promise<{ payload?:unknown } | null>;
}

async function getPayloadFromResponseJSON(responseJSON: Promise<{ payload?:unknown } | null>) {
  if (!responseJSON) {
    throw new Error(STATUS_MESSAGE.BAD_GATEWAY_AICH_FAILED);
  }

  let json: {
    payload?: unknown;
  } | null;

  try {
    json = await responseJSON;
  } catch (error) {
    throw new Error(STATUS_MESSAGE.PARSE_JSON_FAILED_ERROR);
  }

  if (!json || !json.payload) {
    throw new Error(STATUS_MESSAGE.AICH_SUCCESSFUL_RETURN_BUT_RESULT_IS_NULL);
  }

  return json.payload as IInvoiceDataForSavingToDB;
}

function setOCRResultJournalId(ocrResult: IInvoiceDataForSavingToDB, journalId: number | null) {
  // Info: (20240522 - Murky) This function is used to set journalId to the OCR result
  // eslint-disable-next-line no-param-reassign
  ocrResult.journalId = journalId;
}

async function handleGetRequest(resultId: string, res: NextApiResponse<IResponseData<IInvoiceDataForSavingToDB>>) {
  const fetchResult = fetchOCRResult(resultId);

  const ocrResult: IInvoiceDataForSavingToDB = await getPayloadFromResponseJSON(fetchResult);

  setOCRResultJournalId(ocrResult, null);

  if (!isIInvoiceDataForSavingToDB(ocrResult)) {
    throw new Error(STATUS_MESSAGE.BAD_GATEWAY_DATA_FROM_AICH_IS_INVALID_TYPE);
  }

  const { httpCode, result } = formatApiResponse<IInvoiceDataForSavingToDB>(
    STATUS_MESSAGE.SUCCESS,
    ocrResult
  );

  res.status(httpCode).json(result);
}

function handleErrorResponse(res: NextApiResponse, message: string) {
  const { httpCode, result } = formatApiResponse<IInvoiceDataForSavingToDB>(
    message,
    {} as IInvoiceDataForSavingToDB
  );
  res.status(httpCode).json(result);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IInvoiceDataForSavingToDB>>
) {
  try {
    const { resultId } = req.query;
    if (!isResultIdValid(resultId)) {
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    }

    switch (req.method) {
      case 'GET': {
        await handleGetRequest(resultId, res);
        break;
      }
      default: {
        throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
      }
    }
  } catch (_error) {
    const error = _error as Error;
    handleErrorResponse(res, error.message);
  }
}
