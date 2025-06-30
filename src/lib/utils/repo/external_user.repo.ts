import prisma from '@/client';
import { Prisma, PrismaClient } from '@prisma/client';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { getTimestampNow } from '@/lib/utils/common';
import { IExternalUser } from '@/interfaces/external_user';

export const createExternalUser = async (
  options: IExternalUser,
  tx: Prisma.TransactionClient | PrismaClient = prisma
): Promise<IExternalUser> => {
  if (!options.userId || !options.externalId || !options.externalProvider) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_DATA);
  }
  const nowInSecond = getTimestampNow();
  const data = {
    userId: options.userId,
    externalId: options.externalId,
    externalProvider: options.externalProvider,
    createdAt: nowInSecond,
    updatedAt: nowInSecond,
  };

  try {
    const externalUser: IExternalUser = (await tx.externalUser.create({
      data,
    })) as IExternalUser;
    return externalUser;
  } catch (error) {
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }
};

export const getExternalUserByProviderAndUid = async (
  externalProvider: string,
  externalId: string
) => {
  try {
    const externalUser = await prisma.externalUser.findFirst({
      where: {
        externalProvider,
        externalId,
      },
      include: {
        user: true,
      },
    });
    return externalUser;
  } catch (error) {
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }
};
