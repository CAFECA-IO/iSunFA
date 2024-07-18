import { NextApiRequest, NextApiResponse } from 'next';
import { ICompany } from '@/interfaces/company';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { convertStringToNumber, formatApiResponse } from '@/lib/utils/common';
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
  res: NextApiResponse<IResponseData<ICompany | null>>
) {
  let shouldContinue: boolean = true;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ICompany | null = null;

  try {
    const session = await checkUser(req, res);
    const { userId } = session;
    const companyId = convertStringToNumber(req.query.companyId);

    switch (req.method) {
      case 'GET': {
        const getAdmin = await getAdminByCompanyIdAndUserId(companyId, userId);
        if (getAdmin) {
          const company = await formatCompany(getAdmin.company);
          statusMessage = STATUS_MESSAGE.SUCCESS_GET;
          payload = company;
        }
        break;
      }
      case 'PUT': {
        const { code, name, regional } = req.body;
        if (!code && !name && !regional) {
          shouldContinue = false;
          statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
        }
        if (shouldContinue) {
          await checkRole(req, res, ROLE_NAME.OWNER);
          const updatedCompany = await updateCompanyById(companyId, code, name, regional);
          if (!updatedCompany) {
            shouldContinue = false;
            statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
          } else {
            const company = await formatCompany(updatedCompany);
            statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
            payload = company;
          }
        }
        break;
      }
      case 'DELETE': {
        await checkRole(req, res, ROLE_NAME.OWNER);
        await deleteAdminListByCompanyId(companyId);
        const deletedCompany = await deleteCompanyById(companyId);
        const company = await formatCompany(deletedCompany);
        statusMessage = STATUS_MESSAGE.SUCCESS_DELETE;
        payload = company;
        break;
      }
      default:
        shouldContinue = false;
        statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
    payload = null;
  }

  const { httpCode, result } = formatApiResponse<ICompany | null>(statusMessage, payload);
  res.status(httpCode).json(result);
}
