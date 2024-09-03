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
import { AVERAGE_OCR_PROCESSING_TIME } from '@/constants/ocr';
import logger from '@/lib/utils/logger';
import { bufferToBlob, findFileByName, readFile } from '@/lib/utils/parse_image_form';
import { findFileById } from '@/lib/utils/repo/file.repo';
import { decryptImageFile, parseFilePathWithBaseUrlPlaceholder } from '@/lib/utils/file';

export async function readImageFromFilePath(
  fileName: string,
  fileMimeTypes: string
): Promise<Blob> {
  const fileFolder = getFileFolder(FileFolder.INVOICE);
  const filePath = await findFileByName(fileFolder, fileName);

  if (!filePath) {
    logger.info(
      {
        fileName,
      },
      'Ocr readImageFromFilePath filePath is null'
    );
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }

  const fileBuffer = await readFile(filePath);

  if (!fileBuffer) {
    logger.info(
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
    logger.error(
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

async function readFileFromLocalUrl(url: string): Promise<Buffer> {
  const filePath = parseFilePathWithBaseUrlPlaceholder(url);

  const fileBuffer = await readFile(filePath);
  if (!fileBuffer) {
    logger.info(
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
      companyId: file.companyId,
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
    logger.info(result, `Ocr postImageToAICH result, field: ${fileId}`);
  } catch (error) {
    // Todo: (20240822 - Anna): [Beta] feat. Murky - 使用 logger
    logger.error(error, 'Ocr postImageToAICH error, happen when POST Image to AICH API');
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

function formatFormBody(req: NextApiRequest) {
  const { body } = req;

  let fileId: number;
  let imageName: string;
  let imageSizeNum: number; // Info: (20240829 - Murky) it's like 32 MB
  let uploadIdentifier: string;
  let encryptedSymmetricKey: string;
  let publicKey: JsonWebKey;
  let iv: string[];
  let imageType: string;

  if (
    body.fileId &&
    body.imageName &&
    body.imageSize &&
    body.uploadIdentifier &&
    body.encryptedSymmetricKey &&
    body.publicKey &&
    body.iv
  ) {
    fileId = body.fileId;
    imageName = body.imageName;
    const imageSize = body.imageSize as string;

    imageSizeNum = transformFileSizeStringToBytes(imageSize);

    uploadIdentifier = body.uploadIdentifier;
    encryptedSymmetricKey = body.encryptedSymmetricKey;
    // publicKey = JSON.parse(body.publicKey) as JsonWebKey;

    publicKey = {} as JsonWebKey;
    iv = (body.iv as string).split(',');
    imageType = body.imageType as string;
  } else {
    logger.info(body, 'ocr body is not valid');
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_TYPE);
    /* eslint-enable no-console */
  }

  return {
    fileId,
    imageName,
    imageSize: imageSizeNum,
    uploadIdentifier,
    encryptedSymmetricKey,
    publicKey,
    iv,
    imageType,
  };
}

export async function fetchStatus(aichResultId: string) {
  let status: ProgressStatus = ProgressStatus.SYSTEM_ERROR;

  if (aichResultId.length > 0) {
    try {
      const fetchUrl = getAichUrl(AICH_APIS_TYPES.GET_OCR_RESULT_ID, aichResultId);
      const result = await fetch(fetchUrl);

      if (!result.ok) {
        logger.info(
          {
            aich_response: result,
          },
          'Ocr fetchStatus response is not ok'
        );
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
    // Todo: (20240822 - Anna): [Beta] feat. Murky - 使用 logger
    logger.error(error, 'Ocr createOcrFromAichResults error, happen when create Ocr in Prisma');
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }

  return resultJson;
}

export async function handlePostRequest(companyId: number, req: NextApiRequest) {
  let resultJson: IOCR[] = [];
  let statusMessage: string = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  try {
    const { fileId, uploadIdentifier } = formatFormBody(req);
    const aichResults = await postImageToAICH(fileId, uploadIdentifier);
    resultJson = await createOcrFromAichResults(companyId, aichResults);
    statusMessage = STATUS_MESSAGE.CREATED;
  } catch (error) {
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

  let ocrData: ocrIncludeFile[];

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
