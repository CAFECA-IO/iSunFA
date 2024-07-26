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
import { getAdminByCompanyIdAndUserId } from '@/lib/utils/repo/admin.repo';

async function checkAuth(userId: number, companyId: number): Promise<boolean> {
  const admin = await getAdminByCompanyIdAndUserId(companyId, userId);
  return !!admin;
}

async function handleGetRequest(req: NextApiRequest, res: NextApiResponse) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IFile | null = null;

  try {
    const session = await getSession(req, res);
    const { userId, companyId } = session;
    const isAuth = await checkAuth(userId, companyId);
    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
    } else {
      const { fileId } = req.query;
      const fileIdStr = fileId as string;
      const companyIdStr = companyId.toString();
      const filename = `${companyIdStr}-${fileIdStr}`;
      const tmpFolder = path.join(BASE_STORAGE_FOLDER, FileFolder.TMP);
      const filePath = await findFileByName(tmpFolder, filename);

      if (filePath) {
        await fs.access(filePath);
        const stat = await fs.stat(filePath);
        payload = { id: fileIdStr, size: stat.size, existed: true };
        statusMessage = STATUS_MESSAGE.SUCCESS_GET;
      } else {
        statusMessage = STATUS_MESSAGE.SUCCESS_GET;
        payload = { id: fileIdStr, size: 0, existed: false };
      }
    }
  } catch (error) {
    statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  }

  return { statusMessage, payload };
}

async function handleDeleteRequest(req: NextApiRequest, res: NextApiResponse) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IFile | null = null;

  try {
    const session = await getSession(req, res);
    const { userId, companyId } = session;
    const isAuth = await checkAuth(userId, companyId);
    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
    } else {
      const { fileId } = req.query;
      const fileIdStr = fileId as string;
      const companyIdStr = companyId.toString();
      const filename = `${companyIdStr}-${fileIdStr}`;
      const tmpFolder = path.join(BASE_STORAGE_FOLDER, FileFolder.TMP);
      const filePath = await findFileByName(tmpFolder, filename);
      if (filePath) {
        const stat = await fs.stat(filePath);
        await fs.unlink(filePath); // 删除文件
        statusMessage = STATUS_MESSAGE.SUCCESS_DELETE;
        payload = { id: fileIdStr, size: stat.size, existed: false };
      } else {
        statusMessage = STATUS_MESSAGE.SUCCESS_DELETE;
        payload = { id: fileIdStr, size: 0, existed: false };
      }
    }
  } catch (error) {
    statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  }

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse<IResponseData<IFile | string | null>>
  ) => Promise<{ statusMessage: string; payload: IFile | string | null }>;
} = {
  GET: handleGetRequest,
  DELETE: handleDeleteRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IFile | string | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
  let payload: IFile | string | null = null;

  const handleRequest = methodHandlers[req.method || ''];
  if (handleRequest) {
    ({ statusMessage, payload } = await handleRequest(req, res));
  } else {
    statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
  }

  const { httpCode, result } = formatApiResponse<IFile | string | null>(statusMessage, payload);
  res.status(httpCode).json(result);
}
