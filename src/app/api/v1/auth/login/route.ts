import { NextRequest } from 'next/server';
import { webAuthnService } from '@/services/webauthn.service';
import { jsonOk, jsonFail } from '@/lib/utils/response';
import { ApiCode } from '@/lib/utils/status';
import { AppError } from '@/lib/utils/error';

export async function POST(request: NextRequest) {
  try {
    const { authentication, challenge } = await request.json();

    if (!challenge) {
      return jsonFail(ApiCode.VALIDATION_ERROR, 'Challenge expired or missing. Please retry.');
    }

    const { dewt, user } = await webAuthnService.loginUsingCredential(authentication, challenge);

    // Info: (20251223 - Tzuhan) result 包含 { dewt, user }
    return jsonOk({ dewt, user });
  } catch (error) {
    console.error('[API] Login error:', error);
    if (error instanceof AppError) {
      return jsonFail(error.code, error.message);
    }
    return jsonFail(ApiCode.UNAUTHORIZED, 'Login failed');
  }
}
