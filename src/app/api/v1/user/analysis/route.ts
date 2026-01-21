import { NextRequest } from 'next/server';
import { getIdentityFromDeWT } from '@/lib/auth/dewt';
import { jsonOk, jsonFail } from '@/lib/utils/response';
import { ApiCode } from '@/lib/utils/status';
import { analysisService } from '@/services/analysis.service';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(ApiCode.UNAUTHORIZED, 'Invalid or expired token');
    }

    const body = await request.json();
    const { category, periodType, periodValue, year } = body;

    if (!category || !periodType) {
      return jsonFail(ApiCode.VALIDATION_ERROR, 'Missing required fields');
    }

    const result = await analysisService.generateAnalysis(user.id, {
      category,
      periodType,
      periodValue,
      year
    });

    return jsonOk(result);

  } catch (error) {
    console.error('[API] /user/analysis error:', error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Failed to generate analysis');
  }
}
