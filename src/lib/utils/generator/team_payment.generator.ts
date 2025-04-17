import { STATUS_MESSAGE } from '@/constants/status_code';
import { getTimestampNow } from '@/lib/utils/common';
import { IPaymentInfo, ITeamPayment, ITeamSubscription } from '@/interfaces/payment';
import { ITeamOrder } from '@/interfaces/order';

export const generateTeamPayment = async (
  order: ITeamOrder,
  userPaymentInfo: IPaymentInfo,
  teamSubscription: ITeamSubscription
): Promise<ITeamPayment> => {
  const nowInSecond = getTimestampNow();
  const teamOrderId = order.id;
  const userPaymentInfoId = userPaymentInfo.id;
  if (!teamOrderId || !userPaymentInfoId) throw new Error(STATUS_MESSAGE.INVALID_PAYMENT_DATA);
  const teamPayment: ITeamPayment = {
    teamId: order.teamId,
    teamPlanType: teamSubscription.planType,
    userPaymentInfoId,
    autoRenewal: true,
    startDate: teamSubscription.startDate,
    expiredDate: teamSubscription.expiredDate,
    nextChargetDate: teamSubscription.expiredDate,
    createdAt: nowInSecond,
    updatedAt: nowInSecond,
  };
  return teamPayment;
};
