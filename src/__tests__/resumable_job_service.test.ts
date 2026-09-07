import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;

import {
  canResumeNow,
  releasePaymentBlockedJobs,
  saveJobBookmark,
  scanResumableJobs,
  startJobResume,
} from "@/services/resumable_job.service";
import { resumableJobRepo } from "@/repositories/resumable_job.repo";
import { teamQuotaUsageRepo } from "@/repositories/team_quota_usage.repo";
import { teamSubscriptionRepo } from "@/repositories/team_subscription.repo";
import { subscriptionPlanQuotaRepo } from "@/repositories/subscription_plan_quota.repo";
import {
  JOB_PAUSE_REASON,
  JOB_SPEND_MODE,
  JOB_STATUS,
  JOB_TYPE,
} from "@/constants/resumable_job";
import {
  TEAM_PLAN,
  TEAM_SUBSCRIPTION_STATUS,
} from "@/constants/subscription_quota";

/**
 * Info: (20260825 - Luphia) 可中斷任務的 Service（issue #6712 / #6714）。
 *
 * 兩件事必須是對的，而它們錯的時候都不會噴錯：
 *
 * 1. **狀態由事實推導**：有暫停原因就是 PAUSED、沒有剩餘步驟就是 COMPLETED。
 *    讓呼叫端傳狀態的話，「PAUSED 但沒有原因」「COMPLETED 但還有剩」這種
 *    自相矛盾的組合寫得進資料庫，而畫面會照著那個矛盾說話。
 * 2. **「現在夠不夠」與扣款端同一個判準**：分岔的那天，畫面會很有說服力地說
 *    「可以繼續了」，而使用者按下去又撞一次牆。
 */

jest.mock("@/repositories/resumable_job.repo", () => ({
  resumableJobRepo: {
    upsert: jest.fn(),
    findById: jest.fn(),
    findByResource: jest.fn(),
    listOpenByUser: jest.fn(async () => []),
    listPausedForScan: jest.fn(async () => []),
    // Info: (20260828 - Julian) 個人付款那條路用的（`releasePaymentBlockedJobs`）
    listPaymentBlockedByResource: jest.fn(async () => []),
    markResumable: jest.fn(async () => true),
    setStatus: jest.fn(async () => undefined),
  },
}));

jest.mock("@/repositories/team_quota_usage.repo", () => ({
  teamQuotaUsageRepo: {
    sumWindowUsage: jest.fn(async () => ({
      used5h: BigInt(0),
      usedWeek: BigInt(0),
    })),
    sumTeamWindowUsage: jest.fn(async () => ({
      used5h: BigInt(0),
      usedWeek: BigInt(0),
    })),
  },
}));

jest.mock("@/repositories/team_subscription.repo", () => ({
  teamSubscriptionRepo: { getByTeamId: jest.fn(async () => null) },
}));

jest.mock("@/repositories/subscription_plan_quota.repo", () => ({
  subscriptionPlanQuotaRepo: {
    resolveQuota: jest.fn(async () => ({ per5h: 100, perWeek: 500 })),
  },
}));

jest.mock("@/lib/utils/logger", () => ({
  logger: {
    child: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

// Info: (20260825 - Luphia) 額度視窗函式要求 epoch 秒 >= 2026-01-04（見 lib/quota/window）
const NOW_MS = 1_787_000_000_000;
const NOW_SEC = Math.floor(NOW_MS / 1000);

function jobRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "job-1",
    userId: "user-1",
    teamId: "team-1",
    type: JOB_TYPE.CARBON_REPORT_IMPORT,
    status: JOB_STATUS.PAUSED,
    resourceKey: "channel-1",
    pauseReason: JOB_PAUSE_REASON.CREDITS_EXHAUSTED,
    pausedAt: new Date(NOW_MS - 60_000),
    totalSteps: 11,
    completedSteps: 4,
    failedSteps: 0,
    remainingStepIds: ["ch5", "ch6"],
    nextStepCost: "50",
    lastError: null,
    createdAt: new Date(NOW_MS),
    updatedAt: new Date(NOW_MS),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  asMock(resumableJobRepo.upsert).mockImplementation(
    async (input: unknown) => ({
      ...jobRow(),
      ...(input as Record<string, unknown>),
    }),
  );
  asMock(resumableJobRepo.findById).mockResolvedValue(jobRow());
  asMock(resumableJobRepo.listPausedForScan).mockResolvedValue([]);
  asMock(resumableJobRepo.markResumable).mockResolvedValue(true);
  asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue(null);
  asMock(subscriptionPlanQuotaRepo.resolveQuota).mockResolvedValue({
    per5h: 100,
    perWeek: 500,
  });
  asMock(teamQuotaUsageRepo.sumWindowUsage).mockResolvedValue({
    used5h: BigInt(0),
    usedWeek: BigInt(0),
  });
  asMock(teamQuotaUsageRepo.sumTeamWindowUsage).mockResolvedValue({
    used5h: BigInt(0),
    usedWeek: BigInt(0),
  });
});

describe("書籤的狀態由事實推導", () => {
  const base = {
    userId: "user-1",
    teamId: "team-1",
    type: JOB_TYPE.CARBON_REPORT_IMPORT,
    resourceKey: "channel-1",
    totalSteps: 11,
    completedSteps: 4,
    failedSteps: 0,
    nextStepCost: "50",
    lastError: null,
    nowMs: NOW_MS,
  };

  it("有暫停原因 → PAUSED", async () => {
    const view = await saveJobBookmark({
      ...base,
      pauseReason: JOB_PAUSE_REASON.CREDITS_EXHAUSTED,
      remainingStepIds: ["ch5", "ch6"],
    });

    expect(view.status).toBe(JOB_STATUS.PAUSED);
    expect(asMock(resumableJobRepo.upsert).mock.calls[0][0]).toMatchObject({
      status: JOB_STATUS.PAUSED,
    });
  });

  it("沒有剩餘步驟 → COMPLETED", async () => {
    const view = await saveJobBookmark({
      ...base,
      pauseReason: null,
      remainingStepIds: [],
    });

    expect(view.status).toBe(JOB_STATUS.COMPLETED);
  });

  /**
   * Info: (20260825 - Luphia) 「還有剩、但沒有暫停原因」＝還在跑。
   * 這一條與上面兩條合起來就是全部的組合——呼叫端沒有機會傳一個矛盾的狀態。
   */
  it("還有剩且沒有暫停原因 → RUNNING", async () => {
    const view = await saveJobBookmark({
      ...base,
      pauseReason: null,
      remainingStepIds: ["ch5"],
    });

    expect(view.status).toBe(JOB_STATUS.RUNNING);
  });

  // Info: (20260825 - Luphia) 錯誤摘要截斷：鏈上／LLM 的錯誤動輒一整包，整包存進去對診斷沒有幫助
  it("錯誤摘要截斷到 500 字", async () => {
    await saveJobBookmark({
      ...base,
      pauseReason: null,
      remainingStepIds: ["ch5"],
      lastError: "x".repeat(900),
    });

    const arg = asMock(resumableJobRepo.upsert).mock.calls[0][0] as {
      lastError: string;
    };
    expect(arg.lastError).toHaveLength(500);
  });
});

describe("現在夠不夠（與扣款端同判準）", () => {
  it("額度足夠 → 可以繼續", async () => {
    await expect(
      canResumeNow({
        teamId: "team-1",
        userId: "user-1",
        cost: BigInt(50),
        // Info: (20260826 - Luphia) 足額模式（固定價格功能的語意）
        allowPartial: false,
        nowSec: NOW_SEC,
      }),
    ).resolves.toBe(true);
  });

  /**
   * Info: (20260825 - Luphia) 判準是**足額**（固定價格的嚴格側）：
   * 剩 30 點而下一步要 50 點，答案是「還不夠」。回 true 的代價是
   * 使用者按下去又撞一次牆——那正是這整套機制要消滅的體驗。
   */
  it("額度不足（有一些但不足額）→ 還不夠", async () => {
    /**
     * Info: (20260825 - Luphia) 預設沒有訂閱列＝免費版，而免費版讀的是**全隊**用量
     *（檢查表 §1.8：mock 要照實模擬被 mock 的東西——設錯那一支的話，
     * 這條測試會綠在一個沒有被執行到的分支上）。
     */
    asMock(teamQuotaUsageRepo.sumTeamWindowUsage).mockResolvedValue({
      used5h: BigInt(70),
      usedWeek: BigInt(70),
    });

    await expect(
      canResumeNow({
        teamId: "team-1",
        userId: "user-1",
        cost: BigInt(50),
        // Info: (20260826 - Luphia) 足額模式（固定價格功能的語意）
        allowPartial: false,
        nowSec: NOW_SEC,
      }),
    ).resolves.toBe(false);
  });

  // Info: (20260825 - Luphia) 兩個視窗同時生效：週額度見底時 5 小時額度再多也不行
  it("週額度見底 → 還不夠", async () => {
    asMock(teamQuotaUsageRepo.sumTeamWindowUsage).mockResolvedValue({
      used5h: BigInt(0),
      usedWeek: BigInt(500),
    });

    await expect(
      canResumeNow({
        teamId: "team-1",
        userId: "user-1",
        cost: BigInt(50),
        // Info: (20260826 - Luphia) 足額模式（固定價格功能的語意）
        allowPartial: false,
        nowSec: NOW_SEC,
      }),
    ).resolves.toBe(false);
  });

  /**
   * Info: (20260825 - Luphia) 免費方案的額度是**全隊共用一份**，付費方案一人一池
   *（與 `spendCredits` 同一個判準）。聚合範圍錯了，答案就錯了——
   * 而那個錯會讓「可以繼續」對免費團隊過度樂觀。
   */
  it("免費方案讀全隊用量，付費方案讀個人用量", async () => {
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue(null);
    await canResumeNow({
      teamId: "team-1",
      userId: "user-1",
      cost: BigInt(1),
      // Info: (20260826 - Luphia) 足額模式（固定價格功能的語意）
      allowPartial: false,
      nowSec: NOW_SEC,
    });
    expect(asMock(teamQuotaUsageRepo.sumTeamWindowUsage)).toHaveBeenCalled();
    expect(asMock(teamQuotaUsageRepo.sumWindowUsage)).not.toHaveBeenCalled();

    jest.clearAllMocks();
    asMock(teamSubscriptionRepo.getByTeamId).mockResolvedValue({
      planId: TEAM_PLAN.TEAM,
      status: TEAM_SUBSCRIPTION_STATUS.ACTIVE,
      currentPeriodEnd: new Date((NOW_SEC + 86_400) * 1000),
    });
    asMock(subscriptionPlanQuotaRepo.resolveQuota).mockResolvedValue({
      per5h: 100,
      perWeek: 500,
    });
    asMock(teamQuotaUsageRepo.sumWindowUsage).mockResolvedValue({
      used5h: BigInt(0),
      usedWeek: BigInt(0),
    });
    await canResumeNow({
      teamId: "team-1",
      userId: "user-1",
      cost: BigInt(1),
      // Info: (20260826 - Luphia) 足額模式（固定價格功能的語意）
      allowPartial: false,
      nowSec: NOW_SEC,
    });
    expect(asMock(teamQuotaUsageRepo.sumWindowUsage)).toHaveBeenCalled();
    expect(
      asMock(teamQuotaUsageRepo.sumTeamWindowUsage),
    ).not.toHaveBeenCalled();
  });

  // Info: (20260825 - Luphia) 成本為 0 或負數是髒資料：不放行，也不當成「免費可跑」
  it("成本非正數 → 不放行", async () => {
    await expect(
      canResumeNow({
        teamId: "team-1",
        userId: "user-1",
        cost: BigInt(0),
        // Info: (20260826 - Luphia) 足額模式（固定價格功能的語意）
        allowPartial: false,
        nowSec: NOW_SEC,
      }),
    ).resolves.toBe(false);
  });
});

/**
 * Info: (20260826 - Luphia) 判準必須與該功能**實際的扣點模式**一致
 *（review #6717 二輪第 3 條）。
 *
 * 這一組守的是一個把整套機制變成裝飾品的錯：掃描行程原本一律用「額度足額」，
 * 而匯入實際是封頂放行。落差不是保守，是**永不觸發**——實測一份 2MB 的 PDF
 * 單次預扣估算 677 點，而免費視窗上限 10 點、團隊 100 點
 *（`resolveQuotaAvailable` 取兩個視窗的較小值），永遠不可能足額。
 */
describe("判準跟著扣點模式（否則永不觸發）", () => {
  // Info: (20260826 - Luphia) 這就是那個數量級：估算遠大於任何視窗上限
  const IMPORT_HOLD = BigInt(677);

  it("封頂放行的功能：只要還有一點可用量就算可以繼續", async () => {
    asMock(teamQuotaUsageRepo.sumTeamWindowUsage).mockResolvedValue({
      used5h: BigInt(9),
      usedWeek: BigInt(9),
    });

    await expect(
      canResumeNow({
        teamId: "team-1",
        userId: "user-1",
        cost: IMPORT_HOLD,
        allowPartial: true,
        nowSec: NOW_SEC,
      }),
    ).resolves.toBe(true);
  });

  /**
   * Info: (20260826 - Luphia) 同一組數字用足額判準會回 false——這一條把
   * 「兩個判準會給出相反答案」釘住。免費方案的視窗是 10 點，
   * 而匯入一份要 677：足額模式下那個任務永遠等不到翻面。
   */
  it("同一組數字在足額模式下會回 false（這就是先前永不觸發的原因）", async () => {
    asMock(teamQuotaUsageRepo.sumTeamWindowUsage).mockResolvedValue({
      used5h: BigInt(9),
      usedWeek: BigInt(9),
    });

    await expect(
      canResumeNow({
        teamId: "team-1",
        userId: "user-1",
        cost: IMPORT_HOLD,
        allowPartial: false,
        nowSec: NOW_SEC,
      }),
    ).resolves.toBe(false);
  });

  // Info: (20260826 - Luphia) 封頂放行也要真的見底才擋：一點都不剩就是不行
  it("封頂放行但額度完全見底 → 還不夠", async () => {
    asMock(teamQuotaUsageRepo.sumTeamWindowUsage).mockResolvedValue({
      used5h: BigInt(100),
      usedWeek: BigInt(500),
    });

    await expect(
      canResumeNow({
        teamId: "team-1",
        userId: "user-1",
        cost: IMPORT_HOLD,
        allowPartial: true,
        nowSec: NOW_SEC,
      }),
    ).resolves.toBe(false);
  });

  /**
   * Info: (20260826 - Luphia) 匯入登記的就是封頂放行——這一條擋住
   * 「把它改成足額」那種回歸（那會讓招牌功能重新變成 no-op）。
   */
  it("匯入登記為封頂放行", () => {
    expect(JOB_SPEND_MODE[JOB_TYPE.CARBON_REPORT_IMPORT]).toEqual({
      allowPartial: true,
    });
  });

  /**
   * Info: (20260826 - Luphia) 封頂放行的任務**不需要**成本估算就判斷得出來。
   * 先前一律要求 `nextStepCost`，而那個欄位在常態路徑上曾經是 null——
   * 兩個問題疊起來就是永遠不翻面。
   */
  it("封頂放行的任務缺成本估算時仍然評估得出來", async () => {
    asMock(resumableJobRepo.listPausedForScan).mockResolvedValue([
      jobRow({ nextStepCost: null }),
    ]);
    asMock(teamQuotaUsageRepo.sumTeamWindowUsage).mockResolvedValue({
      used5h: BigInt(0),
      usedWeek: BigInt(0),
    });

    const summary = await scanResumableJobs(NOW_MS);

    expect(summary.released).toBe(1);
    expect(summary.unknown).toBe(0);
  });
});

describe("掃描：把暫停中且現在夠了的翻成可以繼續", () => {
  it("額度回來了 → 翻面", async () => {
    asMock(resumableJobRepo.listPausedForScan).mockResolvedValue([jobRow()]);

    const summary = await scanResumableJobs(NOW_MS);

    expect(summary.released).toBe(1);
    expect(asMock(resumableJobRepo.markResumable)).toHaveBeenCalledWith(
      "job-1",
    );
  });

  it("還是不夠 → 不翻面，下一輪再看", async () => {
    asMock(resumableJobRepo.listPausedForScan).mockResolvedValue([jobRow()]);
    asMock(teamQuotaUsageRepo.sumTeamWindowUsage).mockResolvedValue({
      used5h: BigInt(100),
      usedWeek: BigInt(100),
    });

    const summary = await scanResumableJobs(NOW_MS);

    expect(summary.stillShort).toBe(1);
    expect(asMock(resumableJobRepo.markResumable)).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260825 - Luphia) 需要個人付款的暫停**不由額度決定**：
   * 它要的是一筆簽章付款，而那件事只有使用者本人做得到。
   * 翻成「可以繼續」會是一個假承諾——按下去仍然需要付款。
   */
  it("需要個人付款的暫停不翻面", async () => {
    asMock(resumableJobRepo.listPausedForScan).mockResolvedValue([
      jobRow({ pauseReason: JOB_PAUSE_REASON.PAYMENT_REQUIRED }),
    ]);

    const summary = await scanResumableJobs(NOW_MS);

    expect(summary.released).toBe(0);
    expect(summary.unknown).toBe(1);
    expect(asMock(resumableJobRepo.markResumable)).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260825 - Luphia) 缺件要**數得出來**，不靜默跳過：那些任務會永遠
   * 停在暫停中，而沒有人知道有幾筆。
   *
   * Info: (20260826 - Luphia) 「缺成本估算」已不再是缺件（review #6717 二輪第 3 條）：
   * 封頂放行的功能只要還有一點可用量就跑得動，不需要知道要多少。
   * 真正的缺件只剩「沒有付費團隊」與「認不出的任務型別」——前者無從判斷額度，
   * 後者連扣點模式都不知道。
   */
  it("缺付費團隊或認不出型別 → 計入 unknown，不猜", async () => {
    asMock(resumableJobRepo.listPausedForScan).mockResolvedValue([
      jobRow({ id: "job-a", teamId: null }),
      jobRow({ id: "job-b", type: "SOMETHING_NEW" }),
    ]);

    const summary = await scanResumableJobs(NOW_MS);

    expect(summary.unknown).toBe(2);
    expect(asMock(resumableJobRepo.markResumable)).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260825 - Luphia) 翻面用條件更新：使用者可能在讀取之後、寫入之前
   * 按了「繼續」（列已是 RUNNING）或取消了任務。Repo 回 false 時要計入 unknown，
   * 不能當成成功——否則摘要會說「放行了 N 筆」而其中有些根本沒動。
   */
  it("翻面時列已被別人改動 → 不算成功", async () => {
    asMock(resumableJobRepo.listPausedForScan).mockResolvedValue([jobRow()]);
    asMock(resumableJobRepo.markResumable).mockResolvedValue(false);

    const summary = await scanResumableJobs(NOW_MS);

    expect(summary.released).toBe(0);
    expect(summary.unknown).toBe(1);
  });

  // Info: (20260825 - Luphia) 一筆出錯不影響其他筆：整輪掃描不該被一個壞資料停掉
  it("單筆判斷失敗時繼續處理其他筆", async () => {
    asMock(resumableJobRepo.listPausedForScan).mockResolvedValue([
      jobRow({ id: "job-a" }),
      jobRow({ id: "job-b" }),
    ]);
    asMock(subscriptionPlanQuotaRepo.resolveQuota)
      .mockRejectedValueOnce(new Error("db down"))
      .mockResolvedValue({ per5h: 100, perWeek: 500 });

    const summary = await scanResumableJobs(NOW_MS);

    expect(summary.scanned).toBe(2);
    expect(summary.unknown).toBe(1);
    expect(summary.released).toBe(1);
  });
});

describe("接續與擁有權", () => {
  it("接續把狀態翻成 RUNNING 並清掉暫停原因", async () => {
    const view = await startJobResume({ jobId: "job-1", userId: "user-1" });

    expect(asMock(resumableJobRepo.setStatus)).toHaveBeenCalledWith(
      "job-1",
      JOB_STATUS.RUNNING,
      null,
    );
    expect(view.status).toBe(JOB_STATUS.RUNNING);
    expect(view.pauseReason).toBeNull();
    expect(view.remainingStepIds).toEqual(["ch5", "ch6"]);
  });

  /**
   * Info: (20260825 - Luphia) 別人的任務與不存在的任務回**同一個**錯誤：
   * 分得出來就能用它去列舉別人的任務 id。
   */
  it("別人的任務不能接續", async () => {
    asMock(resumableJobRepo.findById).mockResolvedValue(
      jobRow({ userId: "someone-else" }),
    );

    await expect(
      startJobResume({ jobId: "job-1", userId: "user-1" }),
    ).rejects.toMatchObject({ code: "TW000030" });
    expect(asMock(resumableJobRepo.setStatus)).not.toHaveBeenCalled();
  });

  it("查不到的任務回同一個錯誤", async () => {
    asMock(resumableJobRepo.findById).mockResolvedValue(null);

    await expect(
      startJobResume({ jobId: "job-x", userId: "user-1" }),
    ).rejects.toMatchObject({ code: "TW000030" });
  });

  it("已完成的任務沒有東西可以接續", async () => {
    asMock(resumableJobRepo.findById).mockResolvedValue(
      jobRow({ status: JOB_STATUS.COMPLETED, remainingStepIds: [] }),
    );

    await expect(
      startJobResume({ jobId: "job-1", userId: "user-1" }),
    ).rejects.toMatchObject({ code: "TW000031" });
  });
});

/**
 * Info: (20260828 - Julian) 個人付款完成後釋放「等付款」的任務。
 *
 * 這條路與 `scanResumableJobs` 是兩件事：那支是 5 分鐘輪詢、跨使用者、看團隊額度；
 * 這支由 `TxTracker` 確認入帳時針對單一使用者呼叫一次。
 *
 * **這裡不發任何通知**，那是刻意的：`JOB_RESUMABLE` 是活算的待辦，
 * 翻成 `RESUMABLE` 本身就是通知（小鈴鐺下一次輪詢會從 `listResumableByUser` 讀到）。
 * 所以這一組不需要 mock notification service —— 少了那個相依才是對的。
 */
describe("releasePaymentBlockedJobs", () => {
  const blockedJob = (id: string) => ({
    id,
    userId: "user-1",
    teamId: null,
    type: JOB_TYPE.CARBON_REPORT_IMPORT,
    status: JOB_STATUS.PAUSED,
    pauseReason: JOB_PAUSE_REASON.PAYMENT_REQUIRED,
    resourceKey: `channel-${id}`,
    remainingStepIds: [],
    totalSteps: 11,
    completedSteps: 3,
    failedSteps: 0,
    nextStepCost: null,
    lastError: null,
    pausedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Info: (20260831 - Julian) 這張訂單就是為這個資源付的（review #6732 的 1-A）
  const PAID_ORDER_DATA = {
    category: "CARBON_CHAT",
    idempotencyKey: "idem-1",
    amount: "-100",
    resourceKey: "channel-job-1",
  };

  beforeEach(() => {
    asMock(resumableJobRepo.listPaymentBlockedByResource).mockResolvedValue([]);
    asMock(resumableJobRepo.markResumable).mockResolvedValue(true);
  });

  it("沒有等付款的任務時回 0，且不寫任何東西", async () => {
    const released = await releasePaymentBlockedJobs({
      userId: "user-1",
      orderData: PAID_ORDER_DATA,
    });

    expect(released).toBe(0);
    expect(asMock(resumableJobRepo.markResumable)).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260831 - Julian) 只翻**這筆付款對應的**那一份（review #6732 的 1-A）。
   *
   * 原本的條件只有 `userId`，於是「使用者付了一筆款」被當成「他所有等付款的
   * 任務都付過了」。這一條釘的是查詢真的帶著資源鍵 —— 少了它，一位使用者
   * 身上 N 筆等付款的任務會在他任何一次付款成功時全部翻面，各發一則
   * 「可以繼續了」，而其中只有一筆是真的付過的。
   */
  it("查詢帶著 userId 與這筆付款的資源鍵", async () => {
    await releasePaymentBlockedJobs({
      userId: "user-1",
      orderData: PAID_ORDER_DATA,
    });

    expect(
      asMock(resumableJobRepo.listPaymentBlockedByResource),
    ).toHaveBeenCalledWith("user-1", "channel-job-1");
  });

  /**
   * Info: (20260831 - Julian) 訂單沒有指向任何資源時**什麼都不翻**（fail-closed）。
   *
   * 走到這裡的是與可接續任務無關的個人付款（例如單則對話），
   * 以及本次改動之前建立的舊訂單。退回「翻這個人全部的」就是 1-A 本身。
   */
  it.each([
    ["沒有 resourceKey", { category: "FAITH_CHAT", idempotencyKey: "i" }],
    ["resourceKey 是空字串", { resourceKey: "" }],
    ["resourceKey 不是字串", { resourceKey: 123 }],
    ["data 是 null", null],
    ["data 不是物件", "carbon-chat-0xabc-2025"],
  ])("%s：不查也不翻，回 0", async (unusedLabel, orderData) => {
    const released = await releasePaymentBlockedJobs({
      userId: "user-1",
      orderData,
    });

    expect(released).toBe(0);
    expect(
      asMock(resumableJobRepo.listPaymentBlockedByResource),
    ).not.toHaveBeenCalled();
    expect(asMock(resumableJobRepo.markResumable)).not.toHaveBeenCalled();
  });

  it("把查到的每一筆翻成可以繼續", async () => {
    asMock(resumableJobRepo.listPaymentBlockedByResource).mockResolvedValue([
      blockedJob("job-1"),
      blockedJob("job-2"),
    ]);

    const released = await releasePaymentBlockedJobs({
      userId: "user-1",
      orderData: PAID_ORDER_DATA,
    });

    expect(released).toBe(2);
    expect(asMock(resumableJobRepo.markResumable)).toHaveBeenCalledWith(
      "job-1",
    );
    expect(asMock(resumableJobRepo.markResumable)).toHaveBeenCalledWith(
      "job-2",
    );
  });

  /**
   * Info: (20260828 - Julian) 使用者在付款與這一刻之間自己按了繼續或取消。
   *
   * `markResumable` 是帶 `status: PAUSED` 的條件更新，翻不動時回 `false` ——
   * 那一筆不該被算成釋放。少了這條，把條件更新改成無條件覆寫也會全綠，
   * 而那個改動會把一個正在跑的任務標成「等著被繼續」。
   */
  it("翻不動的（使用者已自行繼續或取消）不算進釋放數", async () => {
    asMock(resumableJobRepo.listPaymentBlockedByResource).mockResolvedValue([
      blockedJob("job-1"),
      blockedJob("job-2"),
    ]);
    asMock(resumableJobRepo.markResumable)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    expect(
      await releasePaymentBlockedJobs({
        userId: "user-1",
        orderData: PAID_ORDER_DATA,
      }),
    ).toBe(1);
  });
});
