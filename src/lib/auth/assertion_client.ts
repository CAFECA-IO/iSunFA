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
  // Info: (20260810 - Luphia) 由 challengeToken 發出的 challenge 需附上原 token 供出處驗證
  challengeToken?: string;
  // Info: (20260810 - Luphia) 僅 passkey 路徑會用到
  passkeyOptions?: Omit<AuthenticateOptions, "challenge">;
}

interface ICustodialSignResponse {
  code: ApiCode | string;
  message?: string;
  errorCode?: string;
  payload: { assertion: AuthenticationJSON; userOp?: UserOperationJson } | null;
}

// Info: (20260812 - Luphia) base64 → ArrayBuffer；PRF 的兩條路徑都要回同一種型別給呼叫端
function base64ToArrayBuffer(value: string): ArrayBuffer {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

async function postCustodialSign(
  body: Record<string, unknown>,
): Promise<{ assertion: AuthenticationJSON; userOp?: UserOperationJson }> {
  const response = await fetch("/api/v1/auth/custodial/sign", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("dewt")}`,
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as ICustodialSignResponse;

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

  return data.payload;
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

  const { assertion } = await postCustodialSign({
    challenge: params.challenge,
    challengeToken: params.challengeToken,
  });
  return assertion;
}

/**
 * Info: (20260812 - Luphia) 取得端到端加密用的 PRF 秘密，不管帳號是哪一種。
 *
 * 與 `requestAssertion()` 同一個道理,只是對象從「簽章」換成「PRF 輸出」:
 * - passkey 帳號:行為完全不變,仍由驗證器以 WebAuthn PRF 擴充派生。
 * - 託管帳號:改呼叫 `/api/v1/auth/custodial/prf`,由伺服器以保險庫主密鑰派生。
 *
 * 為什麼一定要統一到這裡:`getPrfSecret()` 原本直接呼叫 `navigator.credentials.get()`,
 * 而託管帳號沒有 passkey —— 那個對話框開得起來但永遠不會成功,
 * 使用者關掉它得到的是 `NotAllowedError`,再被上層翻譯成「您的裝置不支援」。
 * 裝置沒問題,是帳號沒有 passkey。ADR 016 對 `startLogin` 寫過同一句警告,
 * 它對 PRF 一字不改地成立。
 *
 * **兩條路徑的隱私保證不同,呼叫端必須知道**:passkey 路徑的秘密只存在於使用者的
 * 驗證器裡,伺服器連解密的能力都沒有;託管路徑由伺服器派生,伺服器**有**那個能力。
 * 這與託管錢包本來的信任模型一致（平台已持有其簽章私鑰），但介面文案不得混用
 * 同一句保證（見 carbon_chatbot 的 unlock 提示）。
 */
export async function requestPrfSecret(params: {
  // Info: (20260812 - Luphia) base64 的 salt；兩條路徑用同一份，才能保證同一個包裝解得開
  prfSaltBase64: string;
  /**
   * Info: (20260812 - Luphia) 來自 /auth/me 的 custody。
   *
   * 與 `requestAssertion` 不同,這裡**沒有預設值**（PR review P-2）:那邊猜錯只是一次
   * 簽章失敗,這邊猜錯會拿到一把錯的包裝金鑰 —— 把託管帳號當成 passkey 就是開出一個
   * 永遠不會成功的系統對話框,正是這批修正要消滅的 bug。未知時拋錯,不猜。
   */
  custody?: string;
  // Info: (20260812 - Luphia) passkey 路徑的實作由呼叫端注入，避免這支把 WebAuthn 細節一起拖進來
  derivePasskeySecret: () => Promise<ArrayBuffer>;
}): Promise<ArrayBuffer> {
  if (params.custody === undefined) {
    throw new AppError({
      code: "AU000021",
      message:
        "account custody is not loaded yet; refusing to guess a key source",
      status: ApiCode.VALIDATION_ERROR,
    });
  }

  if (params.custody !== WalletCustodyType.CUSTODIAL) {
    return params.derivePasskeySecret();
  }

  const response = await fetch("/api/v1/auth/custodial/prf", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("dewt")}`,
    },
    body: JSON.stringify({ prfSalt: params.prfSaltBase64 }),
  });

  const data = (await response.json()) as {
    code: ApiCode | string;
    message?: string;
    errorCode?: string;
    payload: { prfSecret: string } | null;
  };

  if (data.code !== ApiCode.SUCCESS || !data.payload?.prfSecret) {
    throw new AppError({
      code: typeof data.errorCode === "string" ? data.errorCode : "IS000099",
      message: data.message || "Custodial PRF derivation failed",
      status:
        typeof data.code === "string" &&
        (Object.values(ApiCode) as string[]).includes(data.code)
          ? (data.code as ApiCode)
          : ApiCode.INTERNAL_SERVER_ERROR,
    });
  }

  return base64ToArrayBuffer(data.payload.prfSecret);
}

export interface IOrderPaymentAssertionParams {
  orderId: string;
  custody?: string;
  // Info: (20260811 - Luphia) passkey 路徑仍由前端組 UserOp 並簽它的雜湊
  userOp: UserOperationJson;
  challenge: string;
}

/**
 * Info: (20260811 - Luphia) 付款專用：取得 assertion **與實際要送出的那份 UserOp**。
 *
 * 兩條路徑回傳的 userOp 不一定是同一份，這是刻意的：
 * - passkey：使用者以生物辨識授權自己裝置上組出的那份，原樣沿用。
 * - 託管：伺服器不接受呼叫端組好的 UserOp（只驗 sender 擋不住任意 callData），
 *   它依訂單自行組一份、簽它，並把那一份回傳。呼叫端必須提交回傳的這份，
 *   否則簽章對不上雜湊。
 */
export async function requestOrderPaymentAssertion(
  params: IOrderPaymentAssertionParams,
): Promise<{ assertion: AuthenticationJSON; userOp: UserOperationJson }> {
  if (params.custody !== WalletCustodyType.CUSTODIAL) {
    const assertion = await fido2ClientService.startLogin({
      challenge: params.challenge,
      userVerification: "required",
      timeout: 60000,
    });
    return { assertion, userOp: params.userOp };
  }

  const result = await postCustodialSign({ orderId: params.orderId });
  if (!result.userOp) {
    throw new AppError({
      code: "IS000099",
      message: "Custodial signing returned no user operation",
      status: ApiCode.INTERNAL_SERVER_ERROR,
    });
  }

  return { assertion: result.assertion, userOp: result.userOp };
}
