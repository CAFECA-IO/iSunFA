import { NextApiRequest, NextApiResponse } from 'next';
import { UPLOAD_TYPE_TO_FOLDER_MAP, UploadType } from '@/constants/file';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { parseForm } from '@/lib/utils/parse_image_form';
import loggerBack from '@/lib/utils/logger_back';
import { isEnumValue } from '@/lib/utils/type_guard/common';
import { formatApiResponse } from '@/lib/utils/common';
import { decrypt } from '@/lib/utils/pusher_token';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function handlePostRequest(req: NextApiRequest) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  const payload: null = null;

  try {
    const { type, token } = req.query;
    // Deprecated: (20241011-tzuhan) Debugging purpose
    // eslint-disable-next-line no-console
    console.log(`API POST type (${!isEnumValue(UploadType, type)}): `, type, ` token: `, token);

    if (!isEnumValue(UploadType, type)) {
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_TYPE);
    }
    if (!token) {
      throw new Error(STATUS_MESSAGE.BAD_REQUEST);
    }
    const companyId = decrypt(token as string);

    const parsedForm = await parseForm(req, UPLOAD_TYPE_TO_FOLDER_MAP[type], token as string);
    // TODO: (20241011 - tzuhan) Handle file upload logic here, save to DB
    // Deprecated: (20241011-tzuhan) Debugging purpose
    // eslint-disable-next-line no-console
    console.log(`API POST companyId(${companyId}) parsedForm: `, parsedForm);

    statusMessage = STATUS_MESSAGE.SUCCESS;
  } catch (_error) {
    const error = _error as Error;
    loggerBack.error(error, `API POST File: ${error.message}`);
    statusMessage = error.message;
  }

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: null }>;
} = {
  POST: handlePostRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: null = null;

  try {
    const handleRequest = methodHandlers[req.method || ''];
    if (handleRequest) {
      ({ statusMessage, payload } = await handleRequest(req, res));
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
      // Deprecated: (20241011-tzuhan) Debugging purpose
      // eslint-disable-next-line no-console
      console.error('Failed to send certificates update via Pusher', `METHOD_NOT_ALLOWED`);
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
  } finally {
    const { httpCode, result } = formatApiResponse<null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
