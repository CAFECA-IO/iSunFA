import { STATUS_MESSAGE } from '@/constants/status_code';
import { getTimestampNow } from '@/lib/utils/common';
import { IPaymentInfo, ITeamPaymentTransaction } from '@/interfaces/payment';
import { TRANSACTION_STATUS } from '@/constants/transaction';
import { PAYMENT_GATEWAY } from '@/constants/payment';
import { ITeamOrder } from '@/interfaces/order';

// Info: (20250326 - Luphia) 建立用戶付款紀錄，包含訂單、付款方式、付款狀態、金額、幣別、付款平台與平台紀錄
export const generateTeamPaymentTransaction = async (
  order: ITeamOrder,
  userPaymentInfo: IPaymentInfo,
  paymentGateway: PAYMENT_GATEWAY,
  paymentGetwayRecordId: string | undefined
): Promise<ITeamPaymentTransaction> => {
  const nowInSecond = getTimestampNow();
  const teamOrderId = order.id;
  const userPaymentInfoId = userPaymentInfo.id;
  // Info: (20250326 - Luphia) 付款狀態由 paymentGetwayRecordId 判斷，成功則有值，失敗則為 undefined
  const status = paymentGetwayRecordId ? TRANSACTION_STATUS.SUCCESS : TRANSACTION_STATUS.FAILED;
  if (!teamOrderId || !userPaymentInfoId) throw new Error(STATUS_MESSAGE.INVALID_PAYMENT_TRANSACTION_DATA);
  const teamPaymentTransaction: ITeamPaymentTransaction = {
    teamOrderId,
    userPaymentInfoId,
    status,
    amount: order.amount,
    currency: order.currency,
    paymentGateway,
    paymentGetwayRecordId,
    createdAt: nowInSecond,
    updatedAt: nowInSecond,
  };
  return teamPaymentTransaction;
};
