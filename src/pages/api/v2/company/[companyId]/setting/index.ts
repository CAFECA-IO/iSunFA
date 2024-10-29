import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { ICompanySetting } from '@/interfaces/company_setting';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import {
  createCompanySetting,
  getCompanySettingByCompanyId,
  updateCompanySettingById,
} from '@/lib/utils/repo/company_setting.repo';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { CompanySetting } from '@prisma/client';

const handleGetRequest: IHandleRequest<APIName.COMPANY_SETTING_GET, CompanySetting> = async ({
  query,
}) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: CompanySetting | null = null;

  const { companyId } = query;

  const getCompanySetting = await getCompanySettingByCompanyId(companyId);
  if (getCompanySetting) {
    payload = getCompanySetting;
    statusMessage = STATUS_MESSAGE.SUCCESS_GET;
  } else {
    const createdCompanySetting = await createCompanySetting(companyId);
    if (createdCompanySetting) {
      payload = createdCompanySetting;
      statusMessage = STATUS_MESSAGE.SUCCESS_GET;
    } else {
      statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
    }
  }

  return { statusMessage, payload };
};

const handlePutRequest: IHandleRequest<APIName.COMPANY_SETTING_UPDATE, CompanySetting> = async ({
  query,
  body,
}) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: CompanySetting | null = null;

  const { companyId } = query;
  const companySettingData = body;

  try {
    const updatedCompanySetting = await updateCompanySettingById(companyId, companySettingData);

    if (updatedCompanySetting) {
      payload = updatedCompanySetting;
      statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
    } else {
      statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
    }
  } catch (error) {
    statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  }

  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: ICompanySetting | null }>;
} = {
  GET: (req, res) => withRequestValidation(APIName.COMPANY_SETTING_GET, req, res, handleGetRequest),
  PUT: (req, res) =>
    withRequestValidation(APIName.COMPANY_SETTING_UPDATE, req, res, handlePutRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ICompanySetting | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ICompanySetting | null = null;

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
    const { httpCode, result } = formatApiResponse<ICompanySetting | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
