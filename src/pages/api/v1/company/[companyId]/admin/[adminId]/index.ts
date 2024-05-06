import { NextApiRequest, NextApiResponse } from 'next';
import { IAdmin } from '@/interfaces/admin';
import { IResponseData } from '@/interfaces/response_data';
import version from '../../../../../../../lib/version';
import { errorMessageToErrorCode } from '../../../../../../../lib/utils/error_code';

export default function handler(req: NextApiRequest, res: NextApiResponse<IResponseData<IAdmin>>) {
  const { id } = req.query;
  try {
    if (!req.headers.userId) {
      throw new Error('Resource not found');
    }
    if (!req.query.id) {
      throw new Error('Invalid input parameter');
    }
    if (req.query.id !== '1') {
      throw new Error('Resource not found');
    }
    // Info: (20240419 - Jacky) A010002 - GET /admin/:id
    if (req.method === 'GET') {
      if (id === '1') {
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
        res.status(200).json({
          powerby: 'ISunFa api ' + version,
          success: true,
          code: '200',
          message: 'get admin by id',
          payload: admin,
        });
      } else {
        throw new Error('Resource not found');
      }
      // Info: (20240419 - Jacky) A010004 - PUT /admin/:id
    } else if (req.method === 'PUT') {
      const { name, email, startDate, permissions } = req.body;
      if (!name || !email || !startDate || !permissions) {
        throw new Error('Invalid input parameter');
      }
      const admin: IAdmin = {
        id: id as string,
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
      res.status(200).json({
        powerby: 'ISunFa api ' + version,
        success: true,
        code: '200',
        message: 'Update admin successfully',
        payload: admin,
      });
      // Info: (20240419 - Jacky) A010005 - DELETE /admin/:id
    } else if (req.method === 'DELETE') {
      res.status(200).json({
        powerby: 'ISunFa api ' + version,
        success: true,
        code: '200',
        message: 'Delete admin successfully',
        payload: {},
      });
    } else {
      throw new Error('Method Not Allowed');
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
