import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import { promises as fs } from 'fs';

import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse, transformOCRImageIDToURL } from '@/lib/utils/common';
import { parseForm } from '@/lib/utils/parse_image_form';
import prisma from '@/client';

import { AICH_URI } from '@/constants/config';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IAccountResultStatus } from '@/interfaces/accounting_account';
import { ProgressStatus } from '@/constants/account';

// Info Murky (20240424) 要使用formidable要先關掉bodyParsor
export const config = {
  api: {
    bodyParser: false,
  },
};

// Info (20240521-Murky) 回傳目前還是array 的型態，因為可能會有多張圖片一起上傳
// 上傳圖片的時候把每個圖片的欄位名稱都叫做"image" 就可以了
async function postImageToAICH(files: formidable.Files): Promise<
  {
    resultStatus: IAccountResultStatus;
    imageName: string;
    imageUrl: string;
    imageSize: number;
  }[]
> {
  if (!files || !files.image || !files.image.length) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_FORMDATA_IMAGE);
  }
  // Info (20240504 - Murky): 圖片會先被存在本地端，然後才讀取路徑後轉傳給AICH
  const resultJson = await Promise.all(
    files.image.map(async (image) => {
      const imageContent = await fs.readFile(image.filepath);
      const imageBlob = new Blob([imageContent], { type: image.mimetype || undefined });
      const imageName = image.filepath.split('/').pop() || 'unknown';

      const formData = new FormData();
      formData.append('image', imageBlob);
      formData.append('imageName', imageName);

      let fetchResult: Response;
      try {
        fetchResult = await fetch(`${AICH_URI}/api/v1/ocr/upload`, {
          method: 'POST',
          body: formData,
        });
      } catch (error) {
        throw new Error(STATUS_MESSAGE.BAD_GATEWAY_AICH_FAILED);
      }

      if (!fetchResult.ok) {
        throw new Error(STATUS_MESSAGE.BAD_GATEWAY_AICH_FAILED);
      }

      const resultStatus: IAccountResultStatus = (await fetchResult.json()).payload;
      return {
        resultStatus,
        imageUrl: transformOCRImageIDToURL('invoice', imageName),
        imageName,
        imageSize: image.size,
      };
    })
  );

  return resultJson;
}

async function createJournalAndOcrInPrisma(
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
  try {
    // 如果是AICH已經重複的就不建立了
    if (aichResult.resultStatus.status !== ProgressStatus.IN_PROGRESS) {
      return;
    }
    await prisma.$transaction(async () => {
      let company = await prisma.company.findUnique({
        where: {
          id: companyId,
        },
        select: {
          id: true,
        },
      });

      // Depreciate (20240521 - Murky) This is for demo purpose
      if (!company) {
        company = await prisma.company.create({
          data: {
            id: companyId,
            code: 'COMP123',
            name: 'Company Name',
            regional: 'Regional Name',
          },
          select: {
            id: true,
          },
        });
      }

      const ocrData = await prisma.ocr.create({
        data: {
          imageName: aichResult.imageName,
          imageUrl: aichResult.imageUrl,
          imageSize: aichResult.imageSize,
        },
      });
      await prisma.journal.upsert({
        where: {
          aichResultId: aichResult.resultStatus.resultId,
        },
        create: {
          companyId: company.id,
          ocrId: ocrData.id,
          aichResultId: aichResult.resultStatus.resultId,
        },
        update: {
          ocrId: ocrData.id,
        },
      });
    });
  } catch (error) {
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAccountResultStatus[]>>
) {
  try {
    switch (req.method) {
      case 'POST': {
        const { companyId } = req.query;

        // Info Murky (20240416): Check if companyId is string
        if (
          Array.isArray(companyId) ||
          !companyId ||
          typeof companyId !== 'string' ||
          !Number.isInteger(Number(companyId))
        ) {
          throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
        }

        const companyIdNumber = Number(companyId);

        let files: formidable.Files;

        try {
          const parsedForm = await parseForm(req);
          files = parsedForm.files;
        } catch (error) {
          throw new Error(STATUS_MESSAGE.IMAGE_UPLOAD_FAILED_ERROR);
        }

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

        break;
      }
      default: {
        throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
      }
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IAccountResultStatus[]>(error.message, []);
    res.status(httpCode).json(result);
  }
}
