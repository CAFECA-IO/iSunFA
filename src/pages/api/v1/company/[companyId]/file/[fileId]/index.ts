import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import { promises as fs } from 'fs';
import { BASE_STORAGE_FOLDER, FileFolder } from '@/constants/file';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { IFile } from '@/interfaces/file';
import { getSession } from '@/lib/utils/session';
import { findFileByName } from '@/lib/utils/parse_image_form';
import { formatApiResponse } from '@/lib/utils/common';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { AuthFunctionsKeys } from '@/interfaces/auth';

async function getFilePath(companyId: number, fileId: string): Promise<string | null> {
  const companyIdStr = companyId.toString();
  const filename = `${companyIdStr}-${fileId}`;
  const tmpFolder = path.join(BASE_STORAGE_FOLDER, FileFolder.TMP);
  const filePath = await findFileByName(tmpFolder, filename);
  return filePath;
}

async function handleGetRequest(req: NextApiRequest, res: NextApiResponse<IResponseData<IFile | null>>) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IFile | null = null;

  const session = await getSession(req, res);
  const { userId, companyId } = session;

  if (!userId) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    const isAuth = await checkAuthorization([AuthFunctionsKeys.admin], { userId, companyId });

    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
    } else {
      try {
        const { fileId } = req.query;
        const fileIdStr = String(fileId);
        const filePath = await getFilePath(companyId, fileIdStr);

        if (filePath) {
          const stat = await fs.stat(filePath);
          payload = { id: fileIdStr, size: stat.size, existed: true };
        } else {
          payload = { id: fileIdStr, size: 0, existed: false };
        }
        statusMessage = STATUS_MESSAGE.SUCCESS_GET;
      } catch (error) {
        statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
      }
    }
  }

  return { statusMessage, payload };
}

async function handleDeleteRequest(req: NextApiRequest, res: NextApiResponse<IResponseData<IFile | null>>) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IFile | null = null;

  const session = await getSession(req, res);
  const { userId, companyId } = session;

  if (!userId) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    const isAuth = await checkAuthorization([AuthFunctionsKeys.admin], { userId, companyId });

    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
    } else {
      try {
        const { fileId } = req.query;
        const fileIdStr = fileId as string;
        const filePath = await getFilePath(companyId, fileIdStr);

        if (filePath) {
          const stat = await fs.stat(filePath);
          await fs.unlink(filePath);
          statusMessage = STATUS_MESSAGE.SUCCESS_DELETE;
          payload = { id: fileIdStr, size: stat.size, existed: false };
        } else {
          statusMessage = STATUS_MESSAGE.SUCCESS_DELETE;
          payload = { id: fileIdStr, size: 0, existed: false };
        }
      } catch (error) {
        // ToDo: (20240828 - Jacky) Log error message
        statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
      }
    }
  }

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse<IResponseData<IFile | null>>
  ) => Promise<{ statusMessage: string; payload: IFile | null }>;
} = {
  GET: handleGetRequest,
  DELETE: handleDeleteRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IFile | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IFile | null = null;

  try {
    const handleRequest = methodHandlers[req.method || ''];
    if (handleRequest) {
      ({ statusMessage, payload } = await handleRequest(req, res));
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
  } finally {
    const { httpCode, result } = formatApiResponse<IFile | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
