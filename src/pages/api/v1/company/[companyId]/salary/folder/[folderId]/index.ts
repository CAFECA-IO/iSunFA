import type { NextApiRequest, NextApiResponse } from 'next';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { getSession } from '@/lib/utils/session';
import { getAdminByCompanyIdAndUserId } from '@/lib/utils/repo/admin.repo';
import { updateFolderName, getFolderContent } from '@/lib/utils/repo/folder.repo';
import { IFolder, IFolderContent } from '@/interfaces/folder';

function checkInput(name: string): boolean {
  return !!name;
}

async function checkAuth(userId: number, companyId: number): Promise<boolean> {
  const admin = await getAdminByCompanyIdAndUserId(companyId, userId);
  return !!admin;
}

async function handlePutRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IFolder | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IFolder | null = null;

  const { name } = req.body;
  const folderId = Number(req.query.folderId);
  const isValid = checkInput(name);
  if (!isValid) {
    statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
  } else {
    const session = await getSession(req, res);
    const { userId, companyId } = session;
    if (!userId) {
      statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
    } else {
      const isAuth = await checkAuth(userId, companyId);
      if (!isAuth) {
        statusMessage = STATUS_MESSAGE.FORBIDDEN;
      } else {
        const updatedFolder = await updateFolderName(companyId, folderId, name);
        statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
        payload = updatedFolder;
      }
    }
  }
  return { statusMessage, payload };
}

async function handleGetRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IFolderContent | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IFolderContent | null = null;

  const folderId = Number(req.query.folderId);
  const session = await getSession(req, res);
  const { userId, companyId } = session;
  if (!userId) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    const isAuth = await checkAuth(userId, companyId);
    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
    } else {
      const folderContent = await getFolderContent(companyId, folderId);
      statusMessage = STATUS_MESSAGE.SUCCESS_GET;
      payload = folderContent;
    }
  }
  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{
    statusMessage: string;
    payload: IFolder | IFolderContent | null;
  }>;
} = {
  PUT: handlePutRequest,
  GET: handleGetRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IFolder | IFolderContent | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IFolder | IFolderContent | null = null;
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
    payload = null;
  } finally {
    const { httpCode, result } = formatApiResponse<IFolder | IFolderContent | null>(
      statusMessage,
      payload
    );
    res.status(httpCode).json(result);
  }
}
