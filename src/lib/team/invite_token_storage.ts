/**
 * Info: (20260818 - Luphia) 落地頁取得邀請 token 的規則（PR #6652 第五輪 T-9）。
 *
 * 這段邏輯原本寫在 `app/invite/page.tsx` 的 `useEffect` 裡，而本 repo 沒有元件
 * 測試環境（無 jsdom / testing-library）——於是**刪掉 sessionStorage 回讀那幾行，
 * 沒有任何測試會紅**，而症狀是「按 F5 或取消 passkey 對話框之後，邀請就失效了」。
 *
 * 抽成純函式而不是引入元件測試環境：要證明的是「規則」而不是 React 的行為，
 * 而規則只需要一個假的 Storage 就測得完。頁面那一側剩下的是把
 * `location.hash` 與 `window.sessionStorage` 接進來，以及呼叫 `history.replaceState`。
 *
 * 三條規則本身的理由：
 *
 * 1. **hash 優先**：使用者剛從信裡點進來，那把才是他這次要用的。
 * 2. **沒有 hash 時讀備援**：hash 一取到就被 `replaceState` 抹掉（不留在可分享的
 *    網址裡），因此重新整理之後只剩備援。沒有它，F5 就等於連結失效。
 * 3. **備援只活在這個分頁**（`sessionStorage`），且用完即清。
 */

export const INVITE_TOKEN_STORAGE_KEY = "isunfa.invite.token";

/**
 * Info: (20260818 - Luphia) 只取需要的兩個方法，呼叫端傳 `window.sessionStorage` 即可。
 * 測試傳一個假的物件，不需要 jsdom。
 */
export interface ITokenStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface IInviteTokenResolution {
  token: string | null;
  /**
   * Info: (20260818 - Luphia) 來自 hash 的 token 才需要抹網址與寫備援；
   * 來自備援的不必再寫一次，也沒有網址可抹。呼叫端據此決定副作用。
   */
  source: "hash" | "storage" | "none";
}

/**
 * Info: (20260818 - Luphia) `location.hash` 會帶著開頭的 `#`；空字串與只有 `#`
 * 都視為沒有。刻意不驗證格式：格式由後端的 `inviteTokenBodySchema` 判斷，
 * 前端多一套規則只會出現兩種「什麼算合法」的答案。
 */
export function resolveInviteToken(
  hash: string,
  storage: ITokenStorage,
): IInviteTokenResolution {
  const fromHash = hash.replace(/^#/, "").trim();
  if (fromHash) return { token: fromHash, source: "hash" };

  const stored = storage.getItem(INVITE_TOKEN_STORAGE_KEY)?.trim();
  if (stored) return { token: stored, source: "storage" };

  return { token: null, source: "none" };
}

export function rememberInviteToken(
  storage: ITokenStorage,
  token: string,
): void {
  storage.setItem(INVITE_TOKEN_STORAGE_KEY, token);
}

/**
 * Info: (20260818 - Luphia) 三種終局都要清：接受、拒絕、連結失效。
 *
 * 少了「失效」那一種，一封已經沒用的邀請會留在備援裡；使用者按上一頁回到
 * 已被 `replaceState` 抹成 `/invite` 的歷史項時，又會拿它重試一次。
 */
export function forgetInviteToken(storage: ITokenStorage): void {
  storage.removeItem(INVITE_TOKEN_STORAGE_KEY);
}
