import prisma from '@/client';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { ITeamPaymentTransaction } from '@/interfaces/payment';

export const createTeamPaymentTransaction = async (
  options: ITeamPaymentTransaction,
  tx = prisma
): Promise<ITeamPaymentTransaction> => {
  const data = {
    teamOrderId: options.teamOrderId,
    userPaymentInfoId: options.userPaymentInfoId,
    status: options.status,
    amount: options.amount,
    currency: options.currency,
    paymentGateway: options.paymentGateway,
    paymentGetwayRecordId: options.paymentGetwayRecordId,
    createdAt: options.createdAt,
    updatedAt: options.updatedAt,
  };
  const teamPaymentTransaction: ITeamPaymentTransaction = (await tx.teamPaymentTransaction.create({
    data,
  })) as ITeamPaymentTransaction;

  if (!teamPaymentTransaction) {
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }

  return teamPaymentTransaction;
};
