import prisma from '@/client';
import { Prisma, PrismaClient } from '@prisma/client';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { getTimestampNow } from '@/lib/utils/common';
import { IExternalUser } from '@/interfaces/external_user';
import { FIVE_MINUTES_IN_S } from '@/constants/time';

export const createExternalUser = async (
  options: IExternalUser,
  tx: Prisma.TransactionClient | PrismaClient = prisma
): Promise<IExternalUser> => {
  if (!options.sessionId || !options.externalId || !options.externalProvider) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_DATA);
  }
  const nowInSecond = getTimestampNow();
  // Info: (20250626 - Luphia) 外部用戶資料有效期為 5 分鐘，需在五分鐘內綁定內部用戶
  const expiredAt = nowInSecond + FIVE_MINUTES_IN_S;
  const data = {
    sessionId: options.sessionId,
    externalId: options.externalId,
    externalProvider: options.externalProvider,
    createdAt: nowInSecond,
    updatedAt: nowInSecond,
    expiredAt,
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

export const getExternalUserByExternalAndUid = async (
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

export const bindExternalUserToUser = async (sessionId: string, userId: number) => {
  const nowInSecond = getTimestampNow();
  try {
    const externalUser = await prisma.externalUser.updateMany({
      where: {
        sessionId,
        expiredAt: {
          gte: nowInSecond,
        },
      },
      data: {
        userId,
        updatedAt: nowInSecond,
      },
    });
    return externalUser;
  } catch (error) {
    throw new Error(STATUS_MESSAGE.DATABASE_UPDATE_FAILED_ERROR);
  }
};
