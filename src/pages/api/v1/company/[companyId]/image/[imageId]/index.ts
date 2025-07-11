import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { getSession } from '@/lib/utils/session';
import { readFile } from '@/lib/utils/parse_image_form';
import { formatApiResponse, isStringNumber } from '@/lib/utils/common';
import { isEnumValue } from '@/lib/utils/type_guard/common';
import loggerBack from '@/lib/utils/logger_back';
import { FileFolder } from '@/constants/file';
import { File } from '@prisma/client';
import { findFileById, findFileInDBByName } from '@/lib/utils/repo/file.repo';
import { decryptImageFile, parseFilePathWithBaseUrlPlaceholder } from '@/lib/utils/file';

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

async function getFileFromDB(imageId: string) {
  let file: File | null;
  if (isStringNumber(imageId)) {
    const fileIdInt = Number(imageId);
    file = await findFileById(fileIdInt);
  } else {
    file = await findFileInDBByName(imageId);
  }

  return file;
}

async function handleGetRequest(req: NextApiRequest) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: Buffer | null = null;

  try {
    const session = await getSession(req);
    const { companyId } = session;

    const { imageId } = formatQueryParams(req);
    // Info: (20240903 - Murky) 這裡假定所有的file.url都可以確實指向該檔案，不需要重新組裝路徑
    const file = await getFileFromDB(imageId);

    if (!file) {
      loggerBack.info(`Image file not found in DB in image/[imageId]: ${imageId}`);
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }

    const filePath = parseFilePathWithBaseUrlPlaceholder(file.url);

    // ToDo: (20250710 - Luphia) Use IPFS to store files (S1: 讀圖)
    const fileBuffer = await readFile(filePath);
    if (!fileBuffer) {
      loggerBack.info(
        `Error in reading image file in image/[imageId] (but image existed): ${imageId}`
      );
      throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR);
    }

    payload = await decryptImageFile({ imageBuffer: fileBuffer, file, companyId });
  } catch (_error) {
    const error = _error as Error;
    loggerBack.error(error, `Error in GET image/[imageId]:`);
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
