import { NextApiRequest, NextApiResponse } from 'next';
import { BindCardQuerySchema, PaymentMethodSchema, mockCards } from '@/lib/utils/repo/card.repo';
import { formatApiResponse } from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: STATUS_MESSAGE.METHOD_NOT_ALLOWED });
  }

  try {
    const { userId } = BindCardQuerySchema.parse(req.query);

    if (!mockCards[userId]) {
      return res.status(404).json(formatApiResponse(STATUS_MESSAGE.INTERNAL_SERVICE_ERROR, {}));
    }

    const validatedPayload = PaymentMethodSchema.parse(mockCards[userId]);

    const result = formatApiResponse(STATUS_MESSAGE.SUCCESS, validatedPayload);

    return res.status(result.httpCode).json(result.result);
  } catch (error) {
    return res
      .status(400)
      .json({ success: false, message: STATUS_MESSAGE.INVALID_INPUT_PARAMETER, error });
  }
}
