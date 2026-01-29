import { NextRequest } from 'next/server';
import { getIdentityFromDeWT } from '@/lib/auth/dewt';
import { jsonOk, jsonFail } from '@/lib/utils/response';
import { ApiCode } from '@/lib/utils/status';
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
    const { category, periodType, periodValue, year } = body;

    // Info: (20260128 - Luphia) Validate required analysis parameters
    if (!category || !periodType) {
      return jsonFail(ApiCode.VALIDATION_ERROR, 'Missing required fields');
    }

    // Info: (20260128 - Luphia) Generate Analysis Order and Challenge
    const result = await orderGenerator.generateAnalysisOrder(user.id, {
      category,
      periodType,
      periodValue,
      year
    });

    return jsonOk(result);

  } catch (error) {
    console.error('[API] /user/order error:', error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Failed to create order');
  }
}
