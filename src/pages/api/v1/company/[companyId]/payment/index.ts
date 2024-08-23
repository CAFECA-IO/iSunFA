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

async function handleGetRequest(req: NextApiRequest, res: NextApiResponse) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload = '';
  const oenToken = process.env.PAYMENT_TOKEN;
  const oenMerchantId = process.env.PAYMENT_ID ?? '';
  const session = await getSession(req, res);
  const { userId, companyId } = session;
  const isAuth = await checkAuthorization([AuthFunctionsKeys.admin], { userId, companyId });
  const { orderId } = req.query;
  const orderIdNum = convertStringToNumber(orderId);
  if (!isAuth) {
    statusMessage = STATUS_MESSAGE.FORBIDDEN;
  } else {
    const response = await fetch(OEN_BASE_ENDPOINT.CHECKOUT_TOKEN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${oenToken}`,
      },
      body: JSON.stringify({
        merchantId: oenMerchantId,
        customId: orderIdNum, // Info: (20240806 - Jacky) order id
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

async function handlePostRequest(req: NextApiRequest) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload = '';

  const oenReturn = req.body;
  if (!oenReturn) {
    statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
  } else if (oenReturn.purpose === 'token') {
    const oenToken = process.env.PAYMENT_TOKEN;
    const oenMerchantId = process.env.PAYMENT_ID ?? '';
    const { token, customId } = oenReturn;
    const orderId = convertStringToNumber(customId);
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
          currency: 'TWD', // TODO: Need to modify in the future
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
      // Info: (20240806 - Jacky) Create payment record
      const paymentRecord = await createPaymentRecord(
        orderId,
        transactionResponseJson.data.transactionId,
        createDateInSec,
        transactionResponseJson.message, // ToDo: (20240806 - Jacky) not sure what to put
        transactionResponseJson.data.amount,
        transactionResponseJson.data.paymentInfo.method,
        transactionResponseJson.data.status
      );
      payload = paymentRecord.status;
      // Info: (20240806 - Jacky) Update order status
      const updatedOrder = await updateOrder(orderId, transactionResponseJson.data.status);
      statusMessage = STATUS_MESSAGE.CREATED;
      if (transactionResponseJson.data.status === 'charged') {
        await createSubscription(updatedOrder.companyId, orderId, true);
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
