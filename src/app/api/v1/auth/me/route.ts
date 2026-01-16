import { NextRequest } from 'next/server';
import { getIdentityFromDeWT } from '@/lib/auth/dewt';
import { jsonOk, jsonFail } from '@/lib/utils/response';
import { ApiCode } from '@/lib/utils/status';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');

    // Info: (20251224 - Tzuhan) 1. Verify Token & Get User
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(ApiCode.UNAUTHORIZED, 'Invalid or expired token');
    }

    // Info: (20251230 - Update) 新增 pubKeyX, pubKeyY 回傳
    return jsonOk({
      address: user.address,
      name: user.name,
      role: user.role,
      pubKeyX: user.pubKeyX,
      pubKeyY: user.pubKeyY,
    });
  } catch (error) {
    console.error('[API] /auth/me error:', error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Internal Server Error');
  }
}
