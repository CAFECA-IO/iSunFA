import { cookies } from 'next/headers';
import { webAuthnService } from '@/services/webauthn.service';
import { jsonOk, jsonFail } from '@/lib/utils/response';
import { ApiCode } from '@/lib/utils/status';

export async function POST() {
  try {
    // Info: (20251231 - Tzuhan) Usernameless flow: address is not needed for challenge generation
    const challenge = await webAuthnService.generateLoginOptions();

    // Set challenge in HTTP-only cookie
    const cookieStore = await cookies();
    cookieStore.set('login_challenge', challenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 300, // 5 minutes
      path: '/',
    });

    return jsonOk({ challenge });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate challenge';
    console.error('[API] Challenge error:', error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, errorMessage);
  }
}
