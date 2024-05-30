import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import { promises as fs } from 'fs';

import { IResponseData } from '@/interfaces/response_data';
import {
  formatApiResponse,
  timestampInSeconds,
  transformOCRImageIDToURL,
} from '@/lib/utils/common';
import { parseForm } from '@/lib/utils/parse_image_form';
import prisma from '@/client';

import { AICH_URI } from '@/constants/config';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IAccountResultStatus } from '@/interfaces/accounting_account';
import { ProgressStatus } from '@/constants/account';

// Info Murky (20240424) 要使用formidable要先關掉bodyParser
export const config = {
  api: {
    bodyParser: false,
  },
};

export async function _readImageFromFilePath(image: formidable.File): Promise<Blob> {
  const imageContent = await fs.readFile(image.filepath);
  return new Blob([imageContent], { type: image.mimetype || undefined });
}

export function _getImageName(image: formidable.File) {
  return image.filepath.split('/').pop() || 'unknown';
}

export function _createImageFormData(imageBlob: Blob, imageName: string) {
  const formData = new FormData();
  formData.append('image', imageBlob);
  formData.append('imageName', imageName);
  return formData;
}

export async function _uploadImageToAICH(imageBlob: Blob, imageName: string) {
  const formData = _createImageFormData(imageBlob, imageName);

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

export async function _getPayloadFromResponseJSON(responseJSON: Promise<{ payload?: unknown } | null>) {
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
async function _postImageToAICH(files: formidable.Files): Promise<
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
      const imageBlob = await _readImageFromFilePath(image);
      const imageName = _getImageName(image);

      const fetchResult = _uploadImageToAICH(imageBlob, imageName);

      const resultStatus: IAccountResultStatus = await _getPayloadFromResponseJSON(fetchResult);
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

async function _createOrFindCompanyInPrisma(companyId: number) {
  let company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true },
  });

  if (!company) {
    try {
      const now = Date.now();
      const currentTimestamp = timestampInSeconds(now);
      company = await prisma.company.create({
        data: {
          id: companyId,
          code: 'TEST_OCR',
          name: 'Company Name',
          regional: 'Regional Name',
          startDate: currentTimestamp,
          createdAt: currentTimestamp,
          updatedAt: currentTimestamp,
        },
        select: { id: true },
      });
    } catch (error) {
      throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
    }
  }

  return company;
}

async function _createOcrInPrisma(aichResult: {
  resultStatus: IAccountResultStatus;
  imageUrl: string;
  imageName: string;
  imageSize: number;
}) {
  try {
    const ocrData = await prisma.ocr.create({
      data: {
        imageName: aichResult.imageName,
        imageUrl: aichResult.imageUrl,
        imageSize: aichResult.imageSize,
        status: aichResult.resultStatus.status,
      },
    });

    return ocrData;
  } catch (error) {
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }
}

async function _upsertJournalInPrisma(
  companyId: number,
  aichResult: {
    resultStatus: IAccountResultStatus;
    imageUrl: string;
    imageName: string;
    imageSize: number;
  },
  ocrId: number
) {
  try {
    await prisma.journal.upsert({
      where: {
        aichResultId: aichResult.resultStatus.resultId,
      },
      create: {
        companyId,
        ocrId,
        aichResultId: aichResult.resultStatus.resultId,
      },
      update: {
        ocrId,
      },
    });
  } catch (error) {
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }
}

async function _createJournalAndOcrInPrisma(
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
    const company = await _createOrFindCompanyInPrisma(companyId);
    const ocrData = await _createOcrInPrisma(aichResult);
    await _upsertJournalInPrisma(company.id, aichResult, ocrData.id);
  });
}

function isCompanyIdValid(companyId: string | string[] | undefined): companyId is string {
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

async function _getImageFileFromFormData(req: NextApiRequest) {
  let files: formidable.Files;

  try {
    const parsedForm = await parseForm(req);
    files = parsedForm.files;
  } catch (error) {
    throw new Error(STATUS_MESSAGE.IMAGE_UPLOAD_FAILED_ERROR);
  }
  return files;
}

async function _handlePostRequest(req: NextApiRequest, res: NextApiResponse) {
  const { companyId } = req.query;

  // Info Murky (20240416): Check if companyId is string
  if (!isCompanyIdValid(companyId)) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const companyIdNumber = Number(companyId);

  const files = await _getImageFileFromFormData(req);

  const aichReturn = await _postImageToAICH(files);

  const resultJson: IAccountResultStatus[] = [];

  await Promise.all(
    aichReturn.map(async (aichResult) => {
      await _createJournalAndOcrInPrisma(companyIdNumber, aichResult);
      resultJson.push(aichResult.resultStatus);
    })
  );

  const { httpCode, result } = formatApiResponse<IAccountResultStatus[]>(
    STATUS_MESSAGE.CREATED,
    resultJson
  );

  res.status(httpCode).json(result);
}

function _handleErrorResponse(res: NextApiResponse, message: string) {
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
        await _handlePostRequest(req, res);
        break;
      }
      default: {
        throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
      }
    }
  } catch (_error) {
    const error = _error as Error;
    _handleErrorResponse(res, error.message);
  }
}
