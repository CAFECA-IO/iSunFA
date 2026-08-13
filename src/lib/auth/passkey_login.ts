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
 * Info: (20260813 - Julian) Passkey 登入儀式，只有這一份。
 *
 * ## 為什麼要抽出來
 *
 * 這段流程（取 challenge → 喚起 passkey → 驗證 → 寫入 DeWT）原本只存在於
 * `auth_modal.tsx`。出勤閘門需要**同樣的登入**但**不同的後續**（不導頁、
 * 不處理活動獎勵），照抄一份的結果是兩個地方各自演化 ——
 * 而 `eslint.config.mjs` 那條 `no-restricted-syntax` 的註解已經寫過一次
 * 「第一版只遷移了一個呼叫點，其餘十幾處全數漏掉」的下場。
 *
 * ## 為什麼登入不走 `requestAssertion`
 *
 * `requestAssertion` 依 `custody` 決定用 passkey 還是伺服器代簽，而 `custody`
 * 來自 `/auth/me` —— 登入的當下還沒有 session，也就沒有 custody 可判斷。
 * 這正是那條規則例外清單第 1 類的理由，本檔案因此列在清單內。
 *
 * ## localStorage 寫在這裡
 *
 * `verifyLogin` 成功但沒寫 `dewt`，等於登入了卻沒有人知道 ——
 * `AuthContext.refreshAuth()` 只讀 localStorage，不讀回傳值。把這兩行留給
 * 呼叫端，就是留一個「忘了寫」的洞給下一個接手的人。
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
   * 舊的 address-based options，用它去 `verifyLogin` 只會得到一個難解的 400。
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
