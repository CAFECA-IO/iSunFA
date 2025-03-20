import { NextApiRequest, NextApiResponse } from 'next';
import {
  PaymentQuerySchema,
  PaymentBodySchema,
  planPrices,
  TeamInvoiceSchema,
  mockInvoices,
} from '@/lib/utils/repo/user_payment_info.repo';
import { formatApiResponse } from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { TPlanType } from '@/interfaces/subscription';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: STATUS_MESSAGE.METHOD_NOT_ALLOWED });
  }

  try {
    // Info: (20250218 - tzuhan) 驗證 URL 參數
    const { userId } = PaymentQuerySchema.parse(req.query);

    //  Info: (20250218 - tzuhan) 驗證請求 Body
    const { planId } = PaymentBodySchema.parse(req.body);

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
      planId: planId as TPlanType,
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

    const result = formatApiResponse(STATUS_MESSAGE.SUCCESS, validatedPayload);

    return res.status(result.httpCode).json(result.result);
  } catch (error) {
    return res
      .status(400)
      .json({ success: false, message: STATUS_MESSAGE.INVALID_INPUT_TYPE, error });
  }
}
