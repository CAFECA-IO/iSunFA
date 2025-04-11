import prisma from '@/client';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { ITeamOrder } from '@/interfaces/order';

export const createTeamOrder = async (options: ITeamOrder): Promise<ITeamOrder> => {
  const data = {
    userId: options.userId,
    teamId: options.teamId,
    amount: options.amount,
    currency: options.currency,
    status: options.status,
    createdAt: options.createdAt,
    updatedAt: options.updatedAt,
  };
  const teamOrder: ITeamOrder = (await prisma.teamOrder.create({
    data,
  })) as ITeamOrder;

  if (!teamOrder) {
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }

  return teamOrder;
};
