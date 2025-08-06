import { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { IFile } from '@/interfaces/file';
import { getSession } from '@/lib/utils/session';
import { formatApiResponse, isStringNumber } from '@/lib/utils/common';
import { deleteFileById, findFileById, findFileInDBByName } from '@/lib/utils/repo/file.repo';
import { File } from '@prisma/client';

async function handleGetRequest(req: NextApiRequest) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IFile | null = null;

  const session = await getSession(req);
  const { userId } = session;

  if (!userId) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    try {
      const { fileId } = req.query;
      const fileName = String(fileId);

      let file: File | null;

      // Info: (20240902 - Murky) FileId 可以給數字或是檔案名稱
      if (isStringNumber(fileName)) {
        const fileIdInt = Number(fileName);
        file = await findFileById(fileIdInt);
      } else {
        file = await findFileInDBByName(fileName);
      }

      if (file) {
        const filePath = file.url;
        const stat = await fs.stat(filePath);
        payload = { id: file.id, name: file.name, size: stat.size, existed: true };
      } else {
        payload = { id: -1, name: 'not found', size: 0, existed: false };
      }
      statusMessage = STATUS_MESSAGE.SUCCESS_GET;
    } catch (error) {
      statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
    }
  }

  return { statusMessage, payload };
}

async function handleDeleteRequest(req: NextApiRequest) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IFile | null = null;

  const session = await getSession(req);
  const { userId } = session;

  if (!userId) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    try {
      const { fileId } = req.query;
      const fileName = fileId as string;

      let file: File | null = null;

      // Info: (20240902 - Murky) FileId 可以給數字或是檔案名稱
      if (isStringNumber(fileName)) {
        const fileIdInt = Number(fileName);
        file = await deleteFileById(fileIdInt);
      } else {
        const fileForDelete = await findFileInDBByName(fileName);
        if (fileForDelete) {
          file = await deleteFileById(fileForDelete.id);
        }
      }

      if (file) {
        const stat = await fs.stat(file.url);
        // ToDo: (20250710 - Luphia) Use IPFS to store files (S1: 刪除檔案)
        await fs.unlink(file.url);

        statusMessage = STATUS_MESSAGE.SUCCESS_DELETE;
        payload = { id: file.id, name: file.name, size: stat.size, existed: false };
      } else {
        statusMessage = STATUS_MESSAGE.SUCCESS_DELETE;
        payload = { id: -1, name: 'not found', size: 0, existed: false };
      }
    } catch (error) {
      // ToDo: (20240828 - Jacky) Log error message
      statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
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
