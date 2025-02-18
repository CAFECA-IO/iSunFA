import { NextApiRequest, NextApiResponse } from 'next';
import { PaymentSchema } from '@/lib/utils/repo/card.repo';
import { formatApiResponse } from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { FAKE_INVOICE_LIST } from '@/lib/services/subscription_service';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: STATUS_MESSAGE.METHOD_NOT_ALLOWED });
  }

  try {
    const { id } = PaymentSchema.parse(req.query);

    if (!id) {
      return res.status(404).json(formatApiResponse(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR, {}));
    }

    const validatedPayload = PaymentSchema.parse(
      FAKE_INVOICE_LIST.find((invoice) => invoice.id === id) || FAKE_INVOICE_LIST[0]
    );

    const result = formatApiResponse(STATUS_MESSAGE.SUCCESS, validatedPayload);

    return res.status(result.httpCode).json(result.result);
  } catch (error) {
    return res
      .status(400)
      .json({ success: false, message: STATUS_MESSAGE.INVALID_INPUT_TYPE, error });
  }
}
