import { NextApiRequest, NextApiResponse } from 'next';
import { FileFolder } from '@/constants/file';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { getSession } from '@/lib/utils/session';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { parseForm } from '@/lib/utils/parse_image_form';
import { convertStringToNumber, formatApiResponse } from '@/lib/utils/common';
import { uploadFiles } from '@/lib/utils/google_image_upload';
import { updateProjectById } from '@/lib/utils/repo/project.repo';
import { formatProject } from '@/lib/utils/formatter/project.formatter';
import { IProject } from '@/interfaces/project';
import { AuthFunctionsKeyStr } from '@/constants/auth';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function handlePutRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IProject | null>>
): Promise<{ statusMessage: string; payload: IProject | null }> {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IProject | null = null;

  const session = await getSession(req, res);
  const { userId, companyId } = session;
  const isAuth = await checkAuthorization([AuthFunctionsKeyStr.admin], { userId, companyId });
  if (!isAuth) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    try {
      const { projectId } = req.query;
      const projectIdNum = convertStringToNumber(projectId);
      const parsedForm = await parseForm(req, FileFolder.TMP);
      const { files } = parsedForm;
      const { file } = files;

      if (!file) {
        statusMessage = STATUS_MESSAGE.IMAGE_UPLOAD_FAILED_ERROR;
      } else {
        const iconUrlList = await uploadFiles(file);
        const iconUrl = iconUrlList[0];
        const updatedProject = await updateProjectById(projectIdNum, undefined, iconUrl);
        const project = formatProject(updatedProject);
        payload = project;
        statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
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
    res: NextApiResponse<IResponseData<IProject | null>>
  ) => Promise<{ statusMessage: string; payload: IProject | null }>;
} = {
  PUT: handlePutRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IProject | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
  let payload: IProject | null = null;

  const handleRequest = methodHandlers[req.method || ''];
  if (handleRequest) {
    ({ statusMessage, payload } = await handleRequest(req, res));
  } else {
    statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
  }

  const { httpCode, result } = formatApiResponse<IProject | null>(statusMessage, payload);
  res.status(httpCode).json(result);
}
