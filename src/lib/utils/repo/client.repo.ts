import prisma from '@/client';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IClient } from '@/interfaces/client';
import { timestampInSeconds } from '../common';

export async function listClient(companyId: number): Promise<IClient[]> {
  const listedClient = await prisma.client.findMany({
    where: {
      companyId,
    },
  });
  return listedClient;
}

export async function getClientById(clientId: number): Promise<IClient> {
  const getClient = await prisma.client.findUnique({
    where: {
      id: clientId,
    },
  });
  if (!getClient) {
    throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
  }
  return getClient;
}

export async function updateClientById(
  clientId: number,
  name: string,
  taxId: string,
  favorite: boolean
): Promise<IClient> {
  const updatedClient = await prisma.client.update({
    where: {
      id: clientId,
    },
    data: {
      name,
      taxId,
      favorite,
    },
  });
  return updatedClient;
}

export async function deleteClientById(clientId: number): Promise<IClient> {
  const deletedClient = await prisma.client.delete({
    where: {
      id: clientId,
    },
  });
  return deletedClient;
}

export async function createClient(
  companyId: number,
  name: string,
  taxId: string,
  favorite: boolean
): Promise<IClient> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const createdClient = await prisma.client.create({
    data: {
      company: {
        connect: {
          id: companyId,
        },
      },
      name,
      taxId,
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

  return createdClient;
}
