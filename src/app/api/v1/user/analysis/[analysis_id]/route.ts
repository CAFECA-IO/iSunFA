import { NextRequest } from 'next/server';
import { getIdentityFromDeWT } from '@/lib/auth/dewt';
import { jsonOk, jsonFail } from '@/lib/utils/response';
import { ApiCode } from '@/lib/utils/status';
import { analysisRepo } from '@/repositories/analysis.repo';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ analysis_id: string }> }
) {
  try {
    const { analysis_id: analysisId } = await params;
    const authHeader = request.headers.get('Authorization');
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(ApiCode.UNAUTHORIZED, 'Invalid or expired token');
    }

    if (!analysisId) {
      return jsonFail(ApiCode.VALIDATION_ERROR, 'Analysis ID is required');
    }

    // Info: (20260130 - Luphia) Fetch analysis details
    const analysis = await analysisRepo.findById(analysisId);

    if (!analysis) {
      return jsonFail(ApiCode.NOT_FOUND, 'Analysis not found');
    }

    // Info: (20260130 - Luphia) Authorization Check
    if (analysis.userId !== user.id) {
      return jsonFail(ApiCode.FORBIDDEN, 'You do not have permission to view this analysis');
    }

    // Info: (20260130 - Luphia) Return full details including mission result
    return jsonOk({
      id: analysis.id,
      status: analysis.mission?.status ?? 'UNKNOWN',
      result: analysis.mission?.result,
      createdAt: analysis.createdAt,
      type: analysis.type,
      // Info: (20260130 - Luphia) Include any other necessary fields
    });

  } catch (error) {
    console.error(`[API] GET /user/analysis/${(await params).analysis_id} error:`, error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, (error as Error).message || 'Internal Server Error');
  }
}
