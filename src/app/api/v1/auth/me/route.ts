import { NextRequest } from 'next/server';
import { getIdentityFromDeWT } from '@/lib/auth/dewt';
import { jsonOk, jsonFail } from '@/lib/utils/response';
import { ApiCode } from '@/lib/utils/status';
import { publicClient } from '@/lib/viem';
import { ABIS } from '@/config/contracts';
import { Address } from 'viem';
import { DEFAULT_PLAN } from '@/constants/plan';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');

    // Info: (20251224 - Tzuhan) 1. Verify Token & Get User
    const user = await getIdentityFromDeWT(authHeader);

    if (!user) {
      return jsonFail(ApiCode.UNAUTHORIZED, 'Invalid or expired token');
    }

    // ToDo: (20260116 - Luphia) Use Blockchain Data for Plan & Credits
    let plan: string = DEFAULT_PLAN;
    let credits = 0;

    if (user.identityAddress) {
      try {
        const [chainPlan, chainCredits] = await Promise.all([
          publicClient.readContract({
            address: user.identityAddress as Address,
            abi: ABIS.IDENTITY,
            functionName: 'getPlan',
          }),
          publicClient.readContract({
            address: user.identityAddress as Address,
            abi: ABIS.IDENTITY,
            functionName: 'getCredits',
          }),
        ]);
        plan = chainPlan as string;
        credits = Number(chainCredits);
      } catch (err) {
        console.warn(`[API] /auth/me failed to read contract for ${user.identityAddress}:`, err);
      }
    }

    // Info: (20251230 - Update) 新增 pubKeyX, pubKeyY 回傳
    return jsonOk({
      address: user.address,
      name: user.name,
      role: user.role,
      pubKeyX: user.pubKeyX,
      pubKeyY: user.pubKeyY,
      plan,
      credits,
    });
  } catch (error) {
    console.error('[API] /auth/me error:', error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, 'Internal Server Error');
  }
}
