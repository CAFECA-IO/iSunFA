import { NextApiRequest, NextApiResponse } from 'next';
import { FileFolder } from '@/constants/file';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { IFile } from '@/interfaces/file';
import { getSession } from '@/lib/utils/session';
import { checkUserAdmin } from '@/lib/utils/auth_check';
import { addPrefixToFile, parseForm } from '@/lib/utils/parse_image_form';
import { formatApiResponse } from '@/lib/utils/common';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function handlePostRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IFile | null>>
): Promise<{ statusMessage: string; payload: IFile | null }> {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IFile | null = null;

  const session = await getSession(req, res);
  const { userId, companyId } = session;
  const companyIdStr = companyId.toString();
  const isAuth = await checkUserAdmin({ userId, companyId });
  if (!isAuth) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    try {
      const parsedForm = await parseForm(req, FileFolder.TMP);
      const { files } = parsedForm;
      const { file } = files;

      if (!file) {
        statusMessage = STATUS_MESSAGE.IMAGE_UPLOAD_FAILED_ERROR;
      } else {
        // Info (20240722 - Jacky) add prefix to file name for get by company id
        const ext = file && file[0] && file[0].mimetype ? file[0].mimetype.split('/')[1] : '';
        await addPrefixToFile(FileFolder.TMP, file[0].newFilename, companyIdStr, ext);
        payload = { id: file[0].newFilename, size: file[0].size, existed: true };
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
    res: NextApiResponse<IResponseData<IFile | null>>
  ) => Promise<{ statusMessage: string; payload: IFile | null }>;
} = {
  POST: handlePostRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IFile | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
  let payload: IFile | string | null = null;

  const handleRequest = methodHandlers[req.method || ''];
  if (handleRequest) {
    ({ statusMessage, payload } = await handleRequest(req, res));
  } else {
    statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
  }

  const { httpCode, result } = formatApiResponse<IFile | null>(statusMessage, payload);
  res.status(httpCode).json(result);
}
