import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { convertStringToNumber, formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { IAdmin } from '@/interfaces/admin';
import { checkAdmin, checkCompanyAdminMatch, checkRole } from '@/lib/utils/auth_check';
import { ROLE_NAME } from '@/constants/role_name';
import { deleteAdminById, updateAdminById } from '@/lib/utils/repo/admin.repo';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAdmin | IAdmin[]>>
) {
  try {
    const { adminId } = req.query;
    const adminIdNum = await convertStringToNumber(adminId);
    if (req.method === 'GET') {
      const { companyId } = await checkAdmin(req, res);
      const admin: IAdmin = await checkCompanyAdminMatch(companyId, adminIdNum);
      const { httpCode, result } = formatApiResponse<IAdmin>(STATUS_MESSAGE.SUCCESS_GET, admin);
      res.status(httpCode).json(result);
      // Info: (20240419 - Jacky) S010003 - PUT /subscription/:id
    } else if (req.method === 'PUT') {
      const { status, roleName } = req.body;
      if (!status && !roleName) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }
      const session = await checkRole(req, res, ROLE_NAME.OWNER);
      const { companyId } = session;
      const getAdmin: IAdmin = await checkCompanyAdminMatch(companyId, adminIdNum);
      const updatedAdmin: IAdmin = await updateAdminById(getAdmin.id, status, roleName);
      const { httpCode, result } = formatApiResponse<IAdmin>(
        STATUS_MESSAGE.SUCCESS_UPDATE,
        updatedAdmin
      );
      res.status(httpCode).json(result);
    } else if (req.method === 'DELETE') {
      const session = await checkRole(req, res, ROLE_NAME.SUPER_ADMIN);
      const { companyId } = session;
      const getAdmin: IAdmin = await checkCompanyAdminMatch(companyId, adminIdNum);
      const deletedAdmin: IAdmin = await deleteAdminById(getAdmin.id);
      const { httpCode, result } = formatApiResponse<IAdmin>(
        STATUS_MESSAGE.SUCCESS_DELETE,
        deletedAdmin
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
