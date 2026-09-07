import { getAddress, isAddress } from "viem";

/**
 * Info: (20260826 - Julian) 錢包位址的「同一個對象」判定（review 1.2）。
 *
 * email 那一半早就收斂到 `email_identity.ts`，位址這一半沒有 —— 而它散在四處，
 * 每一處各自決定要不要 lowercase：
 *
 * - `buildPendingInviteKey` 刻意 `.trim().toLowerCase()`（唯一鍵，做對了）
 * - `inviteeAddress` 原樣入庫，`isIntendedRecipient` 與 repo 查詢用精確比對
 * - `prisma/schema.prisma` 沒有 citext，Postgres 的 `=` 大小寫敏感
 *
 * 於是**唯一鍵認得出同一個人，查詢認不出**。實際後果是會計層級的：
 * 管理員貼小寫位址 → `isAddress` 放行（strict 只擋亂大小寫，全小寫合法）
 * → 扣一席的錢 → 受邀者的鈴鐺與團隊頁都查不到、accept 一律 403
 * → 管理員改貼 checksum 再邀一次 → 重複檢查也用精確比對、查不到舊列
 * → **再扣一次** → `createTeamInvitation` 撞 pendingKey 的 P2002 → 500。
 *
 * `User.address` 本身就有兩種形狀共存：viem 對合約回傳一律 EIP-55 checksum，
 * 而 `setup.service.ts` 建的使用者是全小寫。所以這裡要兩支函式，
 * 因為它們回答的是兩個不同的問題（見各自的說明）。
 *
 * ToDo: (20260826 - Julian) `team/[team_id]/members/route.ts` 的
 * `findUserByAddress(address)` 是同一個形狀（使用者輸入直接精確比對），
 * 應一併改走 `findUserByAnyAddressForm`（不在本次通知模組的範圍內）。
 */

/**
 * Info: (20260826 - Julian) **判定與唯一鍵**用：一個位址只有一種寫法。
 *
 * EIP-55 的大小寫是檢查碼，不是身分的一部分 —— `0xAb…` 與 `0xab…`
 * 是同一個位址的兩種寫法。與 `buildPendingInviteKey` 原本那一行同義，
 * 現在由這裡供應，於是「唯一鍵怎麼算」與「比對怎麼算」不會再分岔。
 */
export function canonicalizeAddressForKey(address: string): string {
  return address.trim().toLowerCase();
}

/**
 * Info: (20260826 - Julian) 兩個位址是不是同一個人。
 *
 * 兩邊都要有值才算數 —— `inviteeAddress` 是可空欄位（email 邀請沒有位址），
 * 少了這一層，`"" === ""` 會讓任何人對上一封沒有受邀位址的邀請。
 * 這與 `isIntendedRecipient` 裡那層 `Boolean(...)` 防的是同一件事。
 */
export function isSameAddress(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  if (!left?.trim() || !right?.trim()) return false;
  return canonicalizeAddressForKey(left) === canonicalizeAddressForKey(right);
}

/**
 * Info: (20260826 - Julian) **查詢**用：資料庫裡實際存在的幾種寫法。
 *
 * 為什麼不用 Prisma 的 `mode: "insensitive"`：那會走 ILIKE，
 * 用不到 `User.address` 與 `TeamInvitation` 上的索引，而其中一支是
 * 每次邀請都要打的。改以「列出所有可能的字面值」做 `in` 查詢，
 * 索引仍然吃得到。
 *
 * 只有兩種形狀值得列：全小寫（`setup.service.ts` 建的使用者、回填後的鍵）
 * 與 EIP-55 checksum（viem 對合約回傳一律如此）。`isAddress` 的 strict 預設
 * 恰好只放行這兩種 —— 亂大小寫進不了資料庫。
 *
 * 撈出來的是**超集**，判定要另外用 `isSameAddress` 收斂 ——
 * 與 email 那一半同樣的分工（canonical 走索引、精確比對收斂）。
 */
export function addressLookupForms(address: string): string[] {
  const lower = canonicalizeAddressForKey(address);
  if (!lower) return [];
  // Info: (20260826 - Julian) 不是合法位址就別餵給 getAddress（它會拋）
  if (!isAddress(lower)) return [lower];

  const checksum = getAddress(lower);
  return checksum === lower ? [lower] : [lower, checksum];
}
