import { NextApiRequest, NextApiResponse } from 'next';
import version from '../../../../../lib/version';
import { errorMessageToErrorCode } from '../../../../../lib/utils/errorCode';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;
  const { id } = req.query;
  try {
    // Info: (20240419 - Jacky) A010002 - GET /admin/:id
    if (method === 'GET') {
      if (id === '1') {
        const admin = {
          id: '1',
          name: 'bob',
          email: 'bob@mermer.cc',
          startDate: '2021-01-01',
          auditing: 'viewer',
          accounting: 'editor',
          internalControl: 'editor',
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
    } else if (method === 'PUT') {
      const { name, email, startDate, auditing, accounting, internalControl } = req.body;
      if (!name || !email || !startDate || !auditing || !accounting || !internalControl) {
        throw new Error('Invalid input parameter');
      }
      const admin = {
        id,
        name,
        email,
        startDate,
        auditing,
        accounting,
        internalControl,
      };
      res.status(200).json({
        powerby: 'ISunFa api ' + version,
        success: true,
        code: '200',
        message: 'Update admin successfully',
        payload: admin,
      });
      // Info: (20240419 - Jacky) A010005 - DELETE /admin/:id
    } else if (method === 'DELETE') {
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
