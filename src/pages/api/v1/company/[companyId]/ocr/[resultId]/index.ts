// Info: (20240416 - Murky)  this is mock api need to migrate to microservice
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
import loggerBack, { loggerError } from '@/lib/utils/logger_back';
import { ocrTypes } from '@/constants/ocr';
import { validateRequest } from '@/lib/utils/request_validator';
import { APIName } from '@/constants/api_connection';

// Info: (20240522 - Murky) This OCR now can only be used on Invoice

export async function fetchOCRResult(resultId: string) {
  let response: Response;

  try {
    const fetchURL = getAichUrl(AICH_APIS_TYPES.GET_OCR_RESULT, resultId);
    response = await fetch(fetchURL);
  } catch (error) {
    // logger.error(error, '[ocr/:resultId]: fetchOCRResult failed from get OCR from AICH');
    throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR_AICH_FAILED);
  }

  if (!response.ok) {
    // logger.error(
    //   {
    //     aich_response: response,
    //   },
    //   '[ocr/:resultId]: fetchOCRResult failed from get OCR from AICH, response not ok'
    // );
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

  // Info: (20240809 - Murky)
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

export async function handleGetRequest(resultId: string, ocrType: ocrTypes = ocrTypes.INVOICE) {
  let ocrResult: IInvoice | IContract | null = null;

  const isResultIdError = resultId && resultId.slice(0, 5) === 'error';
  if (resultId && resultId.length >= 0 && !isResultIdError) {
    const fetchResult = fetchOCRResult(resultId);
    switch (ocrType) {
      case ocrTypes.CONTRACT: {
        ocrResult = {} as IContract;

        break;
      }
      case ocrTypes.INVOICE: {
        ocrResult = await getPayloadFromResponseJSON(fetchResult);
        if (ocrResult) {
          let newOcr: IInvoice | null = setOCRResultJournalId(ocrResult, null);
          newOcr = formatOCRResultDate(newOcr);

          if (!isIInvoice(newOcr)) {
            loggerBack.info('ocr/[resultId]: OCR result(newOcr) is not an invoice type');
            newOcr = null;
          }

          ocrResult = newOcr;
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

  // Info: (20240715 - Jacky) payload should add ad unify formatter @TinyMurky
  if (getOCR) {
    const deletedOCR = await deleteOcrByResultId(resultId);
    const imageSize = transformBytesToFileSizeString(deletedOCR.imageFile.size);
    payload = {
      id: deletedOCR.id,
      aichResultId: deletedOCR.aichResultId,
      imageName: deletedOCR.imageFile.name,
      imageUrl: deletedOCR.imageFile.url,
      createdAt: deletedOCR.createdAt,
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
      switch (req.method) {
        case 'GET': {
          const { query } = validateRequest(APIName.OCR_RESULT_GET_BY_ID, req, userId);
          if (query) {
            const { resultId, ocrType } = query;
            payload = await handleGetRequest(resultId, ocrType);
            status = STATUS_MESSAGE.SUCCESS;
          }
          break;
        }
        case 'DELETE': {
          const { query } = validateRequest(APIName.OCR_DELETE, req, userId);

          if (query) {
            const { resultId } = query;
            payload = await handleDeleteRequest(resultId);
            status = STATUS_MESSAGE.SUCCESS_DELETE;
          }
          break;
        }
        default: {
          status = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
        }
      }
    } catch (_error) {
      const logError = loggerError(userId, 'handle OCR request failed', _error as Error);
      logError.error('handle OCR request failed in handler function in ocr/[resultId]/index.ts');
      status = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
    }
  }

  const { httpCode, result } = formatApiResponse<APIReturnType>(status, payload);
  res.status(httpCode).json(result);
}
