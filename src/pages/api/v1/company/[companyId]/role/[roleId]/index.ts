import { NextApiRequest, NextApiResponse } from 'next';
import { IRole } from '@/interfaces/role';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';

export default function handler(req: NextApiRequest, res: NextApiResponse<IResponseData<IRole>>) {
  const { roleId } = req.query;
  try {
    if (!req.headers.userid) {
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }
    if (!roleId) {
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    }
    // Info: (20240419 - Jacky) A010002 - GET /admin/:id
    if (req.method === 'GET') {
      if (roleId === '1') {
        const admin: IRole = {
          id: 1,
          name: 'bob',
          companyId: 1,
          companyName: 'mermer',
          permissions: ['auditing_viewer', 'accounting_editor', 'internalControl_editor'],
        };
        const { httpCode, result } = formatApiResponse<IRole>(STATUS_MESSAGE.SUCCESS_GET, admin);
        res.status(httpCode).json(result);
      } else {
        throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
      }
      // Info: (20240419 - Jacky) A010004 - PUT /admin/:id
    } else if (req.method === 'PUT') {
      const { name, email, startDate, permissions } = req.body;
      if (!name || !email || !startDate || !permissions) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }
      const role: IRole = {
        id: Number(roleId),
        name,
        companyId: 1,
        companyName: 'mermer',
        permissions,
      };
      const { httpCode, result } = formatApiResponse<IRole>(STATUS_MESSAGE.SUCCESS, role);
      res.status(httpCode).json(result);
      // Info: (20240419 - Jacky) A010005 - DELETE /admin/:id
    } else if (req.method === 'DELETE') {
      const admin: IRole = {
        id: 1,
        name: 'bob',
        companyId: 1,
        companyName: 'mermer',
        permissions: ['auditing_viewer', 'accounting_editor', 'internalControl_editor'],
      };
      const { httpCode, result } = formatApiResponse<IRole>(STATUS_MESSAGE.SUCCESS, admin);
      res.status(httpCode).json(result);
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IRole>(error.message, {} as IRole);
    res.status(httpCode).json(result);
  }
}
