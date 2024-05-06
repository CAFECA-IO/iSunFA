import { NextApiRequest, NextApiResponse } from 'next';
import version from '@/lib/version';
import { errorMessageToErrorCode } from '@/lib/utils/errorCode';
import { IClient } from '@/interfaces/client';
import { IResponseData } from '../../../../../../interfaces/response_data';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IClient>>
) {
  try {
    if (!req.headers.userId) {
      throw new Error('Resource not found');
    }
    // Info: (20240419 - Jacky) C010001 - GET /client
    if (req.method === 'GET') {
      const clientList: IClient[] = [
        {
          id: '1',
          companyId: '123',
          companyName: 'Company A',
          code: '1234',
          favorite: false,
        },
        {
          id: '2',
          companyId: '456',
          companyName: 'Company B',
          code: '3333',
          favorite: false,
        },
      ];
      res.status(200).json({
        powerby: 'ISunFa api ' + version,
        success: true,
        code: '200',
        message: 'list all clients',
        payload: clientList,
      });
      // Info: (20240419 - Jacky) C010003 - POST /client
    } else if (req.method === 'POST') {
      const { companyId, code } = req.body;
      const newClient: IClient = {
        id: '3',
        companyId,
        companyName: 'Company C',
        code,
        favorite: false,
      };
      res.status(200).json({
        powerby: 'ISunFa api ' + version,
        success: true,
        code: '200',
        message: 'create client',
        payload: newClient,
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
