import { NextRequest } from 'next/server';
import { getIdentityFromDeWT } from '@/lib/auth/dewt';
import { jsonOk, jsonFail } from '@/lib/utils/response';
import { ApiCode } from '@/lib/utils/status';
import { webAuthnService } from '@/services/webauthn.service';
import { orderGenerator } from '@/lib/order/order.generator';

export async function POST(request: NextRequest) {
  try {
    // Info: (20260128 - Luphia) Verify user identity from DeWT token
    const authHeader = request.headers.get('Authorization');
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(ApiCode.UNAUTHORIZED, 'Invalid or expired token');
    }

    const body = await request.json();
    const { type = 'ANALYSIS', category, periodType, periodValue, year, amount, credits, paymentMethodId, country, keyword } = body;

    // Info: (20260130 - Tzuhan) Ensure user exists in DB before creating order to avoid FK errors
    await webAuthnService.ensureUserSynced(user.address);

    if (type === 'PAYMENT') {
      if (!amount || amount <= 0 || !credits || credits <= 0) {
        return jsonFail(ApiCode.VALIDATION_ERROR, 'Invalid amount or credits');
      }
      if (!paymentMethodId) {
        return jsonFail(ApiCode.VALIDATION_ERROR, 'paymentMethodId is required');
      }
      const result = await orderGenerator.generatePaymentOrder(user.id, {
        amount,
        credits,
        paymentMethodId,
      });
      return jsonOk(result);
    }

    if (type === 'ANALYSIS') {
      // Info: (20260128 - Luphia) Validate required analysis parameters
      if (!category || !periodType) {
        return jsonFail(ApiCode.VALIDATION_ERROR, 'Missing required fields for analysis');
      }

      // Info: (20260128 - Luphia) Generate Analysis Order and Challenge
      const result = await orderGenerator.generateAnalysisOrder(user.id, {
        category,
        periodType,
        periodValue,
        year,
        country,
        keyword
      });

      return jsonOk(result);
    }

    return jsonFail(ApiCode.VALIDATION_ERROR, 'Invalid order type');

  } catch (error) {
    console.error('[API] /user/order error:', error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Failed to create order');
  }
}
