// Info Murky (20240416):  this is mock api need to migrate to microservice
import type { NextApiRequest, NextApiResponse } from 'next';
import { IResponseData } from '@/interfaces/response_data';
import { IInvoice } from '@/interfaces/invoice';
import {
  formatApiResponse,
  timestampInSeconds,
  transformBytesToFileSizeString,
} from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { isIInvoice } from '@/lib/utils/type_guard/invoice';
import { IContract } from '@/interfaces/contract';
import { deleteOcrByResultId, getOcrByResultId } from '@/lib/utils/repo/ocr.repo';
import { IOCR } from '@/interfaces/ocr';
import { ProgressStatus } from '@/constants/account';
import { getSession } from '@/lib/utils/session';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { AuthFunctionsKeys } from '@/interfaces/auth';
import { getAichUrl } from '@/lib/utils/aich';
import { AICH_APIS_TYPES } from '@/constants/aich';

// Info (20240522 - Murky): This OCR now can only be used on Invoice

export function isResultIdValid(resultId: string | string[] | undefined): resultId is string {
  if (Array.isArray(resultId) || !resultId || typeof resultId !== 'string') {
    return false;
  }
  return true;
}

export async function fetchOCRResult(resultId: string) {
  let response: Response;

  try {
    const fetchURL = getAichUrl(AICH_APIS_TYPES.GET_INVOICE_RESULT, resultId);
    response = await fetch(fetchURL);
  } catch (error) {
    throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR_AICH_FAILED);
  }

  if (!response.ok) {
    throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR_AICH_FAILED);
  }

  return response.json() as Promise<{ payload?: unknown } | null>;
}

export async function getPayloadFromResponseJSON(
  responseJSON: Promise<{ payload?: unknown } | null>
) {
  if (!responseJSON) {
    throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR_AICH_FAILED);
  }

  let json: {
    payload?: unknown;
  } | null;

  try {
    json = await responseJSON;
  } catch (error) {
    throw new Error(STATUS_MESSAGE.PARSE_JSON_FAILED_ERROR);
  }

  // if (!json || !json.payload) {
  //   throw new Error(STATUS_MESSAGE.AICH_SUCCESSFUL_RETURN_BUT_RESULT_IS_NULL);
  // }

  const result = json?.payload ? (json.payload as IInvoice) : null;
  return result;
}

export function setOCRResultJournalId(ocrResult: IInvoice, journalId: number | null) {
  // Info: (20240522 - Murky) This function is used to set journalId to the OCR result
  const newOcrResult = {
    ...ocrResult,
    journalId,
  };

  return newOcrResult;
}

export function formatOCRResultDate(ocrResult: IInvoice) {
  // Info: (20240522 - Murky) This function is used to format the date in OCR result
  const date = timestampInSeconds(ocrResult.date);
  const newOcrResult = {
    ...ocrResult,
    date,
  };
  return newOcrResult;
}

export async function handleGetRequest(resultId: string, type: string = 'invoice') {
  let ocrResult: IInvoice | IContract | null = null;

  const isResultIdError = resultId && resultId.slice(0, 5) === 'error';
  if (resultId && resultId.length >= 0 && !isResultIdError) {
    const fetchResult = fetchOCRResult(resultId);
    switch (type) {
      case 'contract': {
        ocrResult = {} as IContract;

        break;
      }
      case 'invoice': {
        ocrResult = await getPayloadFromResponseJSON(fetchResult);
        if (ocrResult) {
          setOCRResultJournalId(ocrResult, null);
          formatOCRResultDate(ocrResult);

          if (!isIInvoice(ocrResult)) {
            // Todo: (20240822 - Anna): [Beta] feat. Murky - 使用 logger
            ocrResult = null;
          }
        }

        break;
      }
      default: {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }
    }
  }

  return ocrResult;
}
export async function handleDeleteRequest(resultId: string) {
  let payload: IOCR | null = null;
  const getOCR = await getOcrByResultId(resultId, false);

  // (20240715 - Jacky): payload should add ad unify formatter @TinyMurky
  if (getOCR) {
    const deletedOCR = await deleteOcrByResultId(resultId);
    const imageSize = transformBytesToFileSizeString(deletedOCR.imageSize);
    payload = {
      ...deletedOCR,
      progress: 0,
      imageSize,
      status: deletedOCR.status as ProgressStatus,
    };
  }

  return payload;
}

type APIReturnType = IInvoice | IContract | IOCR | null;
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<APIReturnType>>
) {
  const session = await getSession(req, res);
  const { userId, companyId } = session;
  const isAuth = await checkAuthorization([AuthFunctionsKeys.admin], { userId, companyId });
  let payload: APIReturnType = null;
  let status: string = STATUS_MESSAGE.BAD_REQUEST;

  if (isAuth) {
    try {
      const { resultId, type } = req.query;
      if (!isResultIdValid(resultId)) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }

      switch (req.method) {
        case 'GET': {
          payload = await handleGetRequest(resultId, type as string);
          status = STATUS_MESSAGE.SUCCESS;
          break;
        }
        case 'DELETE': {
          payload = await handleDeleteRequest(resultId);
          status = STATUS_MESSAGE.SUCCESS_DELETE;
          break;
        }
        default: {
          status = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
        }
      }
    } catch (_error) {
      // Todo: (20240822 - Anna): [Beta] feat. Murky - 使用 logger
      status = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
    }
  }

  const { httpCode, result } = formatApiResponse<APIReturnType>(status, payload);
  res.status(httpCode).json(result);
}
