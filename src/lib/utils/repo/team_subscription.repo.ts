import prisma from '@/client';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { ITeamSubscription } from '@/interfaces/payment';
import { getTimestampNow } from '@/lib/utils/common';
import { TeamPlanType } from '@prisma/client';

export const createTeamSubscription = async (
  options: ITeamSubscription
): Promise<ITeamSubscription> => {
  const data = {
    teamId: options.teamId,
    planType: options.planType as TeamPlanType,
    startDate: options.startDate,
    expiredDate: options.expiredDate,
    createdAt: options.createdAt,
    updatedAt: options.updatedAt,
  };
  const teamSubscription: ITeamSubscription = (await prisma.teamSubscription.create({
    data,
  })) as ITeamSubscription;

  if (!teamSubscription) {
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }

  return teamSubscription;
};

export const listValidTeamSubscription = async (teamId: number): Promise<ITeamSubscription[]> => {
  const nowInSecond = getTimestampNow();
  const teamSubscriptions: ITeamSubscription[] = (await prisma.teamSubscription.findMany({
    where: {
      teamId,
      startDate: {
        lte: nowInSecond,
      },
      expiredDate: {
        gt: nowInSecond,
      },
    },
    include: {
      plan: true,
    },
  })) as ITeamSubscription[];

  return teamSubscriptions;
};
