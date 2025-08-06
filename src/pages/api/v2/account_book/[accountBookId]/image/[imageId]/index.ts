import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/utils/session';
import { formatApiResponse, isStringNumber } from '@/lib/utils/common';
import { HTTP_STATUS } from '@/constants/http';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { loggerError } from '@/lib/utils/logger_back';
import { APIName, HttpMethod } from '@/constants/api_connection';
import {
  checkSessionUser,
  checkUserAuthorization,
  checkRequestData,
  logUserAction,
} from '@/lib/utils/middleware';
import { File } from '@prisma/client';
import { findFileById, findFileInDBByName } from '@/lib/utils/repo/file.repo';
import { decryptImageFile, parseFilePathWithBaseUrlPlaceholder } from '@/lib/utils/file';
import { readFile } from '@/lib/utils/parse_image_form';

function formatImageId(raw: unknown): string {
  return String(raw ?? '');
}

async function getFileFromDB(id: string): Promise<File | null> {
  if (isStringNumber(id)) {
    return findFileById(Number(id));
  }
  return findFileInDBByName(id);
}

const handleGetRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  const { userId } = session;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: Buffer | null = null;

  await checkSessionUser(session, APIName.GET_IMAGE, req);
  await checkUserAuthorization(APIName.GET_IMAGE, req, session);

  const { query } = checkRequestData(APIName.GET_IMAGE, req, session);
  if (query === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }
  const { imageId: rawId, accountBookId } = query;

  try {
    const imageId = formatImageId(rawId);

    const file = await getFileFromDB(imageId);
    if (!file) {
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }

    const path = parseFilePathWithBaseUrlPlaceholder(file.url);
    const buf = await readFile(path);
    if (!buf) {
      throw new Error(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR);
    }

    payload = await decryptImageFile({
      imageBuffer: buf,
      file,
      companyId: accountBookId,
    });

    // const base64 = decrypted.toString('base64');
    // payload = `data:image/jpeg;base64,${base64}`;
    statusMessage = STATUS_MESSAGE.SUCCESS_GET;
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
    loggerError({
      userId,
      errorType: error.name,
      errorMessage: error.message,
    });
  }
  const response = formatApiResponse<Buffer | null>(statusMessage, payload);
  return { response, statusMessage };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<Buffer | null>) {
  const method = req.method || HttpMethod.GET;
  let httpCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let result;
  let response;
  let statusMessage: string = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  let apiName: APIName = APIName.GET_IMAGE;
  const session = await getSession(req);

  try {
    // Info: (20250430 - Shirley) Handle different HTTP methods
    switch (method) {
      case HttpMethod.GET:
        apiName = APIName.GET_IMAGE;
        ({ response, statusMessage } = await handleGetRequest(req));
        ({ httpCode, result } = response);
        break;
      default:
        statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
        ({ httpCode, result } = formatApiResponse<null>(statusMessage, null));
        break;
    }
  } catch (error) {
    const err = error as Error;
    statusMessage = STATUS_MESSAGE[err.name as keyof typeof STATUS_MESSAGE] || err.message;
    ({ httpCode, result } = formatApiResponse<null>(statusMessage, null));
  }

  await logUserAction(session, apiName, req, statusMessage);
  res.setHeader('Content-Type', 'image/jpeg');
  res.status(httpCode).send(result.payload as Buffer | null);
}
