import { NextApiRequest, NextApiResponse } from 'next';
import {
  PaymentQuerySchema,
  PaymentBodySchema,
  TeamInvoiceSchema,
  mockInvoices,
  getUserPaymentInfoById,
} from '@/lib/utils/repo/user_payment_info.repo';
import { formatApiResponse } from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { TPlanType } from '@/interfaces/subscription';
import { APIName, HttpMethod } from '@/constants/api_connection';
import loggerBack from '@/lib/utils/logger_back';
import { getSession } from '@/lib/utils/session';
import { logUserAction } from '@/lib/utils/middleware';
import { countTeamMembersById } from '@/lib/utils/repo/team.repo';
import { getTeamPlanByType } from '@/lib/utils/repo/team_plan.repo';
import { DefaultValue } from '@/constants/default_value';

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
    TeamTransaction   團隊付款紀錄
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
    const { planType, teamId } = PaymentBodySchema.parse(req.body);

    const teamPlan = await getTeamPlanByType(planType);
    const teamMembersCount = await countTeamMembersById(teamId);
    // Info: (20250326 - Luphia) paymentMethod 隸屬於 userPaymentInfo，共用 id 作為 key
    const paymentMethod = await getUserPaymentInfoById(paymentMethodId);

    const basicPrice = teamPlan.price;
    const basicMemberCount = DefaultValue.BASIC_MEMBER_COUNT; // ToDo: (20250326 - Luphia) 這個數字應該要從 team_plan 取得，無法取得才使用預設值
    const extraMemberPrice = teamPlan.extraMemberPrice || 0;

    const unitPrice = planPrices[planId];
    const quantity = 1; //  Info: (20250218 - tzuhan) 假設數量固定為 1
    const totalPrice = unitPrice * quantity;
    const tax = Math.round(totalPrice * 0.05); //  Info: (20250218 - tzuhan) 假設稅率 5%
    const subtotal = totalPrice - tax;
    const issuedTimestamp = Date.now();
    const dueTimestamp = issuedTimestamp + 30 * 24 * 60 * 60 * 1000; //  Info: (20250218 - tzuhan) 到期日 +30 天

    const invoice = {
      id: Date.now(), //  Info: (20250218 - tzuhan) 模擬發票 ID
      teamId: 3, //  Info: (20250218 - tzuhan) 假設綁定的團隊 ID
      status: true, //  Info: (20250218 - tzuhan) 模擬付款成功
      issuedTimestamp,
      dueTimestamp,
      planId: planType as TPlanType,
      planStartTimestamp: issuedTimestamp,
      planEndTimestamp: dueTimestamp,
      planQuantity: quantity,
      planUnitPrice: unitPrice,
      planAmount: totalPrice,
      payer: {
        name: 'John Doe',
        address: '1234 Main St',
        phone: '123-456-7890',
        taxId: '123456789',
      },
      payee: {
        name: 'Jane Doe',
        address: '5678 Elm St',
        phone: '098-765-4321',
        taxId: '987654321',
      },
      subtotal,
      tax,
      total: totalPrice,
      amountDue: 0, //  Info: (20250218 - tzuhan) 假設一次付清
    };

    //  Info: (20250218 - tzuhan) 確保發票符合 Schema
    const validatedPayload = TeamInvoiceSchema.parse(invoice);

    mockInvoices[userId] = invoice;

    result = formatApiResponse(STATUS_MESSAGE.SUCCESS, validatedPayload);
  } catch (error) {
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
