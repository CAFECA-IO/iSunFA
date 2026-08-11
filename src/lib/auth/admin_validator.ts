import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { Role } from "@/constants/role";
import { webAuthnService } from "@/services/webauthn.service";
import { verifyChallengeToken } from "@/lib/auth/challenge_token";
import { ChallengePurpose } from "@/constants/challenge_purpose";
import type { AuthenticationJSON } from "@passwordless-id/webauthn/dist/esm/types";

export interface IAdminActionPayload {
  fido2Signature?: {
    authentication: AuthenticationJSON;
    challengeToken: string;
  };
  [key: string]: unknown;
}

/**
 * Info: (20260416 - Luphia) 驗證管理員 FIDO2 簽章
 * Validates the administrative FIDO2 payload executing mutating operations.
 * Requires HTTP Req to contain authentic DEWT Session + FIDO2 verification structure.
 */
export async function validateAdminFido2(req: Request) {
  // Info: (20260416 - Luphia) 1. JWT and Basic Authorization
  const authHeader = req.headers.get("authorization");
  if (!authHeader) throw new Error("Missing authorization header");

  const jwtUser = await getIdentityFromDeWT(authHeader);
  if (!jwtUser) throw new Error("Unauthorized");

  const user = await webAuthnRepo.findUserById(jwtUser.id);
  if (!user || (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN)) {
    throw new Error("Forbidden: Admin access mandatory");
  }

  // Info: (20260416 - Luphia) 2. Body Parsing & FIDO2 Struct Evaluation
  const body: IAdminActionPayload = await req.json().catch(() => ({}));

  if (
    !body.fido2Signature ||
    !body.fido2Signature.authentication ||
    !body.fido2Signature.challengeToken
  ) {
    throw new Error("FIDO2 signature required to perform this action.");
  }

  const { authentication, challengeToken } = body.fido2Signature;

  // Info: (20260416 - Luphia) 3. FIDO2 Signature Integrity Check
  /**
   * Info: (20260811 - Luphia) 管理員操作只接受 ADMIN_ACTION 用途、且綁定本人的 token。
   * 沒有這兩項比對時，任何一枚使用者手上的 challengeToken 都能授權最高權限操作。
   */
  const expectedChallenge = await verifyChallengeToken(
    challengeToken,
    ChallengePurpose.ADMIN_ACTION,
    user.id,
  );

  const isValid = await webAuthnService.verifySignature(
    user.address,
    authentication,
    expectedChallenge,
  );

  if (!isValid) {
    throw new Error("Invalid FIDO2 biological signature");
  }

  return { user, body };
}
