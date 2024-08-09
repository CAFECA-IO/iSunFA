import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { IAdmin } from '@/interfaces/admin';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { listAdminByCompanyId } from '@/lib/utils/repo/admin.repo';
import { formatAdminList } from '@/lib/utils/formatter/admin.formatter';
import { getSession } from '@/lib/utils/session';
import { AuthFunctionsKeys } from '@/interfaces/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAdmin | IAdmin[]>>
) {
  try {
    if (req.method === 'GET') {
      const session = await getSession(req, res);
      const { userId, companyId } = session;
      const isAuth = await checkAuthorization([AuthFunctionsKeys.admin], { userId, companyId });
      if (!isAuth) {
        throw new Error(STATUS_MESSAGE.FORBIDDEN);
      }
      const listedAdmin = await listAdminByCompanyId(companyId);
      const adminList = await formatAdminList(listedAdmin);
      const { httpCode, result } = formatApiResponse<IAdmin[]>(
        STATUS_MESSAGE.SUCCESS_GET,
        adminList
      );
      res.status(httpCode).json(result);
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IAdmin>(error.message, {} as IAdmin);
    res.status(httpCode).json(result);
  }
}
