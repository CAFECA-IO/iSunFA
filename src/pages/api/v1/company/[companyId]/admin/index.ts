import type { NextApiRequest, NextApiResponse } from 'next';
import { IAdmin } from '@/interfaces/admin';
import version from '@/lib/version';
import { errorMessageToErrorCode } from '@/lib/utils/error_code';
import { IResponseData } from '@/interfaces/response_data';

export default function handler(req: NextApiRequest, res: NextApiResponse<IResponseData<IAdmin>>) {
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
      res.status(200).json({
        powerby: 'ISunFa api ' + version,
        success: true,
        code: '200',
        message: 'list all admins',
        payload: adminList,
      });
      // Info: (20240419 - Jacky) A010003 - POST /admin
    } else if (req.method === 'POST') {
      const { name, email } = req.body;
      if (!name || !email) {
        throw new Error('INVALID_INPUT_PARAMETER');
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
      res.status(200).json({
        powerby: 'ISunFa api ' + version,
        success: true,
        code: '200',
        message: 'Create admin successfully',
        payload: admin,
      });
    } else {
      throw new Error('METHOD_NOT_ALLOWED');
    }
  } catch (_error) {
    const error = _error as Error;
    const statusCode = errorMessageToErrorCode(error.message);
    res.status(statusCode).json({
      powerby: 'ISunFa api ' + version,
      success: false,
      code: String(statusCode),
      payload: {},
      message: error.message,
    });
  }
}
