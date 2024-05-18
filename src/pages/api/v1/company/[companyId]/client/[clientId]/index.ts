import { STATUS_MESSAGE } from '@/constants/status_code';
import { IClient } from '@/interfaces/client';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/client';

async function getClientById(clientId: number): Promise<IClient> {
  const getClient = await prisma.client.findUnique({
    where: {
      id: clientId,
    },
    include: {
      company: {
        select: {
          name: true,
          code: true,
        },
      },
    },
  });
  if (!getClient) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }
  const client: IClient = {
    ...getClient,
    companyId: getClient.companyId,
    companyName: getClient.company.name,
    code: getClient.company.code,
  };
  return client;
}

async function updateClientById(clientId: number, favorite: boolean): Promise<IClient> {
  const updatedClient = await prisma.client.update({
    where: {
      id: clientId,
    },
    data: {
      favorite,
    },
    include: {
      company: {
        select: {
          name: true,
          code: true,
        },
      },
    },
  });
  const client: IClient = {
    ...updatedClient,
    companyId: updatedClient.companyId,
    companyName: updatedClient.company.name,
    code: updatedClient.company.code,
  };
  return client;
}

async function deleteClientById(clientId: number): Promise<IClient> {
  const deletedClient = await prisma.client.delete({
    where: {
      id: clientId,
    },
    include: {
      company: {
        select: {
          name: true,
          code: true,
        },
      },
    },
  });
  const client: IClient = {
    ...deletedClient,
    companyId: deletedClient.companyId,
    companyName: deletedClient.company.name,
    code: deletedClient.company.code,
  };
  return client;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IClient>>
) {
  const { method } = req;
  const { clientId } = req.query;
  const clientIdNum = Number(clientId);

  try {
    if (!req.headers.userid) {
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }
    if (!req.query.clientId) {
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    }
    // Info: (20240419 - Jacky) C010002 - GET /client/:id
    if (method === 'GET') {
      const client: IClient = await getClientById(clientIdNum);
      const { httpCode, result } = formatApiResponse<IClient>(STATUS_MESSAGE.SUCCESS_GET, client);
      res.status(httpCode).json(result);
      // Info: (20240419 - Jacky) C010004 - PUT /client/:id
    } else if (method === 'PUT') {
      const { favorite } = req.body;
      const client: IClient = await updateClientById(clientIdNum, favorite);
      const { httpCode, result } = formatApiResponse<IClient>(
        STATUS_MESSAGE.SUCCESS_UPDATE,
        client
      );
      res.status(httpCode).json(result);
      // Info: (20240419 - Jacky) C010005 - DELETE /client/:id
    } else if (method === 'DELETE') {
      const client: IClient = await deleteClientById(clientIdNum);
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
