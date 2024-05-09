import { NextApiRequest, NextApiResponse } from 'next';
import { IAdmin } from '@/interfaces/admin';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_CODE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';

export default function handler(req: NextApiRequest, res: NextApiResponse<IResponseData<IAdmin>>) {
  const { adminId } = req.query;
  try {
    if (!req.headers.userId) {
      throw new Error(STATUS_CODE.RESOURCE_NOT_FOUND);
    }
    if (!adminId) {
      throw new Error(STATUS_CODE.INVALID_INPUT_PARAMETER);
    }
    if (adminId !== '1') {
      throw new Error(STATUS_CODE.RESOURCE_NOT_FOUND);
    }
    // Info: (20240419 - Jacky) A010002 - GET /admin/:id
    if (req.method === 'GET') {
      if (adminId === '1') {
        const admin: IAdmin = {
          id: '1',
          name: 'bob',
          credentialId: '1',
          publicKey: '1',
          algorithm: 'ES256',
          companyId: '1',
          companyName: 'mermer',
          email: 'bob@mermer.cc',
          startDate: 21321321,
          endDate: 123123123,
          permissions: ['auditing_viewer', 'accounting_editor', 'internalControl_editor'],
        };
        const { httpCode, result } = formatApiResponse<IAdmin>(STATUS_CODE.SUCCESS_GET, admin);
        res.status(httpCode).json(result);
      } else {
        throw new Error(STATUS_CODE.RESOURCE_NOT_FOUND);
      }
      // Info: (20240419 - Jacky) A010004 - PUT /admin/:id
    } else if (req.method === 'PUT') {
      const { name, email, startDate, permissions } = req.body;
      if (!name || !email || !startDate || !permissions) {
        throw new Error(STATUS_CODE.INVALID_INPUT_PARAMETER);
      }
      const admin: IAdmin = {
        id: adminId as string,
        name,
        credentialId: '1',
        publicKey: '1',
        algorithm: 'ES256',
        companyId: '1',
        companyName: 'mermer',
        email,
        startDate,
        endDate: 123123123,
        permissions,
      };
      const { httpCode, result } = formatApiResponse<IAdmin>(STATUS_CODE.SUCCESS, admin);
      res.status(httpCode).json(result);
      // Info: (20240419 - Jacky) A010005 - DELETE /admin/:id
    } else if (req.method === 'DELETE') {
      const admin: IAdmin = {
        id: '1',
        name: 'bob',
        credentialId: '1',
        publicKey: '1',
        algorithm: 'ES256',
        companyId: '1',
        companyName: 'mermer',
        email: 'bob@mermer.cc',
        startDate: 21321321,
        endDate: 123123123,
        permissions: ['auditing_viewer', 'accounting_editor', 'internalControl_editor'],
      };
      const { httpCode, result } = formatApiResponse<IAdmin>(STATUS_CODE.SUCCESS, admin);
      res.status(httpCode).json(result);
    } else {
      throw new Error(STATUS_CODE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IAdmin>(error.message, {} as IAdmin);
    res.status(httpCode).json(result);
  }
}
