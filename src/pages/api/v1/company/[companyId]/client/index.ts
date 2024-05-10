import { NextApiRequest, NextApiResponse } from 'next';
import { IClient } from '@/interfaces/client';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IClient | IClient[]>>
) {
  try {
    if (!req.headers.userid) {
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
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
      const { httpCode, result } = formatApiResponse<IClient[]>(
        STATUS_MESSAGE.SUCCESS_LIST,
        clientList
      );
      res.status(httpCode).json(result);
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
      const { httpCode, result } = formatApiResponse<IClient>(STATUS_MESSAGE.CREATED, newClient);
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
