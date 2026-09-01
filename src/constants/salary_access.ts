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
 * Info: (20260901 - Julian) 哪些角色可以做什麼。**這是本模組唯一的角色清單。**
 *
 * ## 為什麼要有這一層
 *
 * 原本八支端點只掛 `assertAccountBookMember`，而它只驗「帳本存在 + 是團隊成員」，
 * 三個角色一視同仁。也就是說任何被邀請進團隊當 `VIEWER` 的帳號
 * （外部顧問、實習生、暫時協助對帳的人）登入後就能新增／修改／軟刪除員工、
 * 儲存、覆寫、**硬刪除**任何一筆薪資紀錄 —— 而這是本 repo 最敏感的一類資料。
 *
 * ## 為什麼寫入是 `OWNER + EDITOR` 而不是只有 `OWNER`
 *
 * 這個模組的使用者刻意不是 HR 員工檔上的人，而是帳本的**團隊成員**
 * （老闆、會計、記帳士）—— 那正是它不用 `resolveEmployee` 的理由（見上方檔頭）。
 * 被邀請進來記帳的會計通常是 `EDITOR` 不是 `OWNER`，把寫入收到 `OWNER` 一人
 * 會把這個模組原本要服務的人擋在門外。`TEAM_MANAGER_ROLES`（＝動錢、動成員的
 * 管理職，目前只有 `OWNER`）是另一個問題的答案，不是這個問題的。
 *
 * 要擋的是 `VIEWER`：唯讀成員不該寫任何薪資資料。
 *
 * ## 讀取範圍尚未拍板
 *
 * 目前讀取維持「任何團隊成員都可以」—— 與這次改動前的行為相同，不是一個新決定。
 * 「`VIEWER` 到底該不該看得到全公司的本薪與實發金額」與計劃書 §13 的
 * 薪資資料分級是同一個決策的兩面，上線前要一起拍板；屆時改的是下面這一行，
 * 不是八支 route。
 */
export const SALARY_ACCESS_ROLES: Record<SalaryAccess, readonly TeamRole[]> = {
  [SalaryAccess.READ]: [TeamRole.OWNER, TeamRole.EDITOR, TeamRole.VIEWER],
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

