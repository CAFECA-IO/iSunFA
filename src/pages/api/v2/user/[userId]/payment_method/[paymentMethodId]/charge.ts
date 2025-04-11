import { NextApiRequest, NextApiResponse } from 'next';
import {
  PaymentQuerySchema,
  PaymentBodySchema,
  getUserPaymentInfoById,
} from '@/lib/utils/repo/user_payment_info.repo';
import { formatApiResponse } from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { APIName, HttpMethod } from '@/constants/api_connection';
import loggerBack from '@/lib/utils/logger_back';
import { getSession } from '@/lib/utils/session';
import { logUserAction } from '@/lib/utils/middleware';
import { generateTeamInvoice } from '@/lib/utils/generator/team_invoice.generator';
import { createPaymentGateway } from '@/lib/utils/payment/factory';
import { IPaymentInfo, ITeamInvoice, ITeamSubscription } from '@/interfaces/payment';
import { IChargeWithTokenOptions } from '@/interfaces/payment_gateway';
import { getUserById } from '@/lib/utils/repo/user.repo';
import { IUser } from '@/interfaces/user';
import { ITeamOrder } from '@/interfaces/order';
import { generateTeamPaymentTransaction } from '@/lib/utils/generator/team_payment_transaction.generator';
import { createTeamOrder } from '@/lib/utils/repo/team_order.repo';
import { createTeamPaymentTransaction } from '@/lib/utils/repo/team_payment_transaction.repo';
import { generateTeamOrder } from '@/lib/utils/generator/team_order.generator';
import { createTeamInvoice } from '@/lib/utils/repo/team_invoice.repo';
import { generateTeamSubscription } from '@/lib/utils/generator/team_subscription.generator';
import {
  createTeamSubscription,
  updateTeamSubscription,
} from '@/lib/utils/repo/team_subscription.repo';
import { TRANSACTION_STATUS } from '@/constants/transaction';

/** Info: (20250326 - Luphia) 訂閱支付細節
    team_plan 團隊方案
    team_payment_transaction 收款紀錄 team_payment_transaction.repo
    team_invoice 發票 team_invoice.repo
    team_subscription 訂閱方案 team_subscription.repo
    planType 訂閱方案
    teamId 團隊 ID
    userId 使用者 ID
    paymentMethodId 支付方式 ID

    相關資料表
    TeamPlan          訂閱方案
    TeamOrder         訂單
    TeamOrderDetail   訂單品項
    UserPaymentInfo   用戶信用卡
    TeamPaymentTransaction   團隊付款紀錄
    TeamInvoice       團隊收據
    TeamSubscription  團隊訂閱紀錄

    訂閱流程
    1. 用戶選取訂閱方案建立訂單與訂單品項
    2. 用戶建立信用卡資料
    3. 用戶針對訂單付款並記錄付款結果
    4. 若付款成功則建立收據與團隊訂閱紀錄
 */

export const handlePostRequest = async (req: NextApiRequest) => {
  let result;
  try {
    // Info: (20250218 - tzuhan) 驗證 URL 參數
    const { userId, paymentMethodId } = PaymentQuerySchema.parse(req.query);
    //  Info: (20250218 - tzuhan) 驗證請求 Body
    const { teamPlanType, teamId } = PaymentBodySchema.parse(req.body);

    // ToDo: (20250331 - Luphia) 檢驗用戶是否屬於該團隊，避免替不相干團隊付費訂閱

    const order: ITeamOrder = await generateTeamOrder({
      userId,
      teamId,
      teamPlanType,
      quantity: 1,
    });
    // Info: (20250411 - Luphia) 根據訂單建立 team_order 並儲存
    // ToDo: (20250411 - Luphia) 使用 DB Transaction
    const teamOrder = await createTeamOrder(order);
    const userPaymentInfo: IPaymentInfo | null = await getUserPaymentInfoById(paymentMethodId);
    const user = (await getUserById(userId)) as unknown as IUser;
    if (!userPaymentInfo || !user || userPaymentInfo.userId !== userId) throw new Error(STATUS_MESSAGE.INVALID_PAYMENT_METHOD);
    const paymentGateway = createPaymentGateway();
    const chargeOption: IChargeWithTokenOptions = {
      order: teamOrder,
      user,
      token: userPaymentInfo.token,
    };
    const paymentGetwayRecordId = await paymentGateway.chargeWithToken(chargeOption);
    // Info: (20250328 - Luphia) 根據扣款的結果建立 team_payment_transaction 並儲存
    // ToDo: (20250330 - Luphia) 使用 DB Transaction
    const paymentGatewayName = paymentGateway.getPlatform();
    const teamPaymentTransactionData = await generateTeamPaymentTransaction(
      teamOrder,
      userPaymentInfo,
      paymentGatewayName,
      paymentGetwayRecordId
    );
    const teamPaymentTransaction = await createTeamPaymentTransaction(teamPaymentTransactionData);
    const resultData: { teamInvoice?: ITeamInvoice; teamSubscription?: ITeamSubscription } = {};

    if (teamPaymentTransaction.status === TRANSACTION_STATUS.SUCCESS) {
      // Info: (20250328 - Luphia) 根據扣款的結果建立 team_invoice 並儲存
      // ToDo: (20250330 - Luphia) 使用 DB Transaction
      const teamInvoiceData: ITeamInvoice = await generateTeamInvoice(
        teamOrder,
        teamPaymentTransaction,
        user
      );
      const teamInvoice = await createTeamInvoice(teamInvoiceData);
      resultData.teamInvoice = teamInvoice;

      // Info: (20250330 - Luphia) 根據扣款的結果建立 team_subscription 並儲存
      // ToDo: (20250330 - Luphia) 使用 DB Transaction
      const teamSubscriptionData = await generateTeamSubscription(teamId, teamPlanType);
      let teamSubscription: ITeamSubscription;
      if (teamSubscriptionData.id) {
        teamSubscription = await updateTeamSubscription(teamSubscriptionData);
      } else {
        teamSubscription = await createTeamSubscription(teamSubscriptionData);
      }
      resultData.teamSubscription = teamSubscription;
      result = formatApiResponse(STATUS_MESSAGE.SUCCESS, resultData);
    } else {
      // Info: (20250328 - Luphia) 付款失敗，回傳錯誤訊息
      result = formatApiResponse(STATUS_MESSAGE.PAYMENT_FAILED_TO_COMPLETE, {});
    }
  } catch (error) {
    loggerBack.error(error);
    result = formatApiResponse((error as Error).message, {});
  }
  return result;
};

// Info: (20250311 - Luphia) API Route Handler 根據 Method 呼叫對應的流程
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = req.method || HttpMethod.GET;
  const session = await getSession(req);
  let httpCode;
  let result;
  let statusMessage;

  try {
    switch (method) {
      case HttpMethod.POST:
        ({ httpCode, result } = await handlePostRequest(req));
        break;
      default:
        throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (error) {
    loggerBack.error(error);
    const err = error as Error;
    statusMessage =
      STATUS_MESSAGE[err.message as keyof typeof STATUS_MESSAGE] ||
      STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
    ({ httpCode, result } = formatApiResponse(statusMessage, {}));
  }
  await logUserAction(session, APIName.USER_PAYMENT_METHOD_CHARGE, req, statusMessage as string);

  return res.status(httpCode).json(result);
}
