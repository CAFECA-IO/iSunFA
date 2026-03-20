import { NextRequest } from 'next/server';
import { getIdentityFromDeWT } from '@/lib/auth/dewt';
import { jsonOk, jsonFail } from '@/lib/utils/response';
import { ApiCode } from '@/lib/utils/status';
import { lookupCompany } from '@/lib/utils/company_lookup';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(ApiCode.UNAUTHORIZED, 'Invalid or expired token');
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query) {
      return jsonFail(ApiCode.VALIDATION_ERROR, 'Query parameter is required');
    }

    const results = await lookupCompany(query);
    return jsonOk(results);
  } catch (error) {
    console.error('[API] /company/lookup error:', error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Failed to lookup company');
  }
}
