import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { convertStringToNumber, formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { IAdmin } from '@/interfaces/admin';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { deleteAdminById, getAdminById, updateAdminById } from '@/lib/utils/repo/admin.repo';
import { formatAdmin } from '@/lib/utils/formatter/admin.formatter';
import { AuthFunctionsKeyStr } from '@/constants/auth';
import { getSession } from '@/lib/utils/session';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAdmin | IAdmin[]>>
) {
  try {
    const { adminId } = req.query;
    const adminIdNum = convertStringToNumber(adminId);
    if (req.method === 'GET') {
      const session = await getSession(req, res);
      const { userId, companyId } = session;
      const isAuth = await checkAuthorization(
        [AuthFunctionsKeyStr.CompanyAdminMatch, AuthFunctionsKeyStr.admin],
        { userId, companyId, adminId: adminIdNum }
      );
      if (!isAuth) {
        throw new Error(STATUS_MESSAGE.FORBIDDEN);
      }
      const getAdmin = await getAdminById(adminIdNum);
      if (!getAdmin) {
        throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
      }
      const admin = await formatAdmin(getAdmin);
      const { httpCode, result } = formatApiResponse<IAdmin>(STATUS_MESSAGE.SUCCESS_GET, admin);
      res.status(httpCode).json(result);
      // Info: (20240419 - Jacky) S010003 - PUT /subscription/:id
    } else if (req.method === 'PUT') {
      const { status, roleName } = req.body;
      if (typeof status !== 'boolean' && !roleName) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }
      const session = await getSession(req, res);
      const { userId, companyId } = session;
      const isAuth = await checkAuthorization(
        [AuthFunctionsKeyStr.owner, AuthFunctionsKeyStr.CompanyAdminMatch],
        { userId, companyId, adminId: adminIdNum }
      );
      if (!isAuth) {
        throw new Error(STATUS_MESSAGE.FORBIDDEN);
      }
      const updatedAdmin = await updateAdminById(adminIdNum, status, roleName);
      const admin = await formatAdmin(updatedAdmin);
      const { httpCode, result } = formatApiResponse<IAdmin>(STATUS_MESSAGE.SUCCESS_UPDATE, admin);
      res.status(httpCode).json(result);
    } else if (req.method === 'DELETE') {
      const session = await getSession(req, res);
      const { userId, companyId } = session;
      const isAuth = await checkAuthorization(
        [AuthFunctionsKeyStr.owner, AuthFunctionsKeyStr.CompanyAdminMatch],
        { userId, companyId, adminId: adminIdNum }
      );
      if (!isAuth) {
        throw new Error(STATUS_MESSAGE.FORBIDDEN);
      }
      const deletedAdmin = await deleteAdminById(adminIdNum);
      const admin = await formatAdmin(deletedAdmin);
      const { httpCode, result } = formatApiResponse<IAdmin>(STATUS_MESSAGE.SUCCESS_DELETE, admin);
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
