import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import { promises as fs } from 'fs';

import { IResponseData } from '@/interfaces/response_data';
import {
  formatApiResponse,
  transformOCRImageIDToURL,
} from '@/lib/utils/common';
import { parseForm } from '@/lib/utils/parse_image_form';

import { AICH_URI } from '@/constants/config';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IAccountResultStatus } from '@/interfaces/accounting_account';
import prisma from '@/client';
import { ProgressStatus } from '@/constants/account';
import { createOcrInPrisma, createOrFindCompanyInPrisma, upsertJournalInPrisma } from '@/pages/api/v1/company/[companyId]/ocr/index.repository';

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

export async function getPayloadFromResponseJSON(responseJSON: Promise<{ payload?: unknown } | null>) {
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
      };
    })
  );

  return resultJson;
}

export async function createJournalAndOcrInPrisma(
  companyId: number,
  aichResult: {
    resultStatus: IAccountResultStatus;
    imageUrl: string;
    imageName: string;
    imageSize: number;
  }
): Promise<void> {
  // ToDo: (20240521 - Murky) companyId 要檢查是否存在該公司
  // ToDo: (20240521 - Murky) 重複的圖片一直post貌似會越來越多Journal? 目前沒有檢查重複post的狀況
  // 如果是AICH已經重複的就不建立了
  if (aichResult.resultStatus.status !== ProgressStatus.IN_PROGRESS) {
    return;
  }
  await prisma.$transaction(async () => {
    const company = await createOrFindCompanyInPrisma(companyId);
    const ocrData = await createOcrInPrisma(aichResult);
    await upsertJournalInPrisma(company.id, aichResult, ocrData.id);
  });
}

export function isCompanyIdValid(companyId: string | string[] | undefined): companyId is string {
  if (
    Array.isArray(companyId) ||
    !companyId ||
    typeof companyId !== 'string' ||
    !Number.isInteger(Number(companyId))
  ) {
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

export async function handlePostRequest(req: NextApiRequest, res: NextApiResponse) {
  const { companyId } = req.query;

  // Info Murky (20240416): Check if companyId is string
  if (!isCompanyIdValid(companyId)) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const companyIdNumber = Number(companyId);

  const files = await getImageFileFromFormData(req);

  const aichReturn = await postImageToAICH(files);

  const resultJson: IAccountResultStatus[] = [];

  await Promise.all(
    aichReturn.map(async (aichResult) => {
      await createJournalAndOcrInPrisma(companyIdNumber, aichResult);
      resultJson.push(aichResult.resultStatus);
    })
  );

  const { httpCode, result } = formatApiResponse<IAccountResultStatus[]>(
    STATUS_MESSAGE.CREATED,
    resultJson
  );

  res.status(httpCode).json(result);
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
  res: NextApiResponse<IResponseData<IAccountResultStatus[]>>
) {
  try {
    switch (req.method) {
      case 'POST': {
        await handlePostRequest(req, res);
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
