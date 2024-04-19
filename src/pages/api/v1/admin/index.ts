import type { NextApiRequest, NextApiResponse } from 'next';
import type { ResponseData } from '../../../../type/iresponsedata';
import version from '../../../../lib/version';
import { errorMessageToErrorCode } from '../../../../lib/utils/errorCode';

export default function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  try {
    // Info: (20240419 - Jacky) A010001 - GET /admin
    if (req.method === 'GET') {
      const adminList = [
        {
          id: '1',
          name: 'bob',
          email: 'bob@mermer.cc',
          startDate: '2021-01-01',
          auditing: 'viewer',
          accounting: 'editor',
          internalControl: 'editor',
        },
        {
          id: '2',
          name: 'alice',
          email: 'alice@mermer.cc',
          startDate: '2021-01-01',
          auditing: 'viewer',
          accounting: 'editor',
          internalControl: 'editor',
        },
      ];
      if (req.headers.userId) {
        const { userId } = req.headers;
        if (userId === '1') {
          res.status(200).json({
            powerby: 'ISunFa api ' + version,
            success: true,
            code: '200',
            message: 'list all admins',
            payload: adminList,
          });
        } else {
          throw new Error('Resource not found');
        }
      }
    }
    // Info: (20240419 - Jacky) A010003 - POST /admin
    if (req.method === 'POST') {
      const { name, email } = req.body;
      if (!name || !email) {
        throw new Error('Invalid input parameter');
      }
      const admin = {
        id: '3',
        name,
        email,
        startDate: '2021-01-01',
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
    }
    if (req.method !== 'POST' && req.method !== 'GET') {
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
