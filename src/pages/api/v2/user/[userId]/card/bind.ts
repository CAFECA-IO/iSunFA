import { PAYMENT_METHOD_TYPE } from '@/constants/payment';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import {
  BindCardQuerySchema,
  BindCardBodySchema,
  mockCards,
  PaymentMethodSchema,
} from '@/lib/utils/repo/card.repo';
import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: STATUS_MESSAGE.METHOD_NOT_ALLOWED });
  }

  try {
    // Info: (20250218 - tzuhan) 驗證 URL 參數
    const { userId } = BindCardQuerySchema.parse(req.query);
    // Info: (20250218 - tzuhan) 驗證請求 body
    const cardData = BindCardBodySchema.parse(req.body);

    // Info: (20250218 - tzuhan) 模擬卡片 ID
    const newCard = {
      id: Date.now(), // Info: (20250218 - tzuhan) 以時間戳模擬 ID
      ...cardData,
      type: cardData.type as PAYMENT_METHOD_TYPE,
    };

    // Info: (20250218 - tzuhan) 儲存卡片資訊
    mockCards[userId] = newCard;

    // Info: (20250218 - tzuhan) 驗證回傳格式
    const validatedPayload = PaymentMethodSchema.parse(newCard);

    // Info: (20250218 - tzuhan) 統一 API 回應格式
    const result = formatApiResponse(STATUS_MESSAGE.SUCCESS, validatedPayload);

    return res.status(result.httpCode).json(result.result);
  } catch (error) {
    return res
      .status(400)
      .json({ success: false, message: STATUS_MESSAGE.INVALID_INPUT_PARAMETER, error });
  }
}
