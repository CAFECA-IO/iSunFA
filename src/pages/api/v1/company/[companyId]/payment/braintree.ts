import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { checkUserAdmin } from '@/lib/utils/auth_check';
import { formatApiResponse } from '@/lib/utils/common';
import { updateOrder } from '@/lib/utils/repo/order.repo';
import { createPaymentRecord } from '@/lib/utils/repo/payment_record.repo';
import { createSubscription } from '@/lib/utils/repo/subscription.repo';
import { getSession } from '@/lib/utils/session';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<string>>
) {
  let shouldContinue: boolean = true;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload = '';
  try {
    const session = await getSession(req, res);
    const { userId, companyId } = session;
    if (shouldContinue) {
      shouldContinue = await checkUserAdmin({ userId, companyId });
    }
    if (req.method === 'POST') {
      const { braintreeReturn } = req.body;
      if (!braintreeReturn) {
        shouldContinue = false;
      }
      if (shouldContinue) {
        // TODO (20240617 - Jacky): check braintreeReturn and format now is mock
        const checkedBraintreeReturn = {
          orderId: 1,
          transactionId: '1',
          date: 213123213,
          description: 'test',
          amount: 100,
          method: 'braintree',
          status: 'success',
          createdAt: 213123213,
          updatedAt: 213123213,
        };
        // TODO (20240617 - Jacky): Need to wrap to transaction
        // create payment record
        await createPaymentRecord(
          checkedBraintreeReturn.orderId,
          checkedBraintreeReturn.transactionId,
          checkedBraintreeReturn.date,
          checkedBraintreeReturn.description,
          checkedBraintreeReturn.amount,
          checkedBraintreeReturn.method,
          checkedBraintreeReturn.status
        );
        // update order status
        await updateOrder(checkedBraintreeReturn.orderId, checkedBraintreeReturn.status);
        statusMessage = STATUS_MESSAGE.CREATED;
        if (braintreeReturn.status === 'success') {
          await createSubscription(companyId, checkedBraintreeReturn.orderId, true);
        }
      }
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
    payload = '';
  }
  const { httpCode, result } = formatApiResponse<string>(statusMessage, payload);
  res.status(httpCode).json(result);
}
