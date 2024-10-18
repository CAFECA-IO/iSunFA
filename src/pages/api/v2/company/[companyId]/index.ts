import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { ICompany, ICompanyAndRole } from '@/interfaces/company';
import { formatApiResponse } from '@/lib/utils/common';
import { deleteCompanyById } from '@/lib/utils/repo/company.repo';
import { formatCompany } from '@/lib/utils/formatter/company.formatter';
import {
  deleteAdminListByCompanyId,
  getAdminByCompanyIdAndUserId,
  getCompanyAndRoleByUserIdAndCompanyId,
  setCompanyToTop,
  updateCompanyTagById,
} from '@/lib/utils/repo/admin.repo';
import { formatCompanyAndRole } from '@/lib/utils/formatter/admin.formatter';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { APIName } from '@/constants/api_connection';
import { withRequestValidation } from '@/lib/utils/middleware';
import { CompanyUpdateAction } from '@/constants/company';

const handleGetRequest: IHandleRequest<APIName.COMPANY_GET_BY_ID, ICompanyAndRole> = async ({
  query,
  session,
}) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ICompanyAndRole | null = null;

  const { companyId } = query;
  const { userId } = session;
  const getCompanyAndRole = await getCompanyAndRoleByUserIdAndCompanyId(userId, companyId);
  if (getCompanyAndRole) {
    const companyDetailAndRole = formatCompanyAndRole(getCompanyAndRole);
    statusMessage = STATUS_MESSAGE.SUCCESS_GET;
    payload = companyDetailAndRole;
  }
  return { statusMessage, payload };
};

const handlePutRequest: IHandleRequest<APIName.COMPANY_UPDATE, ICompanyAndRole> = async ({
  query,
  body,
  session,
}) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ICompanyAndRole | null = null;

  const { companyId } = query;
  const { action, tag } = body;
  const { userId } = session;
  switch (action) {
    case CompanyUpdateAction.UPDATE_TAG: {
      const admin = await getAdminByCompanyIdAndUserId(userId, companyId);
      if (admin && tag) {
        const updatedCompanyAndRole = await updateCompanyTagById(admin.id, tag);
        const companyAndRole = formatCompanyAndRole(updatedCompanyAndRole);
        statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
        payload = companyAndRole;
      }
      break;
    }
    case CompanyUpdateAction.SET_TO_TOP: {
      const updatedCompanyAndRole = await setCompanyToTop(userId, companyId);
      if (updatedCompanyAndRole) {
        const companyAndRole = formatCompanyAndRole(updatedCompanyAndRole);
        statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
        payload = companyAndRole;
      }
      break;
    }

    default:
      statusMessage = STATUS_MESSAGE.INVALID_INPUT_TYPE;
      break;
  }

  return { statusMessage, payload };
};

const handleDeleteRequest: IHandleRequest<APIName.COMPANY_DELETE, ICompany> = async ({
  query,
  session,
}) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ICompany | null = null;

  const { companyId } = query;
  const { userId } = session;
  const admin = await getAdminByCompanyIdAndUserId(userId, companyId);
  if (admin) {
    const deletedCompany = await deleteCompanyById(admin.companyId);
    await deleteAdminListByCompanyId(admin.companyId);
    const company = formatCompany(deletedCompany);
    payload = company;
  }
  statusMessage = STATUS_MESSAGE.SUCCESS_DELETE;
  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: ICompany | ICompanyAndRole | null }>;
} = {
  GET: (req, res) => withRequestValidation(APIName.COMPANY_GET_BY_ID, req, res, handleGetRequest),
  PUT: (req, res) => withRequestValidation(APIName.COMPANY_UPDATE, req, res, handlePutRequest),
  DELETE: (req, res) =>
    withRequestValidation(APIName.COMPANY_DELETE, req, res, handleDeleteRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ICompany | ICompanyAndRole | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ICompany | ICompanyAndRole | null = null;

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
    const { httpCode, result } = formatApiResponse<ICompany | ICompanyAndRole | null>(
      statusMessage,
      payload
    );
    res.status(httpCode).json(result);
  }
}
