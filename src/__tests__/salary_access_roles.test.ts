import { describe, it, expect } from "@jest/globals";
import { TeamRole } from "@/constants/team";
import {
  isSalaryAccessAllowed,
  SalaryAccess,
  SALARY_ACCESS_ROLES,
} from "@/constants/salary_access";

/**
 * Info: (20260901 - Julian) 薪資模組的角色矩陣。
 *
 * ## 這一支擋的是什麼
 *
 * 原本八支薪資端點只掛 `assertAccountBookMember`，而它只驗「帳本存在 + 是團隊成員」
 * —— `OWNER / EDITOR / VIEWER` 一視同仁。任何被邀請進團隊當 `VIEWER` 的帳號
 * （外部顧問、實習生、暫時協助對帳的人）登入後就能讀到每一位員工的本薪與伙食費、
 * 每一筆薪資紀錄的完整快照，並且新增／修改／軟刪除員工、儲存、覆寫、**硬刪除**紀錄。
 *
 * 判準寫成表而不是散在八支 route 的 `if`：`role !== "OWNER" && role !== "EDITOR"`
 * 抄八次就是八次拼錯的機會，而拼錯的方向是放寬（checklist §4.3）。
 *
 * ## 為什麼是純函式測試而不是打 route
 *
 * 「這道閘有沒有接上去」由 `salary_route_wiring.test.ts` 守（它真的 import handler、
 * 斷言每一支要求的層級）。這一支守的是**另一半**：閘接上去之後，那張表本身答得對不對。
 * 兩者缺一：只有前者的話，把 `VIEWER` 加進寫入清單不會紅；
 * 只有後者的話，忘了 `await` 或漏掛閘不會紅。
 */

const ALL_ROLES = Object.values(TeamRole);

describe("薪資模組的角色矩陣", () => {
  it("三個角色都可以讀（讀取範圍維持現狀，見計劃書 §13 待拍板）", () => {
    for (const role of ALL_ROLES) {
      expect(isSalaryAccessAllowed(role, SalaryAccess.READ)).toBe(true);
    }
  });

  it("VIEWER 不能寫 —— 這是這次要修掉的缺陷本身", () => {
    expect(isSalaryAccessAllowed(TeamRole.VIEWER, SalaryAccess.WRITE)).toBe(
      false,
    );
  });

  /**
   * Info: (20260901 - Julian) EDITOR 必須寫得了。
   *
   * 這個模組的使用者是老闆、會計、記帳士，而被邀請進來記帳的會計通常是
   * `EDITOR` 不是 `OWNER`。把寫入收到 `OWNER` 一人會把模組原本要服務的人
   * 擋在門外 —— 這一條就是那個過度收緊的護欄。
   */
  it("OWNER 與 EDITOR 可以寫", () => {
    expect(isSalaryAccessAllowed(TeamRole.OWNER, SalaryAccess.WRITE)).toBe(
      true,
    );
    expect(isSalaryAccessAllowed(TeamRole.EDITOR, SalaryAccess.WRITE)).toBe(
      true,
    );
  });

  /**
   * Info: (20260901 - Julian) 表外的一律擋，不是一律放行。
   *
   * `role` 來自 DB 而不是型別系統：schema 的 `TeamRole` 仍留著已停用的 `ADMIN`
   * （20260819 產品決策取消，既有成員由 `scripts/backfill_remove_team_admin.ts`
   * 降為 `EDITOR`），而 `getTeamMember` 回傳的是那一列的原值。
   * 殘留的 `ADMIN`、空字串、`null`、`undefined` 都必須落到「不准」那一邊。
   */
  it.each([
    ["ADMIN（已停用，可能還有殘列）", "ADMIN"],
    ["空字串", ""],
    ["小寫的 owner", "owner"],
    ["null", null],
    ["undefined", undefined],
  ])("表外的角色（%s）讀寫都不准", (_label, role) => {
    expect(isSalaryAccessAllowed(role, SalaryAccess.READ)).toBe(false);
    expect(isSalaryAccessAllowed(role, SalaryAccess.WRITE)).toBe(false);
  });

  /**
   * Info: (20260901 - Julian) 寫入必須是讀取的子集。
   *
   * 「寫得了卻讀不到」是沒有意義的狀態，而它不會有任何症狀 ——
   * 使用者存得進去、下一秒列表就看不到自己剛存的東西。
   * 這一條讓兩張清單不可能各自漂移。
   */
  it("寫入的角色集合是讀取的子集", () => {
    for (const role of SALARY_ACCESS_ROLES[SalaryAccess.WRITE]) {
      expect(SALARY_ACCESS_ROLES[SalaryAccess.READ]).toContain(role);
    }
  });

  // Info: (20260901 - Julian) 兩張清單都不得為空，否則上面幾條會在測「沒有東西」
  it("兩張清單都不是空的", () => {
    expect(SALARY_ACCESS_ROLES[SalaryAccess.READ].length).toBeGreaterThan(0);
    expect(SALARY_ACCESS_ROLES[SalaryAccess.WRITE].length).toBeGreaterThan(0);
  });
});
