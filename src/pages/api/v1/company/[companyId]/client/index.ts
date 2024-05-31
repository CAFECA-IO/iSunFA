import { NextApiRequest, NextApiResponse } from 'next';
import { IClient } from '@/interfaces/client';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse, timestampInSeconds } from '@/lib/utils/common';
import prisma from '@/client';

async function listClient(): Promise<IClient[]> {
  const findManyClient = await prisma.client.findMany({
    include: {
      company: {
        select: {
          name: true,
          code: true,
        },
      },
    },
  });
  const listedClient: IClient[] = findManyClient.map((client) => ({
    ...client,
    id: client.id,
    companyId: client.companyId,
    companyName: client.company.name,
    code: client.company.code,
    company: null,
  }));
  return listedClient;
}

async function createClient(companyId: number, favorite: boolean): Promise<IClient> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const createdClient = await prisma.client.create({
    data: {
      company: {
        connect: {
          id: companyId,
        },
      },
      favorite,
      createdAt: nowTimestamp,
      updatedAt: nowTimestamp,
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
    ...createdClient,
    companyId: createdClient.companyId,
    companyName: createdClient.company.name,
    code: createdClient.company.code,
  };
  return client;
}

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
      const clientList: IClient[] = await listClient();
      const { httpCode, result } = formatApiResponse<IClient[]>(
        STATUS_MESSAGE.SUCCESS_LIST,
        clientList
      );
      res.status(httpCode).json(result);
      // Info: (20240419 - Jacky) C010003 - POST /client
    } else if (req.method === 'POST') {
      const { favorite } = req.body;
      const { companyId } = req.query;
      const companyIdNumber = Number(companyId);
      const newClient: IClient = await createClient(companyIdNumber, favorite);
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
