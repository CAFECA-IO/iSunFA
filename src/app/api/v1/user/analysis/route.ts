import { NextRequest } from 'next/server';
import { AuthenticationJSON } from '@passwordless-id/webauthn/dist/esm/types';
import { getIdentityFromDeWT } from '@/lib/auth/dewt';
import { jsonOk, jsonFail } from '@/lib/utils/response';
import { ApiCode } from '@/lib/utils/status';
import { analysisService } from '@/services/analysis.service';
import { webAuthnService } from '@/services/webauthn.service';
import { AppError } from '@/lib/utils/error';
import { analysisRepo } from '@/repositories/analysis.repo';
import { orderGenerator } from '@/lib/order/order.generator';
import { getPeriodDateRange } from '@/lib/analysis/period';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(ApiCode.UNAUTHORIZED, 'Invalid or expired token');
    }

    const body = await request.json();
    const { category, periodType, periodValue, year, authentication } = body;

    // Info: (20260128 - Luphia) Validate FIDO2 Signature against Order
    if (!authentication || !authentication.orderId) {
      return jsonFail(ApiCode.VALIDATION_ERROR, 'FIDO2 signature and Order ID are required');
    }

    const orderId = authentication.orderId;

    try {
      // Info: (20260128 - Luphia) 1. Get Pending Order to retrieve the challenge string (content)
      const order = await orderGenerator.getPendingOrder(orderId, user.id);

      // Info: (20260128 - Luphia) 2. Verify Signature: The challenge signed by user MUST match order.challenge
      await webAuthnService.verifySignature(user.address, authentication, order.challenge);

      // Info: (20260128 - Luphia) 3. Complete Order: Save signature and optional transactionHash
      const authWithTx = authentication as AuthenticationJSON & { transactionHash?: string };
      const txHash = authWithTx.transactionHash;
      await orderGenerator.completeOrder(orderId, JSON.stringify(authentication), txHash);

    } catch (error) {
      if (error instanceof AppError) {
        return jsonFail(error.code, error.message);
      }
      console.error('Order verification failed:', error);
      return jsonFail(ApiCode.UNAUTHORIZED, 'Signature verification failed');
    }

    /**
     * Info: (20260128 - Luphia) Proceed with Analysis Generation
     * Data is already in Order, but we can use body too or trust order data
     * Using body params ensures consistency with frontend request, but ideally we use order.data
     */
    const result = await analysisService.generateAnalysis(user.id, {
      category,
      periodType,
      periodValue,
      year,
      orderId
    });

    return jsonOk(result);

  } catch (error) {
    console.error('[API] /user/analysis error:', error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Failed to generate analysis');
  }
}

// Info: (20260128 - Luphia) Get analysis history for the user
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(ApiCode.UNAUTHORIZED, 'Invalid or expired token');
    }

    // Info: (20260128 - Luphia) Fetch analyses with related mission data
    const analyses = await analysisRepo.findByUserId(user.id);

    // Info: (20260128 - Luphia) Map DB result to response format
    const history = analyses.map(analysis => {
      const status = analysis.mission?.status?.toLowerCase() || 'unknown';
      let periodType = 'unknown';

      if (analysis.mission?.name) {
        const parts = analysis.mission.name.split('-');
        if (parts.length >= 3) {
          periodType = parts[2];
        }
      }

      // Info: (20260128 - Luphia) Safely access mission data, we assume mission.data has generatedAt
      const missionData = analysis.mission?.data as Record<string, unknown> | null;
      const generatedAt = typeof missionData?.generatedAt === 'string'
        ? missionData.generatedAt.split('T')[0]
        : analysis.createdAt.toISOString().split('T')[0];

      // Info: (20260128 - Luphia) Extract period info
      const year = typeof missionData?.year === 'number' ? missionData.year : new Date().getFullYear();
      // Info: (20260128 - Luphia) If periodType not in data, fallback to previous parsing or unknown
      let pType = typeof missionData?.periodType === 'string' ? missionData.periodType : periodType;
      // Info: (20260128 - Luphia) If still unknown and we have parsing logic success, use it
      if (pType === 'unknown' && periodType !== 'unknown') {
        pType = periodType;
      }

      const orderData = analysis.order?.data as Record<string, unknown> | null;
      const pValue = typeof missionData?.periodValue === 'string' || typeof missionData?.periodValue === 'number'
        ? missionData.periodValue as string | number
        : (orderData?.periodValue as string | number) || '';

      // Info: (20260128 - Luphia) Fallback periodType from order if unknown
      if (pType === 'unknown' && typeof orderData?.periodType === 'string') {
        pType = orderData.periodType;
      }

      let periodStr = 'N/A';
      if (pType !== 'unknown' && pValue !== '') {
        try {
          const { start, end } = getPeriodDateRange(pType, year, pValue);
          periodStr = start === end ? start : `${start} ~ ${end}`;
        } catch (e) {
          console.warn('Failed to calc date range', e);
        }
      }

      return {
        id: analysis.id,
        generatedAt,
        category: analysis.type,
        periodType: pType,
        period: periodStr,
        year,
        periodValue: pValue,
        status: status,
        reportId: analysis.id
      };
    });

    return jsonOk(history);

  } catch (error) {
    console.error('[API] GET /user/analysis error:', error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Failed to fetch analysis history');
  }
}
