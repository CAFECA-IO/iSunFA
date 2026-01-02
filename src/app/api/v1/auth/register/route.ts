import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { webAuthnService } from '@/services/webauthn.service';
import { jsonOk, jsonFail } from '@/lib/utils/response';
import { ApiCode } from '@/lib/utils/status';

export async function POST(request: NextRequest) {
  try {
    const { username, registration } = await request.json();
    const cookieStore = await cookies();
    const challenge = cookieStore.get('register_challenge')?.value;

    if (!challenge) {
      return jsonFail(ApiCode.VALIDATION_ERROR, 'Challenge expired or missing. Please retry.');
    }

    const { dewt, user } = await webAuthnService.registerUser(username, registration, challenge);

    // Info: (20260102 - Luphia) Clear challenge cookie
    cookieStore.delete('register_challenge');

    return jsonOk({ dewt, user });
  } catch (error: unknown) {
    console.error('[API] Register error:', error);
    const message = error instanceof Error ? error.message : 'Registration failed';
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, message);
  }
}
