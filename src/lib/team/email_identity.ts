/**
 * Info: (20260818 - Luphia) 信箱的「同一個收件匣」判定（PR #6652 第三輪 C-1）。
 *
 * 投遞用的地址與**識別用的地址**是兩件事，這裡只負責後者。
 *
 * 起因：`victim@gmail.com`、`victim+1@gmail.com`、`v.ictim@gmail.com` 會投遞到
 * 同一個收件匣，但先前只做 `trim().toLowerCase()`，於是三者產生**不同**的
 * `pendingKey`（唯一鍵擋不住重複邀請）與**不同**的冪等鍵（每一封都真的刷
 * OWNER 那張卡）。金額有單期上限封頂，但對年繳大團隊而言
 * 「當期訂閱費 2 倍」是真錢，而且是 merchant-initiated 的扣款。
 *
 * 兩條刻意的界線：
 *
 * 1. **只用於鍵，不用於投遞**。`inviteeEmail` 存的仍是使用者輸入的正規化結果，
 *    信也寄到那裡——把 `v.ictim@gmail.com` 改寫成 `victim@gmail.com` 再寄出，
 *    是在替使用者決定他的地址長什麼樣。
 * 2. **點號規則只套用在確定會忽略點號的網域**。只有 Gmail 系列這樣做；
 *    對其他網域拿掉點號會把兩個不同的人判成同一個，那比漏擋更糟——
 *    受害者是「被誤判而邀請不出去」的無辜使用者。
 */

// Info: (20260818 - Luphia) 已知會忽略本地部分點號的網域（Google 系列）
const DOT_INSENSITIVE_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

/**
 * Info: (20260818 - Luphia) 子地址（plus addressing）在主流服務商都會落到同一個收件匣，
 * 因此一律去除。這是 RFC 5233 的慣例，不是單一廠商的行為。
 *
 * Info: (20260818 - Luphia) 為什麼子地址不分網域、點號卻只套 Gmail（第五輪低）。
 *
 * 兩條規則的標準不同不是疏忽，是**錯誤方向不同**：
 *
 * - **點號**只有 Google 系列會忽略。對其他網域拿掉點號會把
 *   `a.lice@corp.com` 與 `alice@corp.com` 判成同一個人——那是**誤合併**，
 *   受害者是「被誤判而邀請不出去」或「被誤標為信箱不符」的無辜第三方。
 * - **子地址**幾乎所有服務商都支援（Gmail、Outlook、Fastmail、多數 IMAP
 *   代管），因此不分網域去除。少數自建系統確實把 `bob+team@corp.com` 當成
 *   獨立信箱，那時的代價是**漏合併**：唯一鍵擋不住重複邀請（金額另有單期上限
 *   封頂）、或稽核訊號漏報一次不符。
 *
 * 兩害相權：誤合併會傷到與這件事無關的人，漏合併只是少擋一次。
 * 因此點號從嚴、子地址從寬。
 *
 * ⚠️ 這個取捨對**鍵**（`pendingKey`／冪等鍵）與**稽核比對**的方向其實相反：
 * 鍵那一側寧可多合併（避免重複扣款），比對那一側多合併會漏報。
 * 目前共用同一支函式，因為「同一個人」只能有一個答案處——
 * 兩邊各寫一套，會出現唯一鍵說是同一個人、稽核說不是。
 */
function stripSubaddress(local: string): string {
  const plus = local.indexOf("+");
  return plus === -1 ? local : local.slice(0, plus);
}

/**
 * Info: (20260818 - Luphia) 回傳「同一個收件匣」的代表字串，供唯一鍵與冪等鍵使用。
 * 格式不合法（沒有 `@`）時原樣回傳——判定的職責在 `isValidInviteEmail`，
 * 這裡不重複驗證，也不該因為格式問題而丟錯。
 */
export function canonicalizeEmailForKey(email: string): string {
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  if (at <= 0) return normalized;

  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);

  const withoutSubaddress = stripSubaddress(local);
  const canonicalLocal = DOT_INSENSITIVE_DOMAINS.has(domain)
    ? withoutSubaddress.replace(/\./g, "")
    : withoutSubaddress;

  return `${canonicalLocal}@${domain}`;
}
