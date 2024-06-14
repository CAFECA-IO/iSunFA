import { STATUS_MESSAGE } from '@/constants/status_code';
import { ICompany } from '@/interfaces/company';
import { IResponseData } from '@/interfaces/response_data';
import { IRole } from '@/interfaces/role';
import { checkUser } from '@/lib/utils/auth_check';
import { formatApiResponse } from '@/lib/utils/common';
import {
  formatCompanyAndRole,
  formatCompanyAndRoleList,
} from '@/lib/utils/formatter/admin.formatter';
import { formatUser } from '@/lib/utils/formatter/user.formatter';
import { createCompanyAndRole, listCompanyAndRole } from '@/lib/utils/repo/admin.repo';
import { getUserById } from '@/lib/utils/repo/user.repo';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    IResponseData<{ company: ICompany; role: IRole } | Array<{ company: ICompany; role: IRole }>>
  >
) {
  try {
    const session = await checkUser(req, res);
    const { userId } = session;
    if (req.method === 'GET') {
      const listedCompanyAndRole = await listCompanyAndRole(userId);
      const companyAndRoleList = await formatCompanyAndRoleList(listedCompanyAndRole);
      const { httpCode, result } = formatApiResponse<Array<{ company: ICompany; role: IRole }>>(
        STATUS_MESSAGE.SUCCESS_GET,
        companyAndRoleList
      );
      res.status(httpCode).json(result);
    } else if (req.method === 'POST') {
      const { code, name, regional } = req.body;
      if (!code || !name || !regional) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }
      const getUser = await getUserById(userId);
      const user = await formatUser(getUser);
      const createdCompanyRoleList = await createCompanyAndRole(user, code, name, regional);
      const newCompanyRoleList = await formatCompanyAndRole(createdCompanyRoleList);
      const { httpCode, result } = formatApiResponse<{ company: ICompany; role: IRole }>(
        STATUS_MESSAGE.CREATED,
        newCompanyRoleList
      );
      res.status(httpCode).json(result);
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<{ company: ICompany; role: IRole }>(
      error.message,
      {} as { company: ICompany; role: IRole }
    );
    res.status(httpCode).json(result);
  }
}
