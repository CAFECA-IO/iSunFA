import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';
import { BASE_STORAGE_FOLDER, FileFolder } from '@/constants/file';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { IFile } from '@/interfaces/file';
import { getSession } from '@/lib/utils/session';
import { checkUserAdmin } from '@/lib/utils/auth_check';
import { findFileByName, parseForm } from '@/lib/utils/parse_image_form';
import { formatApiResponse } from '@/lib/utils/common';
import { getAdminByCompanyIdAndUserId } from '@/lib/utils/repo/admin.repo';


export const config = {
  api: {
    bodyParser: false,
  },
};

async function checkAuth(userId: number, companyId: number): Promise<boolean> {
  const admin = await getAdminByCompanyIdAndUserId(companyId, userId);
  return !!admin;
}

async function handleDeleteRequest(req: NextApiRequest, res: NextApiResponse) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: string | null = null;
  const session = await getSession(req, res);
  const { userId, companyId } = session;
  const isAuth = await checkAuth(userId, companyId);
  if (!isAuth) {
    statusMessage = STATUS_MESSAGE.FORBIDDEN;
  } else {
    const { filename } = req.query;
    const tmpFolder = path.join(BASE_STORAGE_FOLDER, FileFolder.TMP);
    const filePath = await findFileByName(tmpFolder, filename as string);
    if (!filePath) {
      statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
    } else {
      if (!fs.existsSync(filePath)) {
        statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
      } else {
        try {
          fs.unlinkSync(filePath); // 删除文件
          statusMessage = STATUS_MESSAGE.SUCCESS_DELETE;
        } catch (error) {
          statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
        }
      }
      payload = filePath;
    }
  }
  return { statusMessage, payload };
}

async function handlePostRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IFile | null>>
): Promise<{ statusMessage: string; payload: IFile | null }> {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IFile | null = null;

  const session = await getSession(req, res);
  const { userId, companyId } = session;
  const isAuth = await checkUserAdmin({ userId, companyId });

  if (!isAuth) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    try {
      const parsedForm = await parseForm(req, FileFolder.TMP);
      const { files, fields } = parsedForm;
      const { file } = files;
      const { type } = fields;

      if (!file || !type) {
        statusMessage = STATUS_MESSAGE.IMAGE_UPLOAD_FAILED_ERROR;
      } else {
        const id = file[0].newFilename.split('.')[0];
        payload = { id, size: file[0].size };
        statusMessage = STATUS_MESSAGE.CREATED;
      }
    } catch (error) {
      // 错误处理保持不变
      statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
    }
  }

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse<IResponseData<IFile | string | null>>
  ) => Promise<{ statusMessage: string; payload: IFile | string | null }>;
} = {
  POST: handlePostRequest,
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
