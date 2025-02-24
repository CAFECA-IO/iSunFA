import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { IAccountBook, ICompanyAndRoleDetail } from '@/interfaces/company';
import { convertStringToNumber, formatApiResponse } from '@/lib/utils/common';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { getSession } from '@/lib/utils/session';
import {
  getCompanyById,
  deleteCompanyById,
  updateCompanyById,
} from '@/lib/utils/repo/company.repo';
import { formatCompany } from '@/lib/utils/formatter/company.formatter';
import {
  deleteAdminListByCompanyId,
  getCompanyDetailAndRoleByCompanyId,
} from '@/lib/utils/repo/admin.repo';
import { formatCompanyDetailAndRole } from '@/lib/utils/formatter/admin.formatter';
import { AuthFunctionsKeys } from '@/interfaces/auth';

async function handleGetRequest(req: NextApiRequest) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccountBook | ICompanyAndRoleDetail | null = null;

  const companyIdNum = convertStringToNumber(req.query.companyId);
  const session = await getSession(req);
  const { userId } = session;
  const isAuth = await checkAuthorization([AuthFunctionsKeys.user], { userId });
  if (!userId) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else if (!isAuth) {
    statusMessage = STATUS_MESSAGE.FORBIDDEN;
  } else {
    const companyWithOwner = await getCompanyDetailAndRoleByCompanyId(userId, companyIdNum);
    if (companyWithOwner) {
      const companyDetailAndRole = formatCompanyDetailAndRole(companyWithOwner);
      statusMessage = STATUS_MESSAGE.SUCCESS_GET;
      payload = companyDetailAndRole;
    }
  }

  return { statusMessage, payload };
}

async function handlePutRequest(req: NextApiRequest) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccountBook | null = null;

  const companyIdNum = convertStringToNumber(req.query.companyId);
  const { code, name, regional } = req.body;
  const session = await getSession(req);
  const { userId } = session;
  if (!userId) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    const isAuth = await checkAuthorization([AuthFunctionsKeys.owner], {
      userId,
      companyId: companyIdNum,
    });
    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
    } else {
      const getCompany = await getCompanyById(companyIdNum);
      if (getCompany) {
        const updatedCompany = await updateCompanyById(companyIdNum, code, name, regional);
        const company = formatCompany(updatedCompany);
        payload = company;
      }
      statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
    }
  }

  return { statusMessage, payload };
}

async function handleDeleteRequest(req: NextApiRequest) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccountBook | null = null;

  const companyIdNum = convertStringToNumber(req.query.companyId);
  const session = await getSession(req);
  const { userId } = session;
  if (!userId) {
    statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
  } else {
    const isAuth = await checkAuthorization([AuthFunctionsKeys.owner], {
      userId,
      companyId: companyIdNum,
    });
    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
    } else {
      const getCompany = await getCompanyById(companyIdNum);
      if (getCompany) {
        const deletedCompany = await deleteCompanyById(companyIdNum);
        await deleteAdminListByCompanyId(companyIdNum);
        const company = formatCompany(deletedCompany);
        payload = company;
      }
      statusMessage = STATUS_MESSAGE.SUCCESS_DELETE;
    }
  }
  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: IAccountBook | ICompanyAndRoleDetail | null }>;
} = {
  GET: handleGetRequest,
  DELETE: handleDeleteRequest,
  PUT: handlePutRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAccountBook | ICompanyAndRoleDetail | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccountBook | ICompanyAndRoleDetail | null = null;

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
    const { httpCode, result } = formatApiResponse<IAccountBook | ICompanyAndRoleDetail | null>(
      statusMessage,
      payload
    );
    res.status(httpCode).json(result);
  }
}
