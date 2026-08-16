/**
 * Info: (20260816 - Luphia) 「同一團隊、同一對象、同時只能有一封待接受邀請」的唯一鍵。
 *
 * 這條約束**只該管 PENDING**：邀請被接受或被拒之後，同一個人應該可以再被邀請一次
 * （離職再回鍋是常態）。原本的寫法是 `@@unique([teamId, inviteeEmail, status])`，
 * 把 status 放進鍵裡看似達成了這件事，實際上是把**歷史列**也一起約束了——
 * 第二次接受會產生第二列 `(team, email, ACCEPTED)`，於是撞唯一鍵、永遠加不進來，
 * 而席次費已經扣了。
 *
 * Postgres 的正解是 partial unique index（`WHERE status = 'PENDING'`），
 * 但 Prisma schema 無法表達，而本專案的 schema 是以 `prisma db push` 套用的
 * （見 src/services/setup.db.service.ts）——手動建的索引會在下一次 push 被 drift 掉，
 * 這個坑 ADR 019 已經踩過一次。
 *
 * 因此改用「可為 NULL 的單欄唯一鍵」：PENDING 時填值、離開 PENDING 時設回 NULL。
 * Postgres 允許多個 NULL，效果與 partial unique index 相同，而且它就寫在 schema 裡，
 * 讀 schema 的人看得到，`db push` 也帶得走。
 */

/**
 * Info: (20260816 - Luphia) 位址與信箱共用同一個鍵欄位，以前綴區分。
 * 一封邀請只會有其中一種識別（email 邀請時對方還沒有位址），
 * 兩個欄位各配一個唯一鍵只會多一個要同步維護的東西。
 */
export function buildPendingInviteKey(params: {
  teamId: string;
  inviteeAddress?: string | null;
  inviteeEmail?: string | null;
}): string | null {
  const { teamId, inviteeAddress, inviteeEmail } = params;

  const email = inviteeEmail?.trim().toLowerCase();
  if (email) return `${teamId}:mail:${email}`;

  /**
   * Info: (20260816 - Luphia) 位址一律轉小寫比對。
   * EIP-55 的檢查碼大小寫是同一個位址的兩種寫法，
   * 照原樣當鍵會讓 `0xAb…` 與 `0xab…` 各佔一席。
   */
  const address = inviteeAddress?.trim().toLowerCase();
  if (address) return `${teamId}:addr:${address}`;

  return null;
}
