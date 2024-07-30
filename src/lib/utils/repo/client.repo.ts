import prisma from '@/client';
import { IClient } from '@/interfaces/client';
import { getTimestampNow, timestampInSeconds } from '@/lib/utils/common';
import { Prisma } from '@prisma/client';

export async function listClient(companyId: number): Promise<IClient[]> {
  const listedClient = await prisma.client.findMany({
    where: {
      companyId,
      OR: [{ deletedAt: 0 }, { deletedAt: null }],
    },
  });
  return listedClient;
}

export async function getClientById(clientId: number): Promise<IClient | null> {
  let client: IClient | null = null;
  if (clientId > 0) {
    client = await prisma.client.findUnique({
      where: {
        id: clientId,
        OR: [{ deletedAt: 0 }, { deletedAt: null }],
      },
    });
  }
  return client;
}

export async function updateClientById(
  clientId: number,
  name: string,
  taxId: string,
  favorite: boolean
): Promise<IClient> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);
  const updatedClient = await prisma.client.update({
    where: {
      id: clientId,
    },
    data: {
      name,
      taxId,
      favorite,
      updatedAt: nowTimestamp,
    },
  });
  return updatedClient;
}

export async function deleteClientById(clientId: number): Promise<IClient> {
  const nowInSecond = getTimestampNow();

  const where: Prisma.ClientWhereUniqueInput = {
    id: clientId,
    deletedAt: null,
  };

  const data: Prisma.ClientUpdateInput = {
    deletedAt: nowInSecond,
  };

  const updateArgs = {
    where,
    data,
  };

  const deletedClient = await prisma.client.update(updateArgs);
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
