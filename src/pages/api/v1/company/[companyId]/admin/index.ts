import type { NextApiRequest, NextApiResponse } from 'next';
import { IAdmin } from '@/interfaces/admin';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { STATUS_CODE } from '@/constants/status_code';

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAdmin | IAdmin[]>>
) {
  try {
    if (req.method === 'GET') {
      const adminList: IAdmin[] = [
        {
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
        },
        {
          id: '2',
          name: 'alice',
          companyId: '1',
          companyName: 'mermer',
          credentialId: '2',
          publicKey: '2',
          algorithm: 'ES256',
          email: 'alice@mermer.cc',
          startDate: 134214124,
          endDate: 123123123,
          permissions: ['auditing_editor', 'accounting_editor', 'internalControl_editor'],
        },
      ];
      const { httpCode, result } = formatApiResponse<IAdmin[]>(STATUS_CODE.SUCCESS_LIST, adminList);
      res.status(httpCode).json(result);
      // Info: (20240419 - Jacky) A010003 - POST /admin
    } else if (req.method === 'POST') {
      const { name, email } = req.body;
      if (!name || !email) {
        throw new Error(STATUS_CODE.INVALID_INPUT_PARAMETER);
      }
      const admin: IAdmin = {
        id: '3',
        companyId: '1',
        companyName: 'mermer',
        name,
        credentialId: '3',
        publicKey: '3',
        algorithm: 'ES256',
        email,
        startDate: 124124124,
        endDate: 123123123,
        permissions: ['auditing_editor', 'accounting_editor', 'internalControl_editor'],
      };
      const { httpCode, result } = formatApiResponse<IAdmin>(STATUS_CODE.CREATED, admin);
      res.status(httpCode).json(result);
    } else {
      throw new Error(STATUS_CODE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IAdmin | IAdmin[]>(error.message, {} as IAdmin);
    res.status(httpCode).json(result);
  }
}
