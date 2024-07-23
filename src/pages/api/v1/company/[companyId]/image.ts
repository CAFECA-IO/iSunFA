import { NextApiRequest, NextApiResponse } from 'next';
import { FileFolder } from '@/constants/file';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { getSession } from '@/lib/utils/session';
import { checkUserAdmin } from '@/lib/utils/auth_check';
import { parseForm } from '@/lib/utils/parse_image_form';
import { formatApiResponse } from '@/lib/utils/common';
import { uploadFiles } from '@/lib/utils/google_image_upload';
import { ICompany } from '@/interfaces/company';
import { updateCompanyById } from '@/lib/utils/repo/company.repo';
import { formatCompany } from '@/lib/utils/formatter/company.formatter';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function handlePutRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ICompany | null>>
): Promise<{ statusMessage: string; payload: ICompany | null }> {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ICompany | null = null;

  const session = await getSession(req, res);
  const { userId, companyId } = session;
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
        const iconUrlList = await uploadFiles(file);
        const iconUrl = iconUrlList[0];
        const updatedCompany = await updateCompanyById(
          companyId,
          undefined,
          undefined,
          undefined,
          iconUrl
        );
        if (updatedCompany) {
          const company = formatCompany(updatedCompany);
          payload = company;
        }
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
    res: NextApiResponse<IResponseData<ICompany | null>>
  ) => Promise<{ statusMessage: string; payload: ICompany | null }>;
} = {
  PUT: handlePutRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ICompany | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
  let payload: ICompany | null = null;

  const handleRequest = methodHandlers[req.method || ''];
  if (handleRequest) {
    ({ statusMessage, payload } = await handleRequest(req, res));
  } else {
    statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
  }

  const { httpCode, result } = formatApiResponse<ICompany | null>(statusMessage, payload);
  res.status(httpCode).json(result);
}
