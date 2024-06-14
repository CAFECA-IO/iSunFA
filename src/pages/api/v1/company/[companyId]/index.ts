import { STATUS_MESSAGE } from '@/constants/status_code';
import { ICompany } from '@/interfaces/company';
import { IResponseData } from '@/interfaces/response_data';
import { convertStringToNumber, formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { checkRole, checkUser } from '@/lib/utils/auth_check';
import { deleteCompanyById, updateCompanyById } from '@/lib/utils/repo/company.repo';
import { ROLE_NAME } from '@/constants/role_name';
import {
  deleteAdminListByCompanyId,
  getAdminByCompanyIdAndUserId,
} from '@/lib/utils/repo/admin.repo';
import { formatCompany } from '@/lib/utils/formatter/company.formatter';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ICompany>>
) {
  const { method } = req;

  try {
    if (method === 'GET') {
      const companyId = await convertStringToNumber(req.query.companyId);
      const session = await checkUser(req, res);
      const { userId } = session;
      const getAdmin = await getAdminByCompanyIdAndUserId(companyId, userId);
      const company: ICompany = await formatCompany(getAdmin.company);
      const { httpCode, result } = formatApiResponse<ICompany>(STATUS_MESSAGE.SUCCESS_GET, company);
      res.status(httpCode).json(result);
      // Info: (20240419 - Jacky) C010004 - PUT /client/:id
    } else if (method === 'PUT') {
      const { code, name, regional } = req.body;
      if (!code && !name && !regional) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }
      const session = await checkRole(req, res, ROLE_NAME.OWNER);
      const { companyId } = session;
      const updatedCompany = await updateCompanyById(companyId, code, name, regional);
      const company: ICompany = await formatCompany(updatedCompany);
      const { httpCode, result } = formatApiResponse<ICompany>(
        STATUS_MESSAGE.SUCCESS_UPDATE,
        company
      );
      res.status(httpCode).json(result);
      // Info: (20240419 - Jacky) C010005 - DELETE /client/:id
    } else if (method === 'DELETE') {
      const session = await checkRole(req, res, ROLE_NAME.OWNER);
      const { companyId } = session;
      await deleteAdminListByCompanyId(companyId);
      const deletedCompany = await deleteCompanyById(companyId);
      const company: ICompany = await formatCompany(deletedCompany);
      const { httpCode, result } = formatApiResponse<ICompany>(
        STATUS_MESSAGE.SUCCESS_DELETE,
        company
      );
      res.status(httpCode).json(result);
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<ICompany>(error.message, {} as ICompany);
    res.status(httpCode).json(result);
  }
}
