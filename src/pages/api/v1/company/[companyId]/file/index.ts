import { NextApiRequest, NextApiResponse } from 'next';
import { FileFolder, UploadType } from '@/constants/file';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { IFile } from '@/interfaces/file';
import { getSession } from '@/lib/utils/session';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { addPrefixToFile, parseForm } from '@/lib/utils/parse_image_form';
import { convertStringToNumber, formatApiResponse } from '@/lib/utils/common';
import path from 'path';
import { uploadFile } from '@/lib/utils/google_image_upload';
import { updateCompanyById } from '@/lib/utils/repo/company.repo';
import { updateUserById } from '@/lib/utils/repo/user.repo';
import { updateProjectById } from '@/lib/utils/repo/project.repo';
import { AuthFunctionsKeys } from '@/interfaces/auth';

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
  let fileId: string = '';
  let isAuth = false;

  const { type, targetId } = req.query;
  const session = await getSession(req, res);
  const { userId, companyId } = session;
  if (type && targetId && type === UploadType.USER) {
    isAuth = await checkAuthorization([AuthFunctionsKeys.user], { userId });
  } else {
    isAuth = await checkAuthorization([AuthFunctionsKeys.admin], { userId, companyId });
  }
  if (!isAuth) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    try {
      const parsedForm = await parseForm(req, FileFolder.TMP);
      const { files } = parsedForm;
      const { file } = files;
      const targetIdStr = targetId as string;
      const targetIdNum = convertStringToNumber(targetId);
      if (!file) {
        statusMessage = STATUS_MESSAGE.IMAGE_UPLOAD_FAILED_ERROR;
      } else {
        switch (type) {
          case UploadType.KYC: {
            const ext = file[0].originalFilename
              ? path.extname(file[0].originalFilename).slice(1)
              : '';
            await addPrefixToFile(FileFolder.TMP, file[0].newFilename, targetIdStr, ext);
            fileId = file[0].newFilename;
            break;
          }
          case UploadType.COMPANY: {
            const iconUrl = await uploadFile(file[0]);
            await updateCompanyById(targetIdNum, undefined, undefined, undefined, iconUrl);
            fileId = iconUrl;
            break;
          }
          case UploadType.USER: {
            const iconUrl = await uploadFile(file[0]);
            await updateUserById(targetIdNum, undefined, undefined, undefined, undefined, iconUrl);
            fileId = iconUrl;
            break;
          }
          case UploadType.PROJECT: {
            const iconUrl = await uploadFile(file[0]);
            await updateProjectById(targetIdNum, undefined, iconUrl);
            fileId = iconUrl;
            break;
          }
          default:
            statusMessage = STATUS_MESSAGE.INVALID_INPUT_TYPE;
        }

        payload = { id: fileId, size: file[0].size, existed: true };
        statusMessage = STATUS_MESSAGE.CREATED;
      }
    } catch (error) {
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
