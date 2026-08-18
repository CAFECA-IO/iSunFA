import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { prisma } from "@/lib/prisma";
import { systemSettingService } from "@/services/system_setting.service";
import { SystemSettingKey } from "@/constants/system_setting";
import { resolveFreePlanMaxMembers } from "@/services/team_subscription.service";
import { chargeSeatAddition } from "@/services/team_seat.service";
import { TeamRole } from "@/constants/team";
import { API_ERRORS } from "@/lib/utils/error_dictionary";

/**
 * Info: (20260818 - Luphia) 免費團隊真的邀請不出去（回報 20260818）。
 *
 * 這一支是**對真資料庫**跑的：`chargeSeatAddition` 的免費版分支曾經因為
 * 「新建團隊沒有 TeamSubscription 列」而被整段跳過，而所有單元測試都餵了一個
 * 假的 FREE 訂閱列，於是那條路徑無人走過。同一個形狀的漏洞不會被更多 mock 抓到，
 * 只會被「照真實資料的樣子」跑一次抓到。
 *
 * 只讀不寫：免費版分支只查人數與待接受邀請數，然後丟錯。**刻意不呼叫
 * `inviteMemberByEmail`**——SMTP 在這個環境是設定好的，若擋門失效那條路徑會
 * 真的寄出一封信給真實信箱，而測試不該有那種副作用。
 */

/**
 * Info: (20260818 - Luphia) 🛑 正式機實體隔離（第四輪 B-4，與 core_pipeline.e2e 同一道閘）。
 *
 * 這支會**真的建立與刪除** User / Team / TeamMember。`jest.config.mjs` 沒有排除
 * e2e，因此 `npm test` 會跑到它——在錯誤的環境跑就是動到真實資料。
 * 缺這道閘是本檔上一版的疏失。
 */
if (process.env.NODE_ENV === "production") {
  throw new Error(
    "🚨 [FATAL] 嚴禁在正式機 (Production) 環境執行 E2E 測試，以免污染真實團隊與席次資料！",
  );
}

const TEAM_NAME = `e2e-free-cap-${Date.now()}`;
let teamId = "";
let userId = "";

beforeAll(async () => {
  const user = await prisma.user.create({
    data: { address: `e2e_free_cap_${Date.now()}`, name: "E2E Free Owner" },
  });
  userId = user.id;

  // Info: (20260818 - Luphia) 刻意不建 TeamSubscription：這正是回報情境的樣子
  const team = await prisma.team.create({ data: { name: TEAM_NAME } });
  teamId = team.id;

  await prisma.teamMember.create({
    data: { teamId, userId, role: TeamRole.OWNER },
  });
});

afterAll(async () => {
  await prisma.teamMember.deleteMany({ where: { teamId } });
  await prisma.team.deleteMany({ where: { id: teamId } });
  await prisma.user.deleteMany({ where: { id: userId } });
  // Info: (20260818 - Luphia) 關掉連線，否則 jest 會抱怨有未結束的非同步操作
  await prisma.$disconnect();
});

describe("免費團隊的人數上限（真資料庫）", () => {
  /**
   * Info: (20260818 - Luphia) `FREE_PLAN_MAX_MEMBERS` 在 DB 裡沒有列時，
   * 生效值來自 `SYSTEM_SETTING_FALLBACKS`（＝1），而不是 undefined。
   * 保底值是程式碼常數，不是環境狀態——這是 `get()` 刻意的設計。
   */
  it("生效的上限是 1", async () => {
    const raw = await systemSettingService.get(
      SystemSettingKey.FREE_PLAN_MAX_MEMBERS,
    );
    expect(raw).toBe("1");
    expect(await resolveFreePlanMaxMembers()).toBe(1);
  });

  /**
   * Info: (20260818 - Luphia) 本檔的重點：**沒有訂閱列的團隊**在只有擁有者一人時
   * 就已經滿了，因此邀請第二個人必須被擋下（TW000017）。
   *
   * 這是邀請流程的第一步，排在建立邀請與寄信之前，所以它擋下＝信不會寄出。
   */
  it("只有擁有者的免費團隊邀請第二人時被擋下", async () => {
    await expect(
      chargeSeatAddition({ teamId, seats: 1, nowMs: Date.now() }),
    ).rejects.toMatchObject({
      code: API_ERRORS.TW_FREE_PLAN_MEMBER_LIMIT.code,
    });
  });

  // Info: (20260818 - Luphia) 擋下之後不得留下任何邀請列（擋門在建立之前）
  it("被擋下後資料庫沒有留下邀請", async () => {
    const count = await prisma.teamInvitation.count({ where: { teamId } });
    expect(count).toBe(0);
  });
});
