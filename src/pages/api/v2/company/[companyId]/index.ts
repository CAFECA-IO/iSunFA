import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { IAccountBook, ACCOUNT_BOOK_UPDATE_ACTION } from '@/interfaces/account_book';
import { formatApiResponse } from '@/lib/utils/common';
import { deleteCompanyById } from '@/lib/utils/repo/company.repo';
import { formatCompany } from '@/lib/utils/formatter/company.formatter';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { APIName } from '@/constants/api_connection';
import { withRequestValidation } from '@/lib/utils/middleware';

const handleGetRequest: IHandleRequest<APIName.COMPANY_GET_BY_ID, IAccountBook> = async ({
  query,
  session,
}) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccountBook | null = null;

  const { companyId } = query;
  const { userId } = session;
  const getCompanyAndRole = await getCompanyAndRoleByUserIdAndCompanyId(userId, companyId);
  statusMessage = STATUS_MESSAGE.SUCCESS_GET;
  payload = getCompanyAndRole;

  return { statusMessage, payload };
};

const handlePutRequest: IHandleRequest<APIName.COMPANY_UPDATE, IAccountBook> = async ({
  query,
  body,
  session,
}) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccountBook | null = null;

  const { companyId } = query;
  const { action, tag } = body;
  const { userId } = session;
  switch (action) {
    case ACCOUNT_BOOK_UPDATE_ACTION.UPDATE_TAG: {
      const admin = await getAdminByCompanyIdAndUserId(userId, companyId);
      if (admin && tag) {
        const updatedCompanyAndRole = await updateCompanyTagById(admin.id, tag);
        statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
        payload = {
          ...updatedCompanyAndRole,
          teamId: updatedCompanyAndRole.company.teamId,
        };
      }
      break;
    }
    default:
      statusMessage = STATUS_MESSAGE.INVALID_INPUT_TYPE;
      break;
  }

  return { statusMessage, payload };
};

const handleDeleteRequest: IHandleRequest<APIName.COMPANY_DELETE, IAccountBook> = async ({
  query,
  session,
}) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccountBook | null = null;

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
  ) => Promise<{ statusMessage: string; payload: IAccountBook | IAccountBookForUser | null }>;
} = {
  GET: (req) => withRequestValidation(APIName.COMPANY_GET_BY_ID, req, handleGetRequest),
  PUT: (req) => withRequestValidation(APIName.COMPANY_UPDATE, req, handlePutRequest),
  DELETE: (req) => withRequestValidation(APIName.COMPANY_DELETE, req, handleDeleteRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAccountBook | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccountBook | null = null;

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
    const { httpCode, result } = formatApiResponse<IAccountBook | IAccountBookForUser | null>(
      statusMessage,
      payload
    );
    res.status(httpCode).json(result);
  }
}
