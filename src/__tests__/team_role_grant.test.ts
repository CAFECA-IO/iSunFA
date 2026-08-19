import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";
import { canGrantRole, TeamRole } from "@/constants/team";

/**
 * Info: (20260818 - Luphia) 只有 OWNER 能授予 OWNER（第三輪 B-3）。
 *
 * 邀請端點的權限閘是 `OWNER || ADMIN`，但對「要授予什麼角色」原本毫無檢查。
 * ADMIN 送 `role: "OWNER"` 邀請自己的第二個帳號，接受之後團隊就多一位 OWNER
 * ——接著可以改任何人的角色，包含把原 OWNER 降級（此時 OWNER 有兩位，
 * 「最後一位 OWNER」的保護不會觸發）。
 *
 * 變更**既有**成員角色的端點早就有這道檢查，兩條邀請路徑漏了。
 */

describe("canGrantRole", () => {
  it("OWNER 可以授予 OWNER", () => {
    expect(canGrantRole(TeamRole.OWNER, TeamRole.OWNER)).toBe(true);
  });

  // Info: (20260818 - Luphia) 本檔最重要的一條
  it("ADMIN 不能授予 OWNER", () => {
    expect(canGrantRole(TeamRole.ADMIN, TeamRole.OWNER)).toBe(false);
  });

  it("非管理職一律不能授予 OWNER", () => {
    expect(canGrantRole(TeamRole.EDITOR, TeamRole.OWNER)).toBe(false);
    expect(canGrantRole(TeamRole.VIEWER, TeamRole.OWNER)).toBe(false);
    expect(canGrantRole(null, TeamRole.OWNER)).toBe(false);
    expect(canGrantRole(undefined, TeamRole.OWNER)).toBe(false);
  });

  /**
   * Info: (20260818 - Luphia) 其餘角色 ADMIN 授得了——這條端點本來就開放
   * OWNER / ADMIN 邀請成員，收得太緊會把正常流程一起擋掉。
   */
  it("ADMIN 可以授予其餘角色", () => {
    expect(canGrantRole(TeamRole.ADMIN, TeamRole.ADMIN)).toBe(true);
    expect(canGrantRole(TeamRole.ADMIN, TeamRole.EDITOR)).toBe(true);
    expect(canGrantRole(TeamRole.ADMIN, TeamRole.VIEWER)).toBe(true);
  });
});

/**
 * Info: (20260818 - Luphia) 兩條邀請路徑都要套用（第三輪 B-3）。
 *
 * 以原始碼比對釘住：這兩支是 route handler，行為測試要拉起整個
 * FIDO2 與 session 的替身才跑得動，而要驗的只是「這道檢查有沒有在」。
 * 漏掉任何一條，另一條的防護就形同虛設——攻擊者用沒補的那一條就好。
 */
describe("兩條邀請路徑都檢查授予權限", () => {
  const routes = [
    ["email 邀請", "invitations/email/route.ts"],
    ["位址邀請", "invitations/route.ts"],
  ] as const;

  it.each(routes)("%s 套用 canGrantRole", (_label, relative) => {
    const source = readFileSync(
      join(
        process.cwd(),
        "src",
        "app",
        "api",
        "v1",
        "user",
        "team",
        "[team_id]",
        ...relative.split("/"),
      ),
      "utf8",
    );

    expect(source).toMatch(/if \(!canGrantRole\(/);
    /**
     * Info: (20260818 - Luphia) 檢查必須發生在建立邀請之前——擺在後面
     * 等於邀請已經送出去了才發現不該送。
     *
     * 找的是守衛本身（`if (!canGrantRole(`）而不是 `canGrantRole(`，
     * 後者會先命中 import 那一行，讓順序斷言永遠成立。
     */
    const guard = source.indexOf("if (!canGrantRole(");
    // Info: (20260818 - Luphia) 同理，找的是**呼叫**而不是 import
    const charge = source.indexOf("await chargeSeatAddition(");
    const invite = source.indexOf("await inviteMemberByEmail(");
    const sideEffect = charge > -1 ? charge : invite;

    expect(guard).toBeGreaterThan(-1);
    expect(sideEffect).toBeGreaterThan(guard);
  });
});
