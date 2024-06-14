import { STATUS_MESSAGE } from '@/constants/status_code';
import { IClient } from '@/interfaces/client';
import { IResponseData } from '@/interfaces/response_data';
import { checkAdmin } from '@/lib/utils/auth_check';
import { formatApiResponse } from '@/lib/utils/common';
import { deleteClientById, getClientById, updateClientById } from '@/lib/utils/repo/client.repo';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IClient>>
) {
  const { method } = req;
  const { clientId } = req.query;
  const clientIdNum = Number(clientId);

  try {
    await checkAdmin(req, res);
    if (!req.query.clientId) {
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    }
    // Info: (20240419 - Jacky) C010002 - GET /client/:id
    if (method === 'GET') {
      const getClient = await getClientById(clientIdNum);
      const { httpCode, result } = formatApiResponse<IClient>(
        STATUS_MESSAGE.SUCCESS_GET,
        getClient
      );
      res.status(httpCode).json(result);
      // Info: (20240419 - Jacky) C010004 - PUT /client/:id
    } else if (method === 'PUT') {
      const { name, taxId, favorite } = req.body;
      const updatedClient = await updateClientById(clientIdNum, name, taxId, favorite);
      const { httpCode, result } = formatApiResponse<IClient>(
        STATUS_MESSAGE.SUCCESS_UPDATE,
        updatedClient
      );
      res.status(httpCode).json(result);
      // Info: (20240419 - Jacky) C010005 - DELETE /client/:id
    } else if (method === 'DELETE') {
      const deletedClient = await deleteClientById(clientIdNum);
      const { httpCode, result } = formatApiResponse<IClient>(
        STATUS_MESSAGE.SUCCESS_DELETE,
        deletedClient
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
