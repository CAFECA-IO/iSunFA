import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { getSession } from '@/lib/utils/session';
import { findFileByName, readFile } from '@/lib/utils/parse_image_form';
import { formatApiResponse } from '@/lib/utils/common';
import { isEnumValue } from '@/lib/utils/type_guard/common';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { AuthFunctionsKeys } from '@/interfaces/auth';
import logger from '@/lib/utils/logger_back';
import { FileFolder, getFileFolder } from '@/constants/file';

function formatFileType(fileType: unknown): FileFolder {
  let result = FileFolder.TMP;
  if (isEnumValue(FileFolder, fileType)) {
    result = fileType;
  }
  return result;
}

function formatImageId(imageId: unknown): string {
  return String(imageId);
}

function formatQueryParams(req: NextApiRequest) {
  const { imageId, fileType } = req.query;
  const imageIdStr = formatImageId(imageId);
  const fileFolder = formatFileType(fileType);
  return {
    imageId: imageIdStr,
    fileFolder,
  };
}
async function handleGetRequest(req: NextApiRequest, res: NextApiResponse) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: Buffer | null = null;

  try {
    const session = await getSession(req, res);
    const { userId } = session;
    const isAuth = await checkAuthorization([AuthFunctionsKeys.user], { userId });
    if (!isAuth) {
      logger.info(`Unauthorized access in image/[imageId] by user: ${userId}`);
      throw new Error(STATUS_MESSAGE.FORBIDDEN);
    }

    const { imageId, fileFolder } = formatQueryParams(req);
    const folderPath = getFileFolder(fileFolder);
    const filePath = await findFileByName(folderPath, imageId);

    if (!filePath) {
      logger.info(`Image file not found in image/[imageId]: ${imageId}`);
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }

    const fileBuffer = await readFile(filePath);
    if (!fileBuffer) {
      logger.info(`Error in reading image file in image/[imageId] (but image existed): ${imageId}`);
      throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR);
    }

    payload = fileBuffer;
  } catch (_error) {
    const error = _error as Error;
    logger.error(error, `Error in GET image/[imageId]:`);
    statusMessage = error.message;
  }

  return { statusMessage, payload };
}
const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse<Buffer | null>
  ) => Promise<{ statusMessage: string; payload: Buffer | null }>;
} = {
  GET: handleGetRequest,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<Buffer | null>) {
  let statusMessage: string = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
  let payload: Buffer | null = null;

  const handleRequest = methodHandlers[req.method || ''];
  if (handleRequest) {
    ({ statusMessage, payload } = await handleRequest(req, res));
  } else {
    statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
  }

  const { httpCode } = formatApiResponse<null>(statusMessage, null);

  // Info: (20240828 - Murky) Content-Type: need to be image/jpeg to return image
  res.setHeader('Content-Type', 'image/jpeg');
  res.status(httpCode).send(payload);
}
