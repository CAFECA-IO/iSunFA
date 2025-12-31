import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { webAuthnService } from '@/services/webauthn.service';
import { jsonOk, jsonFail } from '@/lib/utils/response';
import { ApiCode } from '@/lib/utils/status';
import { AppError } from '@/lib/utils/error';

export async function POST(request: NextRequest) {
  try {
    const { authentication } = await request.json();
    const cookieStore = await cookies();
    const challenge = cookieStore.get('login_challenge')?.value;

    if (!challenge) {
      return jsonFail(ApiCode.VALIDATION_ERROR, 'Challenge expired or missing. Please retry.');
    }

    const { dewt, user } = await webAuthnService.loginUsingCredential(authentication, challenge);

    // Clear challenge cookie
    cookieStore.delete('login_challenge');

    // Info: (20251223 - Tzuhan) result 包含 { dewt, user }
    return jsonOk({ dewt, user }); // Changed to return { dewt, user }
  } catch (error) {
    console.error('[API] Login error:', error);
    if (error instanceof AppError) {
      return jsonFail(error.code, error.message);
    }
    return jsonFail(ApiCode.UNAUTHORIZED, 'Login failed');
  }
}
