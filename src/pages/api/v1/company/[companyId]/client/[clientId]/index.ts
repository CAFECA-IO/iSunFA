import { STATUS_MESSAGE } from '@/constants/status_code';
import { IClient } from '@/interfaces/client';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IClient>>
) {
  const { method } = req;

  try {
    if (!req.headers.userid) {
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }
    if (!req.query.clientId) {
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    }
    if (req.query.clientId !== '1') {
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
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
      const { httpCode, result } = formatApiResponse<IClient>(STATUS_MESSAGE.SUCCESS_GET, client);
      res.status(httpCode).json(result);
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
      const { httpCode, result } = formatApiResponse<IClient>(
        STATUS_MESSAGE.SUCCESS_UPDATE,
        client
      );
      res.status(httpCode).json(result);
      // Info: (20240419 - Jacky) C010005 - DELETE /client/:id
    } else if (method === 'DELETE') {
      const client: IClient = {
        id: '1',
        companyId: 'cafeca',
        companyName: 'Example Company',
        code: '1234',
        favorite: false,
      };
      const { httpCode, result } = formatApiResponse<IClient>(
        STATUS_MESSAGE.SUCCESS_DELETE,
        client
      );
      res.status(httpCode).json(result);
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IClient>(error.message, {} as IClient);
    res.status(httpCode).json(result);
  }
}
