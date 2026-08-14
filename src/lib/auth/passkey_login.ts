"use client";

import { AppError } from "@/lib/utils/error";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import {
  fido2ClientService,
  getLoginOptions,
  verifyLogin,
  ILoginResult,
} from "@/lib/auth/fido2_client";

/**
 * Info: (20260813 - Julian) Passkey 登入儀式，全站只有這一份，供多個呼叫點共用。
 *
 * 登入時不走 `requestAssertion`：那支函式依 `custody`（來自 `/auth/me`）決定
 * 用 passkey 還是伺服器代簽，但登入當下還沒有 session，沒有 custody 可判斷。
 * `localStorage`（`dewt` / `user_address`）的寫入就放在這裡，呼叫端不必再寫一次 ——
 * `AuthContext.refreshAuth()` 只讀 localStorage，不讀函式回傳值。
 */

export type PasskeyLoginStep =
  | "FETCHING_CHALLENGE"
  | "AUTHENTICATING"
  | "VERIFYING";

export async function loginWithPasskey(
  onStep?: (step: PasskeyLoginStep) => void,
): Promise<ILoginResult> {
  onStep?.("FETCHING_CHALLENGE");
  const { challenge, token } = await getLoginOptions();

  /**
   * Info: (20260813 - Julian) 無狀態流程一定會帶 token；沒帶代表拿到的是
   * 舊的 address-based options，會讓 `verifyLogin` 回一個難解的 400。
   */
  if (!token) throw new AppError(API_ERRORS.AUTH_LOGIN_FAILED);

  onStep?.("AUTHENTICATING");
  // Info: (20260813 - Julian) 不傳 allowCredentials，走探索模式讓裝置自己列出可用的 passkey
  const authentication = await fido2ClientService.startLogin({
    challenge,
    userVerification: "required",
    timeout: 60000,
  });

  onStep?.("VERIFYING");
  const payload = await verifyLogin(token, authentication);

  localStorage.setItem("dewt", payload.dewt);
  localStorage.setItem("user_address", payload.user.address);

  return payload;
}
