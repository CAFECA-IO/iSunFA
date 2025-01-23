import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
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
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IAccountResultStatus } from '@/interfaces/accounting_account';
import {
  createOcrInPrisma,
  findManyOCRByCompanyIdWithoutUsedInPrisma,
} from '@/lib/utils/repo/ocr.repo';
import { IOCR, ocrIncludeFile } from '@/interfaces/ocr';
import { ProgressStatus } from '@/constants/account';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { getSession } from '@/lib/utils/session';
import { AuthFunctionsKeys } from '@/interfaces/auth';
import { FileFolder, getFileFolder } from '@/constants/file';
import { getAichUrl } from '@/lib/utils/aich';
import { AICH_APIS_TYPES } from '@/constants/aich';
import { AVERAGE_OCR_PROCESSING_TIME, ocrTypes } from '@/constants/ocr';
import loggerBack, { loggerError } from '@/lib/utils/logger_back';
import { bufferToBlob, findFileByName, readFile } from '@/lib/utils/parse_image_form';
import { findFileById } from '@/lib/utils/repo/file.repo';
import { decryptImageFile, parseFilePathWithBaseUrlPlaceholder } from '@/lib/utils/file';
import { validateRequest } from '@/lib/utils/validator';
import { APIName } from '@/constants/api_connection';
import { DefaultValue } from '@/constants/default_value';

export async function readImageFromFilePath(
  fileName: string,
  fileMimeTypes: string
): Promise<Blob> {
  const fileFolder = getFileFolder(FileFolder.INVOICE);
  const filePath = await findFileByName(fileFolder, fileName);

  if (!filePath) {
    loggerBack.info(
      {
        fileName,
      },
      'Ocr readImageFromFilePath filePath is null'
    );
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }

  const fileBuffer = await readFile(filePath);

  if (!fileBuffer) {
    loggerBack.info(
      {
        fileName,
      },
      'Ocr readImageFromFilePath fileBuffer is null'
    );
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }
  const fileBlob = bufferToBlob(fileBuffer, fileMimeTypes);
  return fileBlob;
}

export function getImageName(filePath: string) {
  return filePath.split('/').pop() || 'unknown';
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
  const uploadUrl = getAichUrl(AICH_APIS_TYPES.UPLOAD_INVOICE);
  try {
    response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'upload image to AICH failed',
      errorMessage: (error as Error).message,
    });
  }

  if (!response || !response.ok) {
    loggerBack.info(
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
    loggerBack.info(
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
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'get payload from response JSON failed',
      errorMessage: (error as Error).message,
    });
    throw new Error(STATUS_MESSAGE.PARSE_JSON_FAILED_ERROR);
  }

  if (!json || !json.payload) {
    loggerBack.info(
      {
        aich_response: json,
      },
      'Ocr getPayloadFromResponseJSON response is not json, or json do not have payload'
    );
    throw new Error(STATUS_MESSAGE.AICH_SUCCESSFUL_RETURN_BUT_RESULT_IS_NULL);
  }

  return json.payload as IAccountResultStatus;
}

async function readFileFromLocalUrl(url: string): Promise<Buffer> {
  const filePath = parseFilePathWithBaseUrlPlaceholder(url);

  const fileBuffer = await readFile(filePath);
  if (!fileBuffer) {
    loggerBack.info(
      `Error in reading image file from local url in OCR (but image existed), Url : ${url}`
    );
    throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR);
  }
  return fileBuffer;
}

// Info: (20240521 - Murky) 回傳目前還是 array 的型態，因為可能會有多張圖片一起上傳
// 上傳圖片的時候把每個圖片的欄位名稱都叫做"image" 就可以了
type postAICHReturnType = {
  resultStatus: IAccountResultStatus;
  fileId: number;
  type: string;
  uploadIdentifier: string;
};
export async function postImageToAICH(
  companyId: number,
  fileId: number,
  uploadIdentifier: string
): Promise<postAICHReturnType[]> {
  const resultJson: postAICHReturnType[] = [];

  const defaultResultId = 'error-' + generateUUID();
  let result: postAICHReturnType = {
    resultStatus: {
      status: ProgressStatus.IN_PROGRESS,
      resultId: defaultResultId,
    },
    fileId,
    type: 'invoice',
    uploadIdentifier: '',
  };

  try {
    const file = await findFileById(fileId);

    if (!file) {
      throw new Error(`File of fileId: ${fileId} not found in database`);
    }

    const fileBuffer = await readFileFromLocalUrl(file.url);
    const decryptFileBuffer = await decryptImageFile({
      imageBuffer: fileBuffer,
      file,
      companyId,
    });
    const decryptFileBlob = bufferToBlob(decryptFileBuffer, file.mimeType);
    const fetchResult = uploadImageToAICH(decryptFileBlob, file.name);

    const resultStatus: IAccountResultStatus = await getPayloadFromResponseJSON(fetchResult);
    result = {
      resultStatus,
      fileId,
      type: 'invoice',
      uploadIdentifier,
    };
    loggerBack.info(result, `Ocr postImageToAICH result, field: ${fileId}`);
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'postImageToAICH failed',
      errorMessage: (error as Error).message,
    });
  }

  resultJson.push(result);
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

export async function fetchStatus(aichResultId: string) {
  let status: ProgressStatus = ProgressStatus.SYSTEM_ERROR;

  if (aichResultId.length > 0) {
    try {
      const fetchUrl = getAichUrl(AICH_APIS_TYPES.GET_INVOICE_RESULT_ID, aichResultId);
      const result = await fetch(fetchUrl);

      if (!result.ok) {
        loggerBack.info(
          {
            aich_response: result,
          },
          'Ocr fetchStatus response is not ok'
        );
        throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR_AICH_FAILED);
      }

      status = (await result.json()).payload;
    } catch (error) {
      loggerError({
        userId: DefaultValue.USER_ID.SYSTEM,
        errorType: 'fetchStatus failed',
        errorMessage: (error as Error).message,
      });
      throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR_AICH_FAILED);
    }
  }

  return status;
}

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

export async function formatUnprocessedOCR(ocrData: ocrIncludeFile[]): Promise<IOCR[]> {
  const unprocessedOCRs = await Promise.all(
    ocrData.map(async (ocr) => {
      const status = await fetchStatus(ocr.aichResultId);
      const progress = calculateProgress(ocr.createdAt, status, ocr.aichResultId);
      // const progress = calculateProgress(ocr.imageUrl);
      const imageSize = transformBytesToFileSizeString(ocr.imageFile.size);
      const imageUrl = transformOCRImageIDToURL(
        FileFolder.INVOICE,
        ocr.companyId,
        ocr.imageFile.name
      );
      const createdAt = timestampInSeconds(ocr.createdAt);
      const unprocessedOCR: IOCR = {
        id: ocr.id,
        aichResultId: ocr.aichResultId,
        imageUrl,
        imageName: ocr.imageFile.name,
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
    fileId: number;
    resultStatus: IAccountResultStatus;
    type: string;
    uploadIdentifier: string;
  }[]
) {
  const resultJson: IOCR[] = [];

  try {
    await Promise.all(
      aichResults.map(async (aichResult) => {
        const ocr = await createOcrInPrisma(
          companyId,
          aichResult.resultStatus,
          aichResult.type,
          aichResult.fileId
        );

        if (ocr) {
          const iOcr: IOCR = {
            id: ocr.id,
            aichResultId: ocr.aichResultId,
            imageName: ocr.imageFile.name,
            imageUrl: transformOCRImageIDToURL(FileFolder.INVOICE, companyId, ocr.imageFile.name),
            imageSize: transformBytesToFileSizeString(ocr.imageFile.size),
            progress: 0,
            status: ocr.status as ProgressStatus,
            createdAt: timestampInSeconds(ocr.createdAt),
            uploadIdentifier: aichResult.uploadIdentifier,
          };

          resultJson.push(iOcr);
        }
      })
    );
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'createOcrFromAichResults failed',
      errorMessage: (error as Error).message,
    });
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }

  return resultJson;
}

export async function handlePostRequest({
  companyId,
  fileId,
  uploadIdentifier,
}: {
  companyId: number;
  fileId: number;
  uploadIdentifier: string;
}) {
  let resultJson: IOCR[] = [];
  let statusMessage: string = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  try {
    const aichResults = await postImageToAICH(companyId, fileId, uploadIdentifier);
    resultJson = await createOcrFromAichResults(companyId, aichResults);
    statusMessage = STATUS_MESSAGE.CREATED;
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'handlePostRequest failed',
      errorMessage: (error as Error).message,
    });
  }

  return {
    resultJson,
    statusMessage,
  };
}

export async function handleGetRequest(companyId: number, ocrType?: ocrTypes) {
  // Info Murky (20240416): Check if companyId is string
  let ocrData: ocrIncludeFile[];

  try {
    ocrData = await findManyOCRByCompanyIdWithoutUsedInPrisma(companyId, ocrType);
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'findManyOCRByCompanyIdWithoutUsedInPrisma failed',
      errorMessage: (error as Error).message,
    });
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
  const session = await getSession(req);
  const { userId, companyId } = session;
  const isAuth = await checkAuthorization([AuthFunctionsKeys.admin], { userId, companyId });

  let payload: ApiReturnType = [];
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;

  if (isAuth) {
    try {
      switch (req.method) {
        case 'GET': {
          const { query } = validateRequest(APIName.OCR_LIST, req, userId);

          if (query) {
            const { ocrType } = query;
            payload = await handleGetRequest(companyId, ocrType);
            statusMessage = STATUS_MESSAGE.SUCCESS;
          }
          break;
        }
        case 'POST': {
          const { body } = validateRequest(APIName.OCR_UPLOAD, req, userId);
          if (body) {
            const { fileId, uploadIdentifier } = body;
            const result = await handlePostRequest({ companyId, fileId, uploadIdentifier });

            payload = result.resultJson;
            statusMessage = result.statusMessage;
          }
          break;
        }
        default: {
          loggerBack.info(
            {
              method: req.method,
            },
            'Ocr handler method is not allowed'
          );
          throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
        }
      }
    } catch (_error) {
      loggerError({
        userId,
        errorType: 'handle OCR request failed',
        errorMessage: (_error as Error).message,
      });
    }
  } else {
    statusMessage = STATUS_MESSAGE.FORBIDDEN;
    loggerBack.info(
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
