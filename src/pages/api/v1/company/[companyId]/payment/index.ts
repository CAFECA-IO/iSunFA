import { STATUS_MESSAGE } from '@/constants/status_code';
import { OEN_BASE_ENDPOINT, OEN_MERCHANT_ENDPOINT } from '@/constants/url';
import { IResponseData } from '@/interfaces/response_data';
import { checkAuthorization } from '@/lib/utils/auth_check';
import {
  convertDateToTimestamp,
  convertStringToNumber,
  formatApiResponse,
  timestampInSeconds,
} from '@/lib/utils/common';
import { getOrderDetailById, updateOrder } from '@/lib/utils/repo/order.repo';
import { createPaymentRecord } from '@/lib/utils/repo/payment_record.repo';
import { createSubscription } from '@/lib/utils/repo/subscription.repo';
import { getSession } from '@/lib/utils/session';
import { NextApiRequest, NextApiResponse } from 'next';
import { AuthFunctionsKeys } from '@/interfaces/auth';
import { CurrencyType, OEN_CURRENCY } from '@/constants/currency';
import { SubscriptionPeriod, SubscriptionPlan } from '@/constants/subscription';
import { isEnumValue } from '@/lib/utils/type_guard/common';

function formatSubscriptionPlan(subscriptionPlan: unknown) {
  let subPlan = SubscriptionPlan.TRIAL;

  if (isEnumValue(SubscriptionPlan, subscriptionPlan)) {
    subPlan = subscriptionPlan;
  }

  return subPlan;
}

function formatSubscriptionPeriod(subscriptionPeriod: unknown) {
  let subPeriod = SubscriptionPeriod.MONTHLY;

  if (isEnumValue(SubscriptionPeriod, subscriptionPeriod)) {
    subPeriod = subscriptionPeriod;
  }

  return subPeriod;
}

/**
 * Info: (20240823 - Murky) Formats the query parameters from the request object for the GET endpoint.
 * @param req - The NextApiRequest object containing the query parameters.
 * @returns {Object} An object containing the formatted query parameters.
 * @returns {number} returns.orderIdNum - The numeric ID of the order.
 * @returns {SubscriptionPlan} returns.subPlan - The formatted subscription plan.
 * @returns {SubscriptionPeriod} returns.subPeriod - The formatted subscription period.
 */
function formatGetQuery(req: NextApiRequest) {
  const { orderId, subscriptionPlan, subscriptionPeriod } = req.query;
  const orderIdNum = convertStringToNumber(orderId);
  const subPlan = formatSubscriptionPlan(subscriptionPlan);
  const subPeriod = formatSubscriptionPeriod(subscriptionPeriod);
  return { orderId: orderIdNum, subPlan, subPeriod };
}

/**
 * Decrypts a custom ID and extracts the order ID, subscription plan, and subscription period.
 *
 * @param customId - The custom ID to decrypt.
 * @returns An object containing the decrypted order ID, subscription plan, and subscription period.
 * @returns {number} returns.orderIdNum - The numeric ID of the order.
 * @returns {SubscriptionPlan} returns.subPlan - The formatted subscription plan.
 * @returns {SubscriptionPeriod} returns.subPeriod - The formatted subscription period.
 */
function decryptCustomId(customId: unknown) {
  let orderId = 0;
  let subPlan = SubscriptionPlan.TRIAL;
  let subPeriod = SubscriptionPeriod.MONTHLY;

  if (typeof customId === 'string') {
    const customIdJson = JSON.parse(customId);
    orderId = convertStringToNumber(customIdJson.orderId);
    subPlan = formatSubscriptionPlan(customIdJson.subPlan);
    subPeriod = formatSubscriptionPeriod(customIdJson.subPeriod);
  }

  return { orderId, subPlan, subPeriod };
}

async function handleGetRequest(req: NextApiRequest, res: NextApiResponse) {
  /* Info: (20240823 - Murky) 流程： 1. 前端呼叫Get payment 傳入資訊，後端可以用 "customId" 來讓資料與第三方之間做傳遞
   * 2. 後端呼叫第三方 API，取得 token(CHECKOUT_TOKEN)
   * 3. 第三方webhook Post payment, 後端從customId 取得get的資訊, 並使用TOKEN_TRANSACTION付款
   * 4. 最後用GET_TRANSACTION確認交易資訊
   */
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload = '';
  const oenToken = process.env.PAYMENT_TOKEN;
  const oenMerchantId = process.env.PAYMENT_ID ?? '';
  const session = await getSession(req, res);
  const { userId, companyId } = session;
  const isAuth = await checkAuthorization([AuthFunctionsKeys.admin], { userId, companyId });
  if (!isAuth) {
    statusMessage = STATUS_MESSAGE.FORBIDDEN;
  } else {
    // Info: (20240823 - Murky) 用卡號透過 3D 驗證取得 token

    const query = formatGetQuery(req);

    // Info: (20240823 - Murky) Customer ID 是一個自定義欄位可以在第三方與後端之間做傳遞
    const customId = JSON.stringify(query);

    const response = await fetch(OEN_BASE_ENDPOINT.CHECKOUT_TOKEN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${oenToken}`,
      },
      body: JSON.stringify({
        merchantId: oenMerchantId,
        customId,
        successUrl: `https://www.google.com`,
        failureUrl: `https://www.bing.com`,
      }),
    });

    const responseJson = await response.json();
    const redirectUrl = OEN_MERCHANT_ENDPOINT.GET_TOKEN(oenMerchantId, responseJson.data.id);
    payload = redirectUrl;
    statusMessage = STATUS_MESSAGE.SUCCESS_GET;
  }

  return { statusMessage, payload };
}

// Info: (20240823 - Murky) payment webhook, 用卡號透過 3D 驗證取得 token 的webhook
async function handlePostRequest(req: NextApiRequest) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload = '';

  const oenReturn = req.body;
  if (!oenReturn) {
    statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
  } else if (oenReturn.purpose === 'token') {
    const oenToken = process.env.PAYMENT_TOKEN;
    const oenMerchantId = process.env.PAYMENT_ID ?? '';
    // Info: (20240823 - Murky) customId 格式會是 orderId-subPlan-subPeriod
    const { token, customId } = oenReturn;
    const { orderId, subPlan, subPeriod } = decryptCustomId(customId);

    const getOrder = await getOrderDetailById(orderId);
    if (!getOrder) {
      statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
    } else {
      const tokenResponse = await fetch(OEN_BASE_ENDPOINT.TOKEN_TRANSACTION, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${oenToken}`,
        },
        body: JSON.stringify({
          merchantId: oenMerchantId,
          amount: getOrder.plan.monthlyFee,
          currency: OEN_CURRENCY[CurrencyType.TWD],
          token,
          orderId: customId,
        }),
      });
      const tokenResponseJson = await tokenResponse.json();
      const transactionResponse = await fetch(
        OEN_BASE_ENDPOINT.GET_TRANSACTION(tokenResponseJson.data.id),
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${oenToken}`,
          },
        }
      );
      const transactionResponseJson = await transactionResponse.json();
      const createDate = convertDateToTimestamp(transactionResponseJson.data.createdAt);
      const createDateInSec = timestampInSeconds(createDate);
      // Create payment record
      const paymentDescription = `${subPlan} - ${subPeriod}`;
      const paymentRecord = await createPaymentRecord(
        orderId,
        transactionResponseJson.data.transactionId,
        createDateInSec,
        paymentDescription, // Info (20240822 - Murky) Add subscription plan and period to payment description
        transactionResponseJson.data.amount,
        transactionResponseJson.data.paymentInfo.method,
        transactionResponseJson.data.status
      );
      payload = paymentRecord.status;
      // Update order status
      const updatedOrder = await updateOrder(orderId, transactionResponseJson.data.status);
      statusMessage = STATUS_MESSAGE.CREATED;
      if (transactionResponseJson.data.status === 'charged') {
        await createSubscription(updatedOrder.companyId, orderId, true, subPeriod);
      }
    }
  } else {
    statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
  }

  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: string }>;
} = {
  GET: handleGetRequest,
  POST: handlePostRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<string>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload = '';

  try {
    const handleRequest = methodHandlers[req.method || ''];
    if (handleRequest) {
      ({ statusMessage, payload } = await handleRequest(req, res));
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
    payload = '';
  } finally {
    const { httpCode, result } = formatApiResponse<string>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
