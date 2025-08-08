import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { readFile } from '@/lib/utils/parse_image_form';
import { formatApiResponse } from '@/lib/utils/common';
import loggerBack from '@/lib/utils/logger_back';
import { findFileById } from '@/lib/utils/repo/file.repo';
import { decryptImageFile, parseFilePathWithBaseUrlPlaceholder } from '@/lib/utils/file';
import { IResponseData } from '@/interfaces/response_data';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';

const handleGetRequest: IHandleRequest<APIName.IMAGE_GET_BY_ID, Buffer> = async ({
  session,
  query,
}) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: Buffer | null = null;

  try {
    const { accountBookId } = session;
    const { imageId } = query;
    const file = await findFileById(imageId);

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

    payload = await decryptImageFile({ imageBuffer: fileBuffer, file, companyId: accountBookId });
    statusMessage = STATUS_MESSAGE.SUCCESS_GET;
  } catch (_error) {
    const error = _error as Error;
    loggerBack.error(`error: ${JSON.stringify(error)}`);
    statusMessage = error.message;
  }

  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: Buffer | null }>;
} = {
  GET: (req) => withRequestValidation(APIName.IMAGE_GET_BY_ID, req, handleGetRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<Buffer | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
  let payload: Buffer | null = null;

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
    const { httpCode, result } = formatApiResponse<Buffer | null>(statusMessage, payload);
    res.setHeader('Content-Type', 'image/jpeg');
    res.status(httpCode).send(result);
  }
}
