import { NextRequest } from 'next/server';
import { webAuthnService } from '@/services/webauthn.service';
import { jsonOk, jsonFail } from '@/lib/utils/response';
import { ApiCode } from '@/lib/utils/status';

export async function POST(request: NextRequest) {
  try {
    const { username, registration, challenge } = await request.json();

    if (!challenge) {
      return jsonFail(ApiCode.VALIDATION_ERROR, 'Challenge expired or missing. Please retry.');
    }

    const { dewt, user } = await webAuthnService.registerUser(username, registration, challenge);

    // Info: (20251223 - Tzuhan) result 包含 { dewt, user }
    return jsonOk({ dewt, user });
  } catch (error: unknown) {
    console.error('[API] Register error:', error);
    const message = error instanceof Error ? error.message : 'Registration failed';
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, message);
  }
}
