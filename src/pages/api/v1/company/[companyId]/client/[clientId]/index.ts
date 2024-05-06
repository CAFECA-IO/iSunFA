import { IClient } from '@/interfaces/client';
import { IResponseData } from '@/interfaces/response_data';
import { errorMessageToErrorCode } from '@/lib/utils/error_code';
import version from '@/lib/version';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IClient>>
) {
  const { method } = req;

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
    // Info: (20240419 - Jacky) C010002 - GET /client/:id
    if (method === 'GET') {
      const client: IClient = {
        id: '1',
        companyId: 'cafeca',
        companyName: 'Example Company',
        code: '1234',
        favorite: false,
      };
      res.status(200).json({
        powerby: 'ISunFa api ' + version,
        success: true,
        code: '200',
        message: 'list all clients',
        payload: client,
      });
      // Info: (20240419 - Jacky) C010004 - PUT /client/:id
    } else if (method === 'PUT') {
      const { name, code } = req.body;
      const client: IClient = {
        id: '1',
        companyId: 'cafeca',
        companyName: 'Example Company',
        code: '1234',
        favorite: false,
      };
      client.companyName = name;
      client.code = code;
      res.status(200).json({
        powerby: 'ISunFa api ' + version,
        success: true,
        code: '200',
        message: 'create client',
        payload: client,
      });
      // Info: (20240419 - Jacky) C010005 - DELETE /client/:id
    } else if (method === 'DELETE') {
      const client: IClient = {
        id: '1',
        companyId: 'cafeca',
        companyName: 'Example Company',
        code: '1234',
        favorite: false,
      };
      res.status(200).json({
        powerby: 'ISunFa api ' + version,
        success: true,
        code: '200',
        message: 'delete ' + client.id + ' client',
        payload: client,
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
