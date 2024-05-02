import type { NextApiRequest, NextApiResponse } from 'next';
import { IAdmin } from '@/interfaces/admin';
import { IResponseData } from '../../../../../../interfaces/response_data';
import version from '../../../../../../lib/version';
import { errorMessageToErrorCode } from '../../../../../../lib/utils/errorCode';

export default function handler(req: NextApiRequest, res: NextApiResponse<IResponseData<IAdmin>>) {
  try {
    if (!req.headers.userId) {
      throw new Error('Resource not found');
    }
    // Info: (20240419 - Jacky) A010001 - GET /admin
    if (req.method === 'GET') {
      const adminList: IAdmin[] = [
        {
          id: '1',
          companyId: '1',
          companyName: 'mermer',
          userId: '1',
          userName: 'bob',
          email: 'bob@mermer.cc',
          startDate: 21321321,
          auditing: 'viewer',
          accounting: 'editor',
          internalControl: 'editor',
        },
        {
          id: '2',
          companyId: '1',
          companyName: 'mermer',
          userId: '2',
          userName: 'alice',
          email: 'alice@mermer.cc',
          startDate: 134214124,
          auditing: 'viewer',
          accounting: 'editor',
          internalControl: 'editor',
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
        throw new Error('Invalid input parameter');
      }
      const admin: IAdmin = {
        id: '3',
        companyId: '1',
        companyName: 'mermer',
        userId: '3',
        userName: name,
        email,
        startDate: 124124124,
        auditing: 'editor',
        accounting: 'editor',
        internalControl: 'editor',
      };
      res.status(200).json({
        powerby: 'ISunFa api ' + version,
        success: true,
        code: '200',
        message: 'Create admin successfully',
        payload: admin,
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
