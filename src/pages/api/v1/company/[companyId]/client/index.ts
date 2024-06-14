import { NextApiRequest, NextApiResponse } from 'next';
import { IClient } from '@/interfaces/client';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { createClient, listClient } from '@/lib/utils/repo/client.repo';
import { checkAdmin } from '@/lib/utils/auth_check';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IClient | IClient[]>>
) {
  try {
    // Info: (20240419 - Jacky) C010001 - GET /client
    const session = await checkAdmin(req, res);
    const { companyId } = session;
    if (req.method === 'GET') {
      const listedClient = await listClient(companyId);
      const { httpCode, result } = formatApiResponse<IClient[]>(
        STATUS_MESSAGE.SUCCESS_LIST,
        listedClient
      );
      res.status(httpCode).json(result);
      // Info: (20240419 - Jacky) C010003 - POST /client
    } else if (req.method === 'POST') {
      const { name, taxId, favorite } = req.body;
      const createdClient = await createClient(companyId, name, taxId, favorite);
      const { httpCode, result } = formatApiResponse<IClient>(
        STATUS_MESSAGE.CREATED,
        createdClient
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
