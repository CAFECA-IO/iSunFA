import { describe, it, expect } from "@jest/globals";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import {
  TeamRole,
  TEAM_MANAGER_ROLES,
  isTeamManagerRole,
} from "@/constants/team";

/**
 * Info: (20260819 - Luphia) 團隊 ADMIN 已取消（產品決定 20260819）。
 *
 * 取消的理由是結構性的：ADMIN 握有「會花 OWNER 的錢」的權限卻不是持卡人——
 * 邀請成員會即時向訂閱那張卡補收席次費用，而那是 merchant-initiated 交易、
 * 沒有持卡人當下的授權。先前為此加的兩道補丁（單期補收上限、只有 OWNER 能授予
 * OWNER）都是在補同一個洞。
 *
 * 這一檔擋的是**它悄悄回來**：新的權限閘若又寫成 `role === "ADMIN"`，
 * 那個角色就等於復活了一半——判斷通過、但列舉裡沒有、UI 也選不到。
 */

// Info: (20260819 - Luphia) 平台角色（User.role = USER / ADMIN）與團隊角色同名但無關，逐一排除
const PLATFORM_ADMIN_PATHS = [
  "src/app/admin",
  "src/app/api/v1/admin",
  "src/components/admin",
  "src/services/admin.blockchain.service.ts",
  "src/services/setup.service.ts",
  "src/lib/auth/dewt.ts",
  "src/app/api/v1/auth/me/route.ts",
  "src/constants/role.ts",
  // Info: (20260819 - Luphia) HR 模組的職稱列舉，與團隊角色無關
  "src/constants/hr",
  /**
   * Info: (20260819 - Luphia) 這裡的 `user.role` 是**平台**角色
   * （`user.isAdmin || user.role === "SUPER_ADMIN" || user.role === "ADMIN"`），
   * 決定的是後台模組的可見性，與團隊成員的角色無關。
   */
  "src/components/header/user_actions.tsx",
];

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "generated" || entry.name === "__tests__") return [];
      return listSourceFiles(full);
    }
    return entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")
      ? [full]
      : [];
  });
}

describe("團隊 ADMIN 角色已移除", () => {
  it("列舉裡沒有 ADMIN", () => {
    expect(Object.values(TeamRole)).toEqual(["OWNER", "EDITOR", "VIEWER"]);
  });

  // Info: (20260819 - Luphia) 管理職只剩 OWNER；殘留的字串不得被認成管理職
  it("管理職只有 OWNER，殘留的 ADMIN 字串不算", () => {
    expect(TEAM_MANAGER_ROLES).toEqual([TeamRole.OWNER]);
    expect(isTeamManagerRole("OWNER")).toBe(true);
    expect(isTeamManagerRole("ADMIN")).toBe(false);
    expect(isTeamManagerRole("EDITOR")).toBe(false);
    expect(isTeamManagerRole(null)).toBe(false);
  });

  /**
   * Info: (20260819 - Luphia) 掃描根是整個 `src`（checklist §1.1：掃描型測試的
   * 價值等於它的掃描根）。平台角色的路徑明列在 `PLATFORM_ADMIN_PATHS`，
   * 那份清單只能變短——新增一處團隊角色的 ADMIN 判斷就會紅。
   */
  it("src 內沒有殘留的團隊 ADMIN 判斷", () => {
    const root = process.cwd();
    const offenders = listSourceFiles(join(root, "src"))
      .map((file) => file.slice(root.length + 1))
      .filter(
        (relative) =>
          !PLATFORM_ADMIN_PATHS.some((allowed) => relative.startsWith(allowed)),
      )
      .filter((relative) => {
        const code = readFileSync(join(root, relative), "utf8")
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => !line.startsWith("*") && !line.startsWith("//"))
          .join("\n");
        /**
         * Info: (20260819 - Luphia) 比對**字面量本身**，不是某一種比較寫法。
         *
         * 第一版寫的是 `role === "ADMIN"`，於是把閘改回
         * `operator.role !== "ADMIN"`（不等於）時掃描照樣是綠的——
         * 那條 mutation 我實跑過，3 passed。判準要能區分「缺陷發生了沒有」，
         * 而不是「我想到的那一種寫法有沒有出現」（checklist §1.9）。
         */
        return /TeamRole\.ADMIN|"ADMIN"/.test(code);
      });

    expect(offenders).toEqual([]);
  });
});
