import prisma from '@/client';
import { LeaveStatus, Prisma, PrismaClient } from '@prisma/client';
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

// Info: (20250703 - Julian) 從 userId 獲取帳本資訊
export const getAccountBookByUserId = async (userId: number) => {
  try {
    // Info: (20250703 - Julian) 取得 user 擁有的 team
    const teams = await prisma.teamMember.findMany({
      where: {
        userId,
        status: LeaveStatus.IN_TEAM,
      },
      select: { teamId: true },
    });
    // Info: (20250703 - Julian) 抽取 teamId
    const teamIds = teams.map((team) => team.teamId);

    // Info: (20250703 - Julian) 再從 team 取得 accountBook
    const accountBooks = await prisma.company.findMany({
      where: {
        teamId: {
          in: teamIds,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    return accountBooks;
  } catch (error) {
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }
};
