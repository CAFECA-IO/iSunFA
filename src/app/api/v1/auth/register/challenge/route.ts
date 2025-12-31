import { cookies } from 'next/headers';
import { webAuthnService } from '@/services/webauthn.service';
import { jsonOk, jsonFail } from '@/lib/utils/response';
import { ApiCode } from '@/lib/utils/status';

export async function POST() {
  try {
    const challenge = await webAuthnService.generateLoginOptions();

    const cookieStore = await cookies();
    cookieStore.set('register_challenge', challenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 300,
      path: '/',
    });

    return jsonOk({ challenge });
  } catch (error: unknown) {
    console.error('[API] Register challenge error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate challenge';
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, message);
  }
}
