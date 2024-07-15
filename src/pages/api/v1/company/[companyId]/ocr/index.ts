import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import { promises as fs } from 'fs';

import { IResponseData } from '@/interfaces/response_data';
import {
  formatApiResponse,
  timestampInMilliSeconds,
  timestampInSeconds,
  transformBytesToFileSizeString,
  transformOCRImageIDToURL,
} from '@/lib/utils/common';
import { parseForm } from '@/lib/utils/parse_image_form';

import { AICH_URI } from '@/constants/config';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IAccountResultStatus } from '@/interfaces/accounting_account';
import {
  createOcrInPrisma,
  findManyOCRByCompanyIdWithoutUsedInPrisma,
} from '@/lib/utils/repo/ocr.repo';
import { IOCR } from '@/interfaces/ocr';
import type { Ocr } from '@prisma/client';
import { ProgressStatus } from '@/constants/account';
import { AVERAGE_OCR_PROCESSING_TIME } from '@/constants/ocr';
import { checkAdmin } from '@/lib/utils/auth_check';

// Info Murky (20240424) 要使用formidable要先關掉bodyParser
export const config = {
  api: {
    bodyParser: false,
  },
};

export async function readImageFromFilePath(image: formidable.File): Promise<Blob> {
  const imageContent = await fs.readFile(image.filepath);
  return new Blob([imageContent], { type: image.mimetype || undefined });
}

export function getImageName(image: formidable.File) {
  return image.filepath.split('/').pop() || 'unknown';
}

export function createImageFormData(imageBlob: Blob, imageName: string) {
  const formData = new FormData();
  formData.append('image', imageBlob);
  formData.append('imageName', imageName);
  return formData;
}

export async function uploadImageToAICH(imageBlob: Blob, imageName: string) {
  const formData = createImageFormData(imageBlob, imageName);

  let response: Response;
  try {
    response = await fetch(`${AICH_URI}/api/v1/ocr/upload`, {
      method: 'POST',
      body: formData,
    });
  } catch (error) {
    throw new Error(STATUS_MESSAGE.BAD_GATEWAY_AICH_FAILED);
  }

  if (!response.ok) {
    throw new Error(STATUS_MESSAGE.BAD_GATEWAY_AICH_FAILED);
  }

  return response.json() as Promise<{ payload?: unknown } | null>;
}

export async function getPayloadFromResponseJSON(
  responseJSON: Promise<{ payload?: unknown } | null>
) {
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

  return json.payload as IAccountResultStatus;
}

// Info (20240521-Murky) 回傳目前還是array 的型態，因為可能會有多張圖片一起上傳
// 上傳圖片的時候把每個圖片的欄位名稱都叫做"image" 就可以了
export async function postImageToAICH(files: formidable.Files): Promise<
  {
    resultStatus: IAccountResultStatus;
    imageName: string;
    imageUrl: string;
    imageSize: number;
    type: string;
  }[]
> {
  if (!files || !files.image || !files.image.length) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_FORM_DATA_IMAGE);
  }

  // Info (20240504 - Murky): 圖片會先被存在本地端，然後才讀取路徑後轉傳給AICH
  const resultJson = await Promise.all(
    files.image.map(async (image) => {
      const imageBlob = await readImageFromFilePath(image);
      const imageName = getImageName(image);

      const fetchResult = uploadImageToAICH(imageBlob, imageName);

      const resultStatus: IAccountResultStatus = await getPayloadFromResponseJSON(fetchResult);
      const imageUrl = transformOCRImageIDToURL('invoice', 0, imageName);
      return {
        resultStatus,
        imageUrl,
        imageName,
        imageSize: image.size,
        type: 'invoice',
      };
    })
  );

  return resultJson;
}

// ToDo: (20240617 - Murky) Need to use function in type guard instead
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isCompanyIdValid(companyId: any): companyId is number {
  if (Array.isArray(companyId) || !companyId || typeof companyId !== 'number') {
    return false;
  }
  return true;
}

export async function getImageFileFromFormData(req: NextApiRequest) {
  let files: formidable.Files;

  try {
    const parsedForm = await parseForm(req);
    files = parsedForm.files;
  } catch (error) {
    throw new Error(STATUS_MESSAGE.IMAGE_UPLOAD_FAILED_ERROR);
  }
  return files;
}

export async function fetchStatus(aichResultId: string) {
  try {
    const result = await fetch(`${AICH_URI}/api/v1/ocr/${aichResultId}/process_status`);

    if (!result.ok) {
      throw new Error(STATUS_MESSAGE.BAD_GATEWAY_AICH_FAILED);
    }

    const status: ProgressStatus = (await result.json()).payload;
    return status;
  } catch (error) {
    throw new Error(STATUS_MESSAGE.BAD_GATEWAY_AICH_FAILED);
  }
}

export function calculateProgress(createdAt: number, status: ProgressStatus) {
  const currentTime = new Date();
  const diffTime = currentTime.getTime() - timestampInMilliSeconds(createdAt);
  let process = Math.ceil((diffTime / AVERAGE_OCR_PROCESSING_TIME) * 100);

  if (process > 99) {
    process = 99;
  }

  if (status === ProgressStatus.SUCCESS) {
    process = 100;
  } else if (status !== ProgressStatus.IN_PROGRESS) {
    process = 0;
  }
  return process;
}

export async function formatUnprocessedOCR(ocrData: Ocr[]): Promise<IOCR[]> {
  const unprocessedOCRs = await Promise.all(
    ocrData.map(async (ocr) => {
      const status = await fetchStatus(ocr.aichResultId);
      const progress = calculateProgress(ocr.createdAt, status);
      const imageSize = transformBytesToFileSizeString(ocr.imageSize);
      const createdAt = timestampInSeconds(ocr.createdAt);
      const unprocessedOCR: IOCR = {
        id: ocr.id,
        aichResultId: ocr.aichResultId,
        imageUrl: ocr.imageUrl,
        imageName: ocr.imageName,
        imageSize,
        status,
        progress,
        createdAt,
      };

      return unprocessedOCR;
    })
  );
  return unprocessedOCRs;
}

export async function createOcrFromAichResults(
  companyId: number,
  aichResults: {
    resultStatus: IAccountResultStatus;
    imageUrl: string;
    imageName: string;
    imageSize: number;
    type: string;
  }[]
) {
  const resultJson: IAccountResultStatus[] = [];

  try {
    await Promise.all(
      aichResults.map(async (aichResult) => {
        await createOcrInPrisma(companyId, aichResult);
        resultJson.push(aichResult.resultStatus);
      })
    );
  } catch (error) {
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }
  return resultJson;
}

export async function handlePostRequest(req: NextApiRequest, res: NextApiResponse) {
  const session = await checkAdmin(req, res);
  const { companyId } = session;

  // Info Murky (20240416): Check if companyId is string
  if (!isCompanyIdValid(companyId)) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  // Deprecated (20240611 - Murky) This convert is not needed
  const companyIdNumber = Number(companyId);

  let resultJson: IAccountResultStatus[];

  try {
    const files = await getImageFileFromFormData(req);
    const aichResults = await postImageToAICH(files);
    // Deprecated (20240611 - Murky) This function is not used
    // resultJson = await createJournalsAndOcrFromAichResults(companyIdNumber, aichResults);
    resultJson = await createOcrFromAichResults(companyIdNumber, aichResults);
  } catch (error) {
    // Deprecated (20240611 - Murky) Debugging purpose
    // eslint-disable-next-line no-console
    console.error(error);
    throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR);
  }

  const { httpCode, result } = formatApiResponse<IAccountResultStatus[]>(
    STATUS_MESSAGE.CREATED,
    resultJson
  );
  return {
    httpCode,
    result,
  };
}

export async function handleGetRequest(req: NextApiRequest, res: NextApiResponse) {
  // ToDo: (20240611 - Murky) check companyId is valid
  // Info Murky (20240416): Check if companyId is string
  const session = await checkAdmin(req, res);
  const { companyId } = session;
  const { ocrtype } = req.query;
  if (!isCompanyIdValid(companyId)) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  // Deprecated (20240611 - Murky) This convert is not needed
  const companyIdNumber = Number(companyId);

  // ToDo: (20240611 - Murky) GET ocr by companyId in Journal from prisma

  let ocrData: Ocr[];

  try {
    ocrData = await findManyOCRByCompanyIdWithoutUsedInPrisma(companyIdNumber, ocrtype as string);
  } catch (error) {
    // Deprecated (20240611 - Murky) Debugging purpose
    // eslint-disable-next-line no-console
    throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR);
  }

  // ToDo: (20240611 - Murky) format prisma ocr to IOCR
  const unprocessedOCRs = await formatUnprocessedOCR(ocrData);
  // ToDo: formatApiResponse
  const { httpCode, result } = formatApiResponse<IOCR[]>(
    STATUS_MESSAGE.SUCCESS_GET,
    unprocessedOCRs
  );
  return {
    httpCode,
    result,
  };
}

function handleErrorResponse(res: NextApiResponse, message: string) {
  const { httpCode, result } = formatApiResponse<IAccountResultStatus[]>(
    message,
    {} as IAccountResultStatus[]
  );
  res.status(httpCode).json(result);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAccountResultStatus[] | IOCR[]>>
) {
  try {
    switch (req.method) {
      case 'GET': {
        const { httpCode, result } = await handleGetRequest(req, res);
        res.status(httpCode).json(result);
        break;
      }
      case 'POST': {
        const { httpCode, result } = await handlePostRequest(req, res);
        res.status(httpCode).json(result);
        break;
      }
      default: {
        throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
      }
    }
  } catch (_error) {
    const error = _error as Error;
    // Deprecated (20240611 - Murky) Debugging purpose
    // eslint-disable-next-line no-console
    console.error(error);
    handleErrorResponse(res, error.message);
  }
}
