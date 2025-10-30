import { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { IFileBeta } from '@/interfaces/file';
import { formatApiResponse } from '@/lib/utils/common';
import { deleteFileById, findFileById, putFileById } from '@/lib/utils/repo/file.repo';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { File } from '@prisma/client';

const handleGetRequest: IHandleRequest<APIName.FILE_GET, File> = async ({ query }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: File | null = null;

  try {
    const { fileId } = query;

    const file = await findFileById(fileId);
    payload = file;
    statusMessage = STATUS_MESSAGE.SUCCESS_GET;
  } catch (error) {
    (error as Error).message += ' - Failed to get file record from database.';
    statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  }

  return { statusMessage, payload };
};

const handlePutRequest: IHandleRequest<APIName.FILE_PUT_V2, File> = async ({ query, body }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: File | null = null;

  try {
    const { fileId } = query;
    const { name } = body;

    const file = await putFileById(fileId, {
      name,
    });
    payload = file;
    statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
  } catch (error) {
    (error as Error).message += ' - Failed to update file record in database.';
    statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  }

  return { statusMessage, payload };
};

const handleDeleteRequest: IHandleRequest<APIName.FILE_DELETE_V2, File> = async ({ query }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: File | null = null;

  try {
    const { fileId } = query;

    const file = await deleteFileById(fileId);

    if (file) {
      try {
        // ToDo: (20250710 - Luphia) Use IPFS to store files (S1: 刪除檔案)
        await fs.unlink(file.url);

        statusMessage = STATUS_MESSAGE.SUCCESS_DELETE;
        payload = file;
      } catch (fsError) {
        (fsError as Error).message += ' - Failed to delete file from filesystem.';
        statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
      }
    } else {
      statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
      payload = file;
    }
  } catch (error) {
    (error as Error).message += ' - Failed to delete file record from database.';
    statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  }

  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: IFileBeta | null }>;
} = {
  GET: (req) => withRequestValidation(APIName.FILE_GET, req, handleGetRequest),
  DELETE: (req) => withRequestValidation(APIName.FILE_DELETE_V2, req, handleDeleteRequest),
  PUT: (req) => withRequestValidation(APIName.FILE_PUT_V2, req, handlePutRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IFileBeta | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IFileBeta | null = null;

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
    const { httpCode, result } = formatApiResponse<IFileBeta | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
