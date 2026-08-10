"use client";

import type {
  AuthenticationJSON,
  AuthenticateOptions,
} from "@passwordless-id/webauthn/dist/esm/types";
import { ApiCode } from "@/lib/utils/status";
import { AppError } from "@/lib/utils/error";
import { WalletCustodyType } from "@/constants/auth_provider";
import { fido2ClientService } from "@/lib/auth/fido2_client";
import { UserOperationJson } from "@/validators";

/**
 * Info: (20260810 - Luphia) 取得一份 WebAuthn assertion，不管帳號是哪一種。
 *
 * 這是 fido2ClientService.startLogin() 的替代品：
 * - passkey 帳號：行為完全不變，仍然喚起裝置上的 passkey。
 * - 託管帳號（第三方登入）：改呼叫 /api/v1/auth/custodial/sign，由伺服器以託管金鑰代簽。
 *
 * 兩者回傳的都是**真正的 WebAuthn assertion**，因此呼叫端後續的
 * encodeWebAuthnSignature、以及後端的 verifySignature 完全不需要分岔——
 * 所有流程維持「必須有有效簽章」，不需要為託管帳號開繞過邏輯。
 *
 * 新增需要簽章的流程時，一律用這支而不是直接呼叫 startLogin，
 * 否則託管帳號會卡在一個永遠不會成功的系統對話框前面。
 */

export interface IRequestAssertionParams {
  // Info: (20260810 - Luphia) 要簽的 challenge（base64url）
  challenge: string;
  // Info: (20260810 - Luphia) 來自 /auth/me 的 custody；未提供時視為 passkey
  custody?: string;
  /**
   * Info: (20260810 - Luphia) 付款等鏈上流程可一併帶上 UserOp。
   * 伺服器會據此重算雜湊並比對 sender，而不是盲目簽收到的 challenge。
   */
  userOp?: UserOperationJson;
  // Info: (20260810 - Luphia) 由 challengeToken 發出的 challenge 需附上原 token 供出處驗證
  challengeToken?: string;
  // Info: (20260810 - Luphia) 僅 passkey 路徑會用到
  passkeyOptions?: Omit<AuthenticateOptions, "challenge">;
}

export async function requestAssertion(
  params: IRequestAssertionParams,
): Promise<AuthenticationJSON> {
  const isCustodial = params.custody === WalletCustodyType.CUSTODIAL;

  if (!isCustodial) {
    return fido2ClientService.startLogin({
      challenge: params.challenge,
      userVerification: "required",
      timeout: 60000,
      ...params.passkeyOptions,
    });
  }

  const response = await fetch("/api/v1/auth/custodial/sign", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("dewt")}`,
    },
    body: JSON.stringify({
      challenge: params.challenge,
      challengeToken: params.challengeToken,
      userOp: params.userOp,
    }),
  });

  const data = (await response.json()) as {
    code: ApiCode | string;
    message?: string;
    errorCode?: string;
    payload: { assertion: AuthenticationJSON } | null;
  };

  if (data.code !== ApiCode.SUCCESS || !data.payload) {
    throw new AppError({
      code: typeof data.errorCode === "string" ? data.errorCode : "IS000099",
      message: data.message || "Custodial signing failed",
      status:
        typeof data.code === "string" &&
        (Object.values(ApiCode) as string[]).includes(data.code)
          ? (data.code as ApiCode)
          : ApiCode.INTERNAL_SERVER_ERROR,
    });
  }

  return data.payload.assertion;
}
