import { INVITE_EMAIL_MATCH, type InviteEmailMatch } from "@/constants/status";
import { canonicalizeEmailForKey } from "@/lib/team/email_identity";

/**
 * Info: (20260817 - Luphia) 受邀信箱與接受者信箱的比對（稽核用，不影響能否加入）。
 *
 * 為什麼是「記錄」而不是「驗證」：本站的 passkey 註冊全程不問 email——
 * `User` 根本沒有 email 欄位，email 只存在於第三方登入的綁定 `UserIdentity`。
 * 因此邀請信箱**不是身分斷言**，只是投遞地址；一封信寄到哪裡，
 * 與最後是誰拿著連結完成註冊，中間沒有任何系統性的連結。
 *
 * 對於有第三方綁定的那個子集，比對是有意義的訊號，所以記下來；
 * 但**不阻擋**：工作信箱收到邀請、用個人 Google 帳號登入是完全正常的行為。
 */

/**
 * Info: (20260817 - Luphia) 只採信**已驗證**的信箱。
 *
 * 未驗證的 email 是使用者宣稱的字串，拿它比對出來的「相符」不比沒比對可靠多少，
 * 而它會出現在稽核報告上被當成一項證據。寧可回 UNAVAILABLE（誠實的「不知道」）。
 *
 * Info: (20260818 - Luphia) 責任歸屬（第三輪 D）：**過濾在呼叫端**。
 * 這支函式收到什麼就比什麼——它不知道也不該知道 `emailVerified` 長什麼樣。
 * 先前檔頭寫得像是這裡會判驗證狀態，那與實作不符，容易讓下一個人
 * 以為傳未驗證的信箱進來也安全。參數名已改為 `verifiedEmails` 以示其約定。
 */
export function resolveInviteEmailMatch(
  inviteeEmail: string | null | undefined,
  verifiedEmails: readonly (string | null | undefined)[],
): InviteEmailMatch | null {
  const invited = inviteeEmail?.trim();

  // Info: (20260817 - Luphia) 位址邀請沒有受邀信箱：不適用，而不是「比對失敗」
  if (!invited) return null;

  /**
   * Info: (20260818 - Luphia) 以「同一個收件匣」比對，不做字面比對（第四輪 B-4）。
   *
   * 原本是 `trim().toLowerCase()` 精確比對，於是把邀請寄到
   * `alice+isunfa@gmail.com`、本人以已驗證的 `alice@gmail.com` 接受，
   * 會被判成 `MISMATCHED`——而 C-2 剛把這個訊號接到告警與成員卡片上，
   * 第一批被看見的就會是誤報。**會誤報的稽核訊號比沒有訊號更糟**：
   * 看過幾次之後沒有人會再認真看它。
   *
   * 用的是與 `pendingKey`／冪等鍵同一支 `canonicalizeEmailForKey`
   * （去子地址、Gmail 系列去點號）。判定「是不是同一個人」這件事
   * 只能有一個答案處，否則唯一鍵說是同一個人、稽核說不是。
   */
  const invitedKey = canonicalizeEmailForKey(invited);

  const candidates = verifiedEmails
    .map((email) => email?.trim())
    .filter((email): email is string => Boolean(email))
    .map(canonicalizeEmailForKey);

  if (candidates.length === 0) return INVITE_EMAIL_MATCH.UNAVAILABLE;
  return candidates.includes(invitedKey)
    ? INVITE_EMAIL_MATCH.MATCHED
    : INVITE_EMAIL_MATCH.MISMATCHED;
}
