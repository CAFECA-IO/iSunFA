import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import { promises as fs } from 'fs';

import { IResponseData } from '@/interfaces/response_data';
import {
  formatApiResponse,
  generateUUID,
  timestampInSeconds,
  transformBytesToFileSizeString,
  transformOCRImageIDToURL,
} from '@/lib/utils/common';
import { parseForm } from '@/lib/utils/parse_image_form';

import { STATUS_MESSAGE } from '@/constants/status_code';
import { IAccountResultStatus } from '@/interfaces/accounting_account';
import {
  createOcrInPrisma,
  findManyOCRByCompanyIdWithoutUsedInPrisma,
} from '@/lib/utils/repo/ocr.repo';
import { IOCR } from '@/interfaces/ocr';
import type { Ocr } from '@prisma/client';
import { ProgressStatus } from '@/constants/account';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { getSession } from '@/lib/utils/session';
import { AuthFunctionsKeys } from '@/interfaces/auth';
import { FileFolder } from '@/constants/file';
import { getAichUrl } from '@/lib/utils/aich';
import { AICH_APIS_TYPES } from '@/constants/aich';

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
  const uploadUrl = getAichUrl(AICH_APIS_TYPES.UPLOAD_OCR);
  try {
    response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });
  } catch (error) {
    // Deprecated (20240611 - Murky) Debugging purpose
    // eslint-disable-next-line no-console
    console.log(error);
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
    // Deprecated (20240611 - Murky) Debugging purpose
    // eslint-disable-next-line no-console
    console.log(error);
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
  let resultJson: {
    resultStatus: IAccountResultStatus;
    imageName: string;
    imageUrl: string;
    imageSize: number;
    type: string;
  }[] = [];
  if (files && files.image && files.image.length) {
  // Info (20240504 - Murky): 圖片會先被存在本地端，然後才讀取路徑後轉傳給AICH
    resultJson = await Promise.all(
      files.image.map(async (image) => {
        const defaultResultId = "error-" + generateUUID;
        let result:{
          resultStatus: IAccountResultStatus;
          imageName: string;
          imageUrl: string;
          imageSize: number;
          type: string;
        } = {
          resultStatus: {
            status: ProgressStatus.IN_PROGRESS,
            resultId: defaultResultId,
          },
          imageUrl: '',
          imageName: '',
          imageSize: 0,
          type: 'invoice',
        };
        try {
          const imageBlob = await readImageFromFilePath(image);
          const imageName = getImageName(image);

          const fetchResult = uploadImageToAICH(imageBlob, imageName);

          const resultStatus: IAccountResultStatus = await getPayloadFromResponseJSON(fetchResult);
          const imageUrl = transformOCRImageIDToURL('invoice', 0, imageName);
          result = {
            resultStatus,
            imageUrl,
            imageName,
            imageSize: image.size,
            type: 'invoice',
          };
        } catch (error) {
          // Deprecated (20240611 - Murky) Debugging purpose
          // eslint-disable-next-line no-console
          console.log(error);
        }
        return result;
      })
    );
  } else {
    // Deprecated (20240611 - Murky) Debugging purpose
    // eslint-disable-next-line no-console
    console.log('No image file found in formidable when upload ocr');
  }

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
  let files: formidable.Files = {};

  try {
    const parsedForm = await parseForm(req, FileFolder.INVOICE);
    files = parsedForm.files;
  } catch (error) {
    // Deprecated (20240611 - Murky) Debugging purpose
    // eslint-disable-next-line no-console
    console.log(error);
  }
  return files;
}

export async function fetchStatus(aichResultId: string) {
  let status: ProgressStatus = ProgressStatus.SYSTEM_ERROR;

  if (aichResultId.length > 0) {
    try {
      const fetchUrl = getAichUrl(AICH_APIS_TYPES.GET_OCR_RESULT_ID, aichResultId);
      const result = await fetch(fetchUrl);

      if (!result.ok) {
        throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR_AICH_FAILED);
      }

      status = (await result.json()).payload;
    } catch (error) {
      // Deprecated (20240611 - Murky) Debugging purpose
      // eslint-disable-next-line no-console
      console.log(error);
      throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR_AICH_FAILED);
    }
  }

  return status;
}

// Deprecated (20240809 - Murky) This function is not used
// export function calculateProgress(createdAt: number, status: ProgressStatus) {
//   const currentTime = new Date();
//   const diffTime = currentTime.getTime() - timestampInMilliSeconds(createdAt);
//   let process = Math.ceil((diffTime / AVERAGE_OCR_PROCESSING_TIME) * 100);

//   if (process > 99) {
//     process = 99;
//   }

//   if (status === ProgressStatus.SUCCESS) {
//     process = 100;
//   } else if (status !== ProgressStatus.IN_PROGRESS) {
//     process = 0;
//   }
//   return process;
// }

export function calculateProgress(imageUrl?: string | null) {
  return (imageUrl && imageUrl.length > 0) ? 100 : 0;
}

export async function formatUnprocessedOCR(ocrData: Ocr[]): Promise<IOCR[]> {
  const unprocessedOCRs = await Promise.all(
    ocrData.map(async (ocr) => {
      const status = await fetchStatus(ocr.aichResultId);
      // const progress = calculateProgress(ocr.createdAt, status);
      const progress = calculateProgress(ocr.imageUrl);
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
    // Deprecated (20240611 - Murky) Debugging purpose
    // eslint-disable-next-line no-console
    console.log(error);
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }
  return resultJson;
}

export async function handlePostRequest(companyId: number, req: NextApiRequest) {
  let resultJson: IAccountResultStatus[] = [];

  try {
    const files = await getImageFileFromFormData(req);
    const aichResults = await postImageToAICH(files);
    // Deprecated (20240611 - Murky) This function is not used
    // resultJson = await createJournalsAndOcrFromAichResults(companyIdNumber, aichResults);
    resultJson = await createOcrFromAichResults(companyId, aichResults);
  } catch (error) {
    // Deprecated (20240611 - Murky) Debugging purpose
    // eslint-disable-next-line no-console
    console.error(error);
  }

  return resultJson;
}

export async function handleGetRequest(companyId: number, req: NextApiRequest) {
  // ToDo: (20240611 - Murky) check companyId is valid
  // Info Murky (20240416): Check if companyId is string
  const { ocrType } = req.query;

  let ocrData: Ocr[];

  try {
    ocrData = await findManyOCRByCompanyIdWithoutUsedInPrisma(companyId, ocrType as string);
  } catch (error) {
    // Deprecated (20240611 - Murky) Debugging purpose
    // eslint-disable-next-line no-console
    console.log(error);
    throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR);
  }

  // ToDo: (20240611 - Murky) format prisma ocr to IOCR
  const unprocessedOCRs = await formatUnprocessedOCR(ocrData);

  return unprocessedOCRs;
}

type ApiReturnType = IAccountResultStatus[] | IOCR[];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ApiReturnType>>
) {
  const session = await getSession(req, res);
  const { userId, companyId } = session;
  const isAuth = await checkAuthorization([AuthFunctionsKeys.admin], { userId, companyId });

  let payload: ApiReturnType = [];
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;

  if (isAuth) {
    try {
      switch (req.method) {
        case 'GET': {
          payload = await handleGetRequest(companyId, req);
          statusMessage = STATUS_MESSAGE.SUCCESS;
          break;
        }
        case 'POST': {
          payload = await handlePostRequest(companyId, req);
          statusMessage = STATUS_MESSAGE.CREATED;
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
    }
  }

  const { httpCode, result } = formatApiResponse<ApiReturnType>(statusMessage, payload);
  res.status(httpCode).json(result);
}
