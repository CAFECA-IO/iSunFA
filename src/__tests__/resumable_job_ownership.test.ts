import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { readFileSync } from "fs";
import { join } from "path";

import { saveJobBookmarkForChannel } from "@/services/resumable_job.service";
import {
  ResumableJobOwnershipError,
  resumableJobRepo,
} from "@/repositories/resumable_job.repo";
import { chatroomRepo } from "@/repositories/chatroom.repo";
import { JOB_TYPE } from "@/constants/resumable_job";
import { buildCarbonChatChannel } from "@/constants/carbon_chatbot";

/**
 * Info: (20260826 - Luphia) 書籤的資源所有權（review #6717 二輪阻擋-1）。
 *
 * 碳盤查的 `resourceKey` 是**可推導的**頻道：`carbon-chat-{錢包位址}-{sessionId}`，
 * 位址是鏈上公開資訊、預設 sessionId 是常數。而書籤的唯一鍵是
 * `(resourceKey, type)`（不含 userId），`update` 又會改寫 `userId`——
 * 少了裁決，任何登入者都能把別人的接續書籤覆寫掉、連歸屬一起改成自己。
 *
 * 兩道防線各測一次，因為它們回答的是兩件不同的事：
 * 「這個頻道是不是你的」與「這一列任務是不是你的」。
 */

jest.mock("@/repositories/resumable_job.repo", () => {
  class OwnershipError extends Error {}
  return {
    ResumableJobOwnershipError: OwnershipError,
    resumableJobRepo: { upsert: jest.fn() },
  };
});

jest.mock("@/repositories/chatroom.repo", () => ({
  chatroomRepo: { findAccountBookIdByChannel: jest.fn(async () => null) },
}));

jest.mock("@/repositories/faith_billing_setting.repo", () => ({
  faithBillingSettingRepo: { resolveSetting: jest.fn() },
}));

jest.mock("@/services/carbon_billing.service", () => ({
  resolveBillingTeamId: jest.fn(async () => "team-1"),
}));

jest.mock("@/lib/utils/logger", () => ({
  logger: {
    child: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }),
  },
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

const OWNER_ADDRESS = "0xaaaa000000000000000000000000000000000001";
const OTHER_ADDRESS = "0xbbbb000000000000000000000000000000000002";
const NOW_MS = 1_787_000_000_000;

function bookmarkFor(address: string, actorAddress: string | undefined) {
  return saveJobBookmarkForChannel({
    userId: "user-1",
    address: actorAddress,
    type: JOB_TYPE.CARBON_REPORT_IMPORT,
    // Info: (20260826 - Luphia) 頻道由位址推導——這正是攻擊者組得出來的那個字串
    resourceKey: buildCarbonChatChannel(address, "2025"),
    pauseReason: null,
    totalSteps: 14,
    completedSteps: 4,
    failedSteps: 0,
    remainingStepIds: ["ch5#1"],
    lastError: null,
    nowMs: NOW_MS,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  asMock(resumableJobRepo.upsert).mockResolvedValue({
    id: "job-1",
    userId: "user-1",
    teamId: null,
    type: JOB_TYPE.CARBON_REPORT_IMPORT,
    status: "RUNNING",
    resourceKey: "channel",
    pauseReason: null,
    pausedAt: null,
    totalSteps: 14,
    completedSteps: 4,
    failedSteps: 0,
    remainingStepIds: ["ch5#1"],
    nextStepCost: null,
    lastError: null,
    createdAt: new Date(NOW_MS),
    updatedAt: new Date(NOW_MS),
  });
  asMock(chatroomRepo.findAccountBookIdByChannel).mockResolvedValue(null);
});

describe("第一道：頻道所有權", () => {
  it("寫自己的頻道 → 放行", async () => {
    await expect(
      bookmarkFor(OWNER_ADDRESS, OWNER_ADDRESS),
    ).resolves.toBeDefined();
    expect(asMock(resumableJobRepo.upsert)).toHaveBeenCalledTimes(1);
  });

  /**
   * Info: (20260826 - Luphia) 這一條就是阻擋級本身：個人會話（未綁帳本）那條路上
   * `resolveBillingTeamId` 不會被呼叫，因此它原本是唯一的授權來源時等於沒有授權
   * ——而個人會話正是這個功能主要服務的對象。
   */
  it("寫別人的頻道 → 拒絕，且一次都不寫入", async () => {
    await expect(
      bookmarkFor(OWNER_ADDRESS, OTHER_ADDRESS),
    ).rejects.toMatchObject({ status: "FORBIDDEN" });
    expect(asMock(resumableJobRepo.upsert)).not.toHaveBeenCalled();
  });

  // Info: (20260826 - Luphia) 沒有位址（不該發生）一律拒絕，不當成「沒有限制」
  it("拿不到呼叫者位址 → 拒絕", async () => {
    await expect(bookmarkFor(OWNER_ADDRESS, undefined)).rejects.toMatchObject({
      status: "FORBIDDEN",
    });
    expect(asMock(resumableJobRepo.upsert)).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260826 - Luphia) 裁決在**任何查詢與寫入之前**：
   * 先查帳本再裁決會讓拒絕的請求也能探測「某個頻道有沒有綁帳本」。
   */
  it("拒絕時連帳本都不查", async () => {
    await expect(
      bookmarkFor(OWNER_ADDRESS, OTHER_ADDRESS),
    ).rejects.toBeDefined();
    expect(
      asMock(chatroomRepo.findAccountBookIdByChannel),
    ).not.toHaveBeenCalled();
  });
});

describe("第二道：任務歸屬", () => {
  /**
   * Info: (20260826 - Luphia) Repo 認出「既有列屬於別人」時，Service 要把它轉成 403
   * ——不與「查不到」共用同一個碼：這裡確定那一列存在，只是不屬於呼叫者。
   */
  it("既有列屬於別人時回 403", async () => {
    asMock(resumableJobRepo.upsert).mockRejectedValue(
      new ResumableJobOwnershipError("channel", JOB_TYPE.CARBON_REPORT_IMPORT),
    );

    await expect(
      bookmarkFor(OWNER_ADDRESS, OWNER_ADDRESS),
    ).rejects.toMatchObject({ status: "FORBIDDEN" });
  });

  it("Repo 真的比對 userId（而不是只靠第一道）", () => {
    const repo = readFileSync(
      join(process.cwd(), "src", "repositories", "resumable_job.repo.ts"),
      "utf8",
    );
    expect(repo).toContain("existing.userId !== input.userId");
    expect(repo).toContain("ResumableJobOwnershipError");
    // Info: (20260826 - Luphia) 讀既有列時要選 userId，否則比對的是 undefined
    expect(repo).toContain("userId: true");
  });
});

/**
 * Info: (20260826 - Luphia) 逐章匯入需要已綁定帳本（review #6717 二輪第 2 條）。
 *
 * 未綁帳本走個人點數，每次呼叫都要一張待付訂單——逐章是 14 次呼叫，
 * 也就是 14 筆訂單與 14 次簽章。先前的實際行為是第一章就 402 → 暫停 →
 * 按「接著匯入」再撞一次 → 永久死路，而訊息說的原因還是錯的。
 */
describe("逐章匯入的帳本前置檢查", () => {
  const hook = readFileSync(
    join(process.cwd(), "src", "hooks", "use_carbon_chat.ts"),
    "utf8",
  );

  it("未綁帳本時在送出前擋下，連附件上傳都不做", () => {
    const guard = hook.indexOf(
      "willChunk && !sessionAccess[chatChannel]?.accountBookId",
    );
    expect(guard).toBeGreaterThan(-1);
    // Info: (20260826 - Luphia) 附件上傳的呼叫必須在守門之後
    expect(hook.indexOf('"/api/v1/chat/carbon/attachment"')).toBeGreaterThan(
      guard,
    );
    expect(hook).toContain("carbon_chatbot.import_requires_book");
  });

  it("五個語言都有那句說明", () => {
    for (const locale of ["zh_tw", "en", "zh_cn", "ja", "ko"]) {
      const file = readFileSync(
        join(
          process.cwd(),
          "src",
          "i18n",
          "locales",
          locale,
          "carbon_chatbot.ts",
        ),
        "utf8",
      );
      expect(file).toContain("import_requires_book:");
    }
  });
});
