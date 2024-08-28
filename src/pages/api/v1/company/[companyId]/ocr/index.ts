import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import { promises as fs } from 'fs';

import { IResponseData } from '@/interfaces/response_data';
import {
  formatApiResponse,
  generateUUID,
  timestampInMilliSeconds,
  timestampInSeconds,
  transformBytesToFileSizeString,
  transformFileSizeStringToBytes,
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
import { AVERAGE_OCR_PROCESSING_TIME } from '@/constants/ocr';
import logger from '@/lib/utils/logger';

// Info: (20240424 - Murky) 要使用formidable要先關掉bodyParser
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

  let response: Response | undefined;
  const uploadUrl = getAichUrl(AICH_APIS_TYPES.UPLOAD_OCR);
  try {
    response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });
  } catch (error) {
    logger.error(error, 'Ocr uploadImageToAICH error, happen when POST AICH API');
  }

  if (!response || !response.ok) {
    logger.info(
      {
        aich_response: response,
      },
      'Ocr uploadImageToAICH response is not ok'
    );
    throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR_AICH_FAILED);
  }

  return response.json() as Promise<{ payload?: unknown } | null>;
}

export async function getPayloadFromResponseJSON(
  responseJSON: Promise<{ payload?: unknown } | null>
) {
  if (!responseJSON) {
    logger.info(
      {
        responseJSON,
      },
      'Ocr getPayloadFromResponseJSON responseJSON is null'
    );
    throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR_AICH_FAILED);
  }

  let json: {
    payload?: unknown;
  } | null;

  try {
    json = await responseJSON;
  } catch (error) {
    logger.error(
      error,
      'Ocr getPayloadFromResponseJSON error, happen when parse responseJSON from AICH API'
    );
    throw new Error(STATUS_MESSAGE.PARSE_JSON_FAILED_ERROR);
  }

  if (!json || !json.payload) {
    logger.info(
      {
        aich_response: json,
      },
      'Ocr getPayloadFromResponseJSON response is not json, or json do not have payload'
    );
    throw new Error(STATUS_MESSAGE.AICH_SUCCESSFUL_RETURN_BUT_RESULT_IS_NULL);
  }

  return json.payload as IAccountResultStatus;
}

// Info: (20240521 - Murky) 回傳目前還是 array 的型態，因為可能會有多張圖片一起上傳
// 上傳圖片的時候把每個圖片的欄位名稱都叫做"image" 就可以了
export async function postImageToAICH(
  files: formidable.Files,
  imageFields: {
    imageSize: number;
    imageName: string;
    uploadIdentifier: string;
  }[]
): Promise<
  {
    resultStatus: IAccountResultStatus;
    imageName: string;
    imageUrl: string;
    imageSize: number;
    type: string;
    uploadIdentifier: string;
  }[]
> {
  let resultJson: {
    resultStatus: IAccountResultStatus;
    imageName: string;
    imageUrl: string;
    imageSize: number;
    type: string;
    uploadIdentifier: string;
  }[] = [];
  if (files && files.image && files.image.length) {
    // Info: (20240504 - Murky) 圖片會先被存在本地端，然後才讀取路徑後轉傳給 AICH
    resultJson = await Promise.all(
      files.image.map(async (image, index) => {
        const imageFieldsLength = imageFields.length;
        const isIndexValid = index < imageFieldsLength;

        // Info: (20240816 - Murky) 壞檔的 Image 會被標上特殊的 resultId
        const defaultResultId = 'error-' + generateUUID();
        let result: {
          resultStatus: IAccountResultStatus;
          imageName: string;
          imageUrl: string;
          imageSize: number;
          type: string;
          uploadIdentifier: string;
        } = {
          resultStatus: {
            status: ProgressStatus.IN_PROGRESS,
            resultId: defaultResultId,
          },
          imageUrl: '',
          imageName: '',
          imageSize: 0,
          type: 'invoice',
          uploadIdentifier: '',
        };
        try {
          const imageBlob = await readImageFromFilePath(image);

          const imageNameInLocal = getImageName(image);
          const imageName = isIndexValid ? imageFields[index].imageName : imageNameInLocal;
          const imageSize = isIndexValid ? imageFields[index].imageSize : image.size;

          const fetchResult = uploadImageToAICH(imageBlob, imageName);

          const resultStatus: IAccountResultStatus = await getPayloadFromResponseJSON(fetchResult);
          const imageUrl = transformOCRImageIDToURL('invoice', 0, imageNameInLocal);
          result = {
            resultStatus,
            imageUrl,
            imageName,
            imageSize,
            type: 'invoice',
            uploadIdentifier: isIndexValid ? imageFields[index].uploadIdentifier : '',
          };
        } catch (error) {
          // Todo: (20240822 - Anna): [Beta] feat. Murky - 使用 logger
          logger.error(error, 'Ocr postImageToAICH error, happen when POST Image to AICH API');
        }
        return result;
      })
    );
  } else {
    // Todo: (20240822 - Anna): [Beta] feat. Murky - 使用 logger
    logger.info(
      {
        files,
      },
      'Ocr postImageToAICH files.image is null or files.image.length is 0'
    );
  }

  return resultJson;
}

export function extractDataFromFields(fields: formidable.Fields) {
  const { imageSize, imageName, uploadIdentifier } = fields;

  const imageFieldsArray: {
    imageSize: number;
    imageName: string;
    uploadIdentifier: string;
  }[] = [];

  if (
    imageSize &&
    imageSize.length &&
    imageName &&
    imageName.length &&
    uploadIdentifier &&
    uploadIdentifier.length &&
    imageSize.length === imageName.length &&
    imageSize.length === uploadIdentifier.length
  ) {
    imageSize.forEach((size, index) => {
      imageFieldsArray.push({
        imageSize: transformFileSizeStringToBytes(size),
        imageName: imageName[index],
        uploadIdentifier: uploadIdentifier[index],
      });
    });
  }

  // Info: (20240815 - Murky) imageSize is string
  return imageFieldsArray;
}

export async function getImageFileAndFormFromFormData(req: NextApiRequest) {
  let files: formidable.Files = {};
  let fields: formidable.Fields = {};

  try {
    const parsedForm = await parseForm(req, FileFolder.INVOICE);

    files = parsedForm.files;
    fields = parsedForm.fields;
  } catch (error) {
    // Todo: (20240822 - Anna): [Beta] feat. Murky - 使用 logger
    logger.error(error, 'Ocr getImageFileAndFormFromFormData error, happen when parse form data');
  }
  return {
    files,
    fields,
  };
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
      // Todo: (20240822 - Anna): [Beta] feat. Murky - 使用 logger
      logger.error(error, 'Ocr fetchStatus error, happen when fetch AICH API');
      throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR_AICH_FAILED);
    }
  }

  return status;
}

// Deprecated: (20240809 - Murky) This function is not used
export function calculateProgress(createdAt: number, status: ProgressStatus, ocrResultId: string) {
  const currentTime = new Date();
  const diffTime = currentTime.getTime() - timestampInMilliSeconds(createdAt);
  let process = Math.ceil((diffTime / AVERAGE_OCR_PROCESSING_TIME) * 100);

  if (process > 99) {
    process = 99;
  }

  const errorRegexp = /error/i;

  if (errorRegexp.test(ocrResultId)) {
    process = 0;
  } else if (status !== ProgressStatus.IN_PROGRESS) {
    process = 100;
  }
  return process;
}

export async function formatUnprocessedOCR(ocrData: Ocr[]): Promise<IOCR[]> {
  const unprocessedOCRs = await Promise.all(
    ocrData.map(async (ocr) => {
      const status = await fetchStatus(ocr.aichResultId);
      const progress = calculateProgress(ocr.createdAt, status, ocr.aichResultId);
      // const progress = calculateProgress(ocr.imageUrl);
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
    uploadIdentifier: string;
  }[]
) {
  const resultJson: IOCR[] = [];
  const ocrData: (Ocr | null)[] = [];

  try {
    await Promise.all(
      aichResults.map(async (aichResult) => {
        const ocr = await createOcrInPrisma(companyId, aichResult);
        ocrData.push(ocr);
      })
    );
  } catch (error) {
    // Todo: (20240822 - Anna): [Beta] feat. Murky - 使用 logger
    logger.error(error, 'Ocr createOcrFromAichResults error, happen when create Ocr in Prisma');
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }

  aichResults.forEach((aichResult, index) => {
    const ocr = ocrData[index];
    if (ocr) {
      const imageSize = transformBytesToFileSizeString(aichResult.imageSize);
      const createdAt = timestampInSeconds(ocr.createdAt);
      const unprocessedOCR: IOCR = {
        id: ocr.id,
        aichResultId: ocr.aichResultId,
        imageUrl: aichResult.imageUrl,
        imageName: aichResult.imageName,
        imageSize,
        status: ProgressStatus.IN_PROGRESS,
        progress: 0,
        createdAt,
        uploadIdentifier: aichResult.uploadIdentifier,
      };

      resultJson.push(unprocessedOCR);
    }
  });

  return resultJson;
}

export async function handlePostRequest(companyId: number, req: NextApiRequest) {
  let resultJson: IOCR[] = [];
  let statusMessage: string = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  try {
    const { files, fields } = await getImageFileAndFormFromFormData(req);
    const imageFieldsArray = extractDataFromFields(fields);
    const aichResults = await postImageToAICH(files, imageFieldsArray);
    // Deprecated: (20240611 - Murky) This function is not used
    // resultJson = await createJournalsAndOcrFromAichResults(companyIdNumber, aichResults);
    resultJson = await createOcrFromAichResults(companyId, aichResults);
    statusMessage = STATUS_MESSAGE.CREATED;
  } catch (error) {
    // Todo: (20240822 - Anna): [Beta] feat. Murky - 使用 logger
    logger.error(error, 'Ocr handlePostRequest error, happen when POST Image to AICH API');
  }

  return {
    resultJson,
    statusMessage,
  };
}

export async function handleGetRequest(companyId: number, req: NextApiRequest) {
  // Info Murky (20240416): Check if companyId is string
  const { ocrType } = req.query;

  let ocrData: Ocr[];

  try {
    ocrData = await findManyOCRByCompanyIdWithoutUsedInPrisma(companyId, ocrType as string);
  } catch (error) {
    // Todo: (20240822 - Anna): [Beta] feat. Murky - 使用 logger
    logger.error(
      error,
      'Ocr handleGetRequest error, happen when findManyOCRByCompanyIdWithoutUsedInPrisma'
    );
    throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR);
  }

  const unprocessedOCRs = await formatUnprocessedOCR(ocrData);

  return unprocessedOCRs;
}

type ApiReturnType = IOCR[];

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
          const result = await handlePostRequest(companyId, req);

          payload = result.resultJson;
          statusMessage = result.statusMessage;
          break;
        }
        default: {
          logger.info(
            {
              method: req.method,
            },
            'Ocr handler method is not allowed'
          );
          throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
        }
      }
    } catch (_error) {
      // Todo: (20240822 - Anna): [Beta] feat. Murky - 使用 logger
      logger.error(_error, 'Ocr handler error');
    }
  } else {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
    logger.info(
      {
        userId,
        companyId,
        isAuth,
      },
      'Ocr handler is not authorized'
    );
  }

  const { httpCode, result } = formatApiResponse<ApiReturnType>(statusMessage, payload);
  res.status(httpCode).json(result);
}
