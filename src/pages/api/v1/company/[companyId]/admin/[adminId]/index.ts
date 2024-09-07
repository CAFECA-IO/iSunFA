import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { IAdmin } from '@/interfaces/admin';
import { convertStringToNumber, formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { deleteAdminById, getAdminById, updateAdminById } from '@/lib/utils/repo/admin.repo';
import { formatAdmin } from '@/lib/utils/formatter/admin.formatter';
import { AuthFunctionsKeys } from '@/interfaces/auth';
import { getSession } from '@/lib/utils/session';

async function handleGetRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAdmin | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAdmin | null = null;

  const { adminId } = req.query;
  const adminIdNum = convertStringToNumber(adminId);
  const session = await getSession(req, res);
  const { userId, companyId } = session;

  if (!userId) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    const isAuth = await checkAuthorization(
      [AuthFunctionsKeys.CompanyAdminMatch, AuthFunctionsKeys.admin],
      { userId, companyId, adminId: adminIdNum }
    );

    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
    } else {
      const getAdmin = await getAdminById(adminIdNum);
      if (!getAdmin) {
        statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
      } else {
        const admin = await formatAdmin(getAdmin);
        statusMessage = STATUS_MESSAGE.SUCCESS_GET;
        payload = admin;
      }
    }
  }

  return { statusMessage, payload };
}

async function handlePutRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAdmin | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAdmin | null = null;

  const { adminId } = req.query;
  const adminIdNum = convertStringToNumber(adminId);
  const { status, roleName } = req.body;

  if (typeof status !== 'boolean' && !roleName) {
    statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
  } else {
    const session = await getSession(req, res);
    const { userId, companyId } = session;

    if (!userId) {
      statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
    } else {
      const isAuth = await checkAuthorization(
        [AuthFunctionsKeys.owner, AuthFunctionsKeys.CompanyAdminMatch],
        { userId, companyId, adminId: adminIdNum }
      );

      if (!isAuth) {
        statusMessage = STATUS_MESSAGE.FORBIDDEN;
      } else {
        const updatedAdmin = await updateAdminById(adminIdNum, status, roleName);
        const admin = await formatAdmin(updatedAdmin);
        statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
        payload = admin;
      }
    }
  }

  return { statusMessage, payload };
}

async function handleDeleteRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAdmin | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAdmin | null = null;

  const { adminId } = req.query;
  const adminIdNum = convertStringToNumber(adminId);
  const session = await getSession(req, res);
  const { userId, companyId } = session;

  if (!userId) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    const isAuth = await checkAuthorization(
      [AuthFunctionsKeys.owner, AuthFunctionsKeys.CompanyAdminMatch],
      { userId, companyId, adminId: adminIdNum }
    );

    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
    } else {
      const deletedAdmin = await deleteAdminById(adminIdNum);
      const admin = await formatAdmin(deletedAdmin);
      statusMessage = STATUS_MESSAGE.SUCCESS_DELETE;
      payload = admin;
    }
  }

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: IAdmin | null }>;
} = {
  GET: handleGetRequest,
  PUT: handlePutRequest,
  DELETE: handleDeleteRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAdmin | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAdmin | null = null;

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
    const { httpCode, result } = formatApiResponse<IAdmin | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
