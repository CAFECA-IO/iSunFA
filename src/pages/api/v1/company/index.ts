import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { ICompany } from '@/interfaces/company';
import { IResponseData } from '@/interfaces/response_data';
import { IRole } from '@/interfaces/role';
import { formatApiResponse } from '@/lib/utils/common';
import {
  formatCompanyAndRole,
  formatCompanyAndRoleList,
} from '@/lib/utils/formatter/admin.formatter';
import { createCompanyAndRole, listCompanyAndRole } from '@/lib/utils/repo/admin.repo';
import { getUserById } from '@/lib/utils/repo/user.repo';
import { getSession } from '@/lib/utils/session';

async function checkAuth(userId: number) {
  let isValid = true;
  const getUser = await getUserById(userId);
  if (!getUser) {
    isValid = false;
  }
  return isValid;
}

async function checkInput(code: string, name: string, regional: string) {
  let isValid = true;
  if (!code || !name || !regional) {
    isValid = false;
  }
  return isValid;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    IResponseData<
      { company: ICompany; role: IRole } | Array<{ company: ICompany; role: IRole }> | null
    >
  >
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload:
    | { company: ICompany; role: IRole }
    | Array<{ company: ICompany; role: IRole }>
    | null = null;

  try {
    switch (req.method) {
      case 'GET': {
        const session = await getSession(req, res);
        const { userId } = session;
        const isAuth = await checkAuth(userId);
        if (!isAuth) {
          statusMessage = STATUS_MESSAGE.FORBIDDEN;
        } else {
          const listedCompanyAndRole = await listCompanyAndRole(userId);
          const companyAndRoleList = await formatCompanyAndRoleList(listedCompanyAndRole);
          statusMessage = STATUS_MESSAGE.SUCCESS_GET;
          payload = companyAndRoleList;
        }
        break;
      }
      case 'POST': {
        const { code, name, regional } = req.body;
        const isValid = await checkInput(code, name, regional);
        if (!isValid) {
          statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
        } else {
          const session = await getSession(req, res);
          const { userId } = session;
          const isAuth = await checkAuth(userId);
          if (isAuth) {
            statusMessage = STATUS_MESSAGE.FORBIDDEN;
          } else {
            const createdCompanyRoleList = await createCompanyAndRole(userId, code, name, regional);
            const newCompanyRoleList = await formatCompanyAndRole(createdCompanyRoleList);
            statusMessage = STATUS_MESSAGE.CREATED;
            payload = newCompanyRoleList;
          }
        }
        break;
      }
      default:
        statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
    payload = null;
  }

  const { httpCode, result } = formatApiResponse<
    { company: ICompany; role: IRole } | Array<{ company: ICompany; role: IRole }> | null
  >(statusMessage, payload);
  res.status(httpCode).json(result);
}
