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
 * Info: (20260908 - Julian) 20260908 起讀取也收成 `OWNER + EDITOR`
 * （`VIEWER` 不再讀得到）。那次改動只動了 `SALARY_ACCESS_ROLES` 一個常數、
 * 沒有碰任何一支 route —— 這張表的價值就是在那一刻兌現的。
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
  /**
   * Info: (20260908 - Julian) 讀與寫都是 `OWNER + EDITOR`，擋的是 `VIEWER`。
   *
   * 這是 20260901 留下的「讀取範圍尚未拍板」的答案。當時 `VIEWER` 也讀得到，
   * 而那意味著任何被邀請進團隊的唯讀成員（外部顧問、實習生、暫時來對帳的人）
   * 看得到全公司每一位員工的本薪、實發金額與投保級距。
   */
  it("OWNER 與 EDITOR 讀得到", () => {
    expect(isSalaryAccessAllowed(TeamRole.OWNER, SalaryAccess.READ)).toBe(true);
    expect(isSalaryAccessAllowed(TeamRole.EDITOR, SalaryAccess.READ)).toBe(
      true,
    );
  });

  it("OWNER 與 EDITOR 寫得了", () => {
    expect(isSalaryAccessAllowed(TeamRole.OWNER, SalaryAccess.WRITE)).toBe(
      true,
    );
    expect(isSalaryAccessAllowed(TeamRole.EDITOR, SalaryAccess.WRITE)).toBe(
      true,
    );
  });

  /**
   * Info: (20260908 - Julian) **`VIEWER` 兩種層級都不准 —— 這是這次收掉的東西。**
   *
   * 寫入那一半是 20260901 修掉的缺陷（唯讀成員能硬刪任何一筆薪資紀錄）；
   * 讀取這一半是 20260908 才收的。兩條放在一起，是因為「唯讀成員不該碰薪資」
   * 是同一個判斷的兩面，日後要放寬也應該一起想過。
   */
  it("VIEWER 兩種層級都不准", () => {
    expect(isSalaryAccessAllowed(TeamRole.VIEWER, SalaryAccess.READ)).toBe(
      false,
    );
    expect(isSalaryAccessAllowed(TeamRole.VIEWER, SalaryAccess.WRITE)).toBe(
      false,
    );
  });

  /**
   * Info: (20260908 - Julian) 逐一走過 `TeamRole` 的每一個值，而不是手寫
   * 「VIEWER 不准」。
   *
   * 手寫清單只守得住今天存在的角色 —— 日後新增一個 `ACCOUNTANT`
   * 而忘了想清楚它該不該看薪資時，手寫版不會紅，這一條會。
   * 放寬是要出現在 diff 上的動作，不是預設值。
   */
  it("清單以外的角色一律不准", () => {
    const allowed: readonly TeamRole[] = [TeamRole.OWNER, TeamRole.EDITOR];
    const others = ALL_ROLES.filter((role) => !allowed.includes(role));

    expect(others.length).toBeGreaterThan(0);
    for (const role of others) {
      expect(isSalaryAccessAllowed(role, SalaryAccess.READ)).toBe(false);
      expect(isSalaryAccessAllowed(role, SalaryAccess.WRITE)).toBe(false);
    }
  });

  /**
   * Info: (20260908 - Julian) 兩張表今天內容一樣，但**不合併**。
   *
   * 它們回答的是兩個問題（看得到 vs 改得動）。合併成一個常數的話，
   * 日後要放寬讀取或收緊寫入都得先拆回來，而拆的時候十三支 route
   * 的分級資訊已經不見了。這一條釘住「兩個 key 都還在」。
   */
  it("READ 與 WRITE 仍是兩張獨立的表", () => {
    expect(Object.keys(SALARY_ACCESS_ROLES).sort()).toEqual([
      SalaryAccess.READ,
      SalaryAccess.WRITE,
    ]);
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
