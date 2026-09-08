import { TeamRole } from "@/constants/team";

/**
 * Info: (20260901 - Julian) 薪資端點要求的存取層級。
 *
 * 讀（看名單、看紀錄、看薪資單）與寫（員工 CRUD、儲存、刪除紀錄）
 * 是兩個不同的問題，先前八支端點掛的是同一道只問「是不是成員」的閘。
 */
export enum SalaryAccess {
  READ = "READ",
  WRITE = "WRITE",
}

/**
 * Info: (20260908 - Julian) 哪些角色可以做什麼。**這是本模組唯一的角色清單。**
 *
 * ## 現況：讀與寫都是 `OWNER + EDITOR`，擋的是 `VIEWER`（20260908 產品決策）
 *
 * 帳本版薪資計算機的每一支端點 —— 看員工名單、看薪資紀錄、看薪資單、
 * 員工 CRUD、儲存／刪除紀錄、匯出 CSV、寄薪資單 —— 開給 `OWNER` 與 `EDITOR`，
 * `VIEWER` 一律 403。
 *
 * 這是 20260901 留下的「讀取範圍尚未拍板」的答案。當時的註解寫著
 * 「屆時改的是下面這一行，不是八支 route」—— 而這次確實只改了這兩行。
 * 判準集中成一張表的價值就在這裡：調整權限是改一個常數，
 * 不是去十三支 route 逐一確認有沒有漏掉。
 *
 * ## 相對 20260901 真正變動的只有一件事：`VIEWER` 不再讀得到
 *
 * 20260901 的狀態是 `READ` 開給三個角色、`WRITE` 開給 `OWNER + EDITOR`。
 * 也就是說任何被邀請進團隊當 `VIEWER` 的帳號（外部顧問、實習生、
 * 暫時協助對帳的人）看得到全公司每一位員工的本薪、實發金額與投保級距。
 * 那是這次要收掉的東西。
 *
 * ## 為什麼不是只給 `OWNER`
 *
 * 曾經考慮過收到 `OWNER` 一人，理由是薪資是本 repo 最敏感的一類資料。
 * 沒有這麼做，是因為**這個模組的使用者本來就不只有老闆**：它刻意不用
 * `resolveEmployee`、服務的是帳本的團隊成員（老闆、會計、記帳士），
 * 而被邀請進來記帳的會計通常是 `EDITOR` 不是 `OWNER`。收到一人會把
 * 模組原本要服務的人擋在門外，而換來的安全性有限 —— `EDITOR` 本來就
 * 動得了這本帳的傳票與憑證，薪資不是它唯一碰得到的敏感資料。
 *
 * `TEAM_MANAGER_ROLES`（＝動錢、動成員的管理職，目前只有 `OWNER`）
 * 是另一個問題的答案，不是這個問題的。
 *
 * ## 為什麼兩個層級的清單一樣，卻不合併成一個
 *
 * `READ` 與 `WRITE` 今天恰好都是 `[OWNER, EDITOR]`，但它們回答的是兩個問題
 * （看得到 vs 改得動）。合併成一個常數的話，日後要把讀取放寬、
 * 或把寫入再收緊，就得先把它拆回來 —— 而拆的時候十三支 route 的分級資訊
 * 已經不見了。保持兩張表，調整時只動其中一張。
 *
 * ## 副作用：`access` 參數有沒有被用到，行為上看不出來
 *
 * 兩張表內容相同時，沒有任何角色能讓兩個層級給出不同答案 ——
 * 於是「把層級寫死成 `READ`」這個缺陷在行為上是隱形的。
 * 那道護欄改由 `salary_access_guard.test.ts` 直接斷言
 * 「交給角色表的是傳進來的那個 `access`」，見該檔。
 */
export const SALARY_ACCESS_ROLES: Record<SalaryAccess, readonly TeamRole[]> = {
  [SalaryAccess.READ]: [TeamRole.OWNER, TeamRole.EDITOR],
  [SalaryAccess.WRITE]: [TeamRole.OWNER, TeamRole.EDITOR],
};

/**
 * Info: (20260901 - Julian) 角色判定抽成純函式，好讓它有判準。
 *
 * 留在 `assertSalaryAccountBookAccess` 裡的話，要驗它就得連 `accountBookRepo`
 * 與 `teamRepo` 一起替身化 —— 那時候測到的是替身的形狀，不是這張表
 * （checklist §1.8）。放在 `constants` 而不是 `services` 也是同一個理由：
 * 這個檔案不 import 任何 repository，測試與 route 都能直接匯入它而不會拖起 Prisma。
 *
 * `role` 收 `string` 是因為它來自 DB：
 * schema 的 `TeamRole` 仍留著已停用的 `ADMIN`（20260819 產品決策取消，
 * 既有成員由 `scripts/backfill_remove_team_admin.ts` 降為 `EDITOR`），
 * 萬一還有殘留的 `ADMIN` 列，它不在任何一張清單裡 —— 一律擋下，
 * 而不是靠型別假裝它不存在。
 */
export function isSalaryAccessAllowed(
  role: string | null | undefined,
  access: SalaryAccess,
): boolean {
  return SALARY_ACCESS_ROLES[access].includes(role as TeamRole);
}
