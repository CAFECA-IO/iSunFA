import prisma from '@/client';
import { Prisma, PrismaClient } from '@prisma/client';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { ITeamPayment } from '@/interfaces/payment';
import { getTimestampNow } from '@/lib/utils/common';

export const createTeamPayment = async (
  options: ITeamPayment,
  tx: Prisma.TransactionClient | PrismaClient = prisma
): Promise<ITeamPayment> => {
  const nowInSecond = getTimestampNow();
  const data = {
    teamId: options.teamId,
    teamPlanType: options.teamPlanType,
    userPaymentInfoId: options.userPaymentInfoId,
    autoRenewal: options.autoRenewal,
    startDate: options.startDate,
    expiredDate: options.expiredDate,
    nextChargetDate: options.nextChargetDate,
    createdAt: nowInSecond,
    updatedAt: nowInSecond,
  };
  const teamPayment: ITeamPayment = (await tx.teamPayment.create({
    data,
  })) as ITeamPayment;

  if (!teamPayment) {
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }

  return teamPayment;
};

export const getTeamPaymentByTeamId = async (
  teamId: number,
  tx: Prisma.TransactionClient | PrismaClient = prisma
): Promise<ITeamPayment | null> => {
  const teamPayment = await tx.teamPayment.findUnique({
    where: {
      teamId,
    },
  });

  const result = teamPayment as ITeamPayment;
  if (result?.userPaymentInfoId === null) {
    result.userPaymentInfoId = undefined;
  }

  return result;
};

export const updateTeamPayment = async (
  options: ITeamPayment,
  tx: Prisma.TransactionClient | PrismaClient = prisma
): Promise<ITeamPayment> => {
  const nowInSecond = getTimestampNow();
  const { teamId } = options;
  // Info: (20250417 - Luphia) 只允許更改方案、支付方式、自動更新、開始時間、結束時間、下次收費時間
  const update = {
    teamPlanType: options.teamPlanType,
    userPaymentInfoId: options.userPaymentInfoId,
    autoRenewal: options.autoRenewal,
    startDate: options.startDate,
    expiredDate: options.expiredDate,
    nextChargetDate: options.nextChargetDate,
    updatedAt: nowInSecond,
  };
  const create = {
    teamId: options.teamId,
    teamPlanType: options.teamPlanType,
    userPaymentInfoId: options.userPaymentInfoId,
    autoRenewal: options.autoRenewal,
    startDate: options.startDate,
    expiredDate: options.expiredDate,
    nextChargetDate: options.nextChargetDate,
    createdAt: nowInSecond,
    updatedAt: nowInSecond,
  };
  // Info: (20250417 - Luphia) 使用 upsert，若不存在則創建，存在則更新
  const teamPayment: ITeamPayment = (await tx.teamPayment.upsert({
    where: {
      teamId,
    },
    update,
    create,
  })) as ITeamPayment;

  if (!teamPayment) {
    throw new Error(STATUS_MESSAGE.DATABASE_UPDATE_FAILED_ERROR);
  }

  return teamPayment;
};
