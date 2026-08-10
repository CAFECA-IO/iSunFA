import { describe, it, expect, beforeEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { faithBillingSettingRepo } from "@/repositories/faith_billing_setting.repo";
import { DEFAULT_FAITH_BILLING } from "@/constants/llm";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    faithBillingSetting: { findUnique: jest.fn(), upsert: jest.fn() },
  },
}));

/**
 * Info: (20260809 - Luphia) 費思計費設定 Repository 單測。
 * 費率是保存於 DB 的系統設定（非 env）；核心不變量為
 * 「查無設定列時 fail-safe 回程式碼預設值，絕不以 0 或無限額計費」。
 */

const asMock = (fn: unknown) => fn as ReturnType<typeof jest.fn>;

describe("FaithBillingSettingRepository.resolveSetting", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the stored setting when the singleton row exists", async () => {
    asMock(prisma.faithBillingSetting.findUnique).mockResolvedValue({
      key: "default",
      tokensPerCredit: 500,
      maxOutputTokens: 8192,
      imageInputTokenEstimate: 1500,
    } as unknown);
    await expect(faithBillingSettingRepo.resolveSetting()).resolves.toEqual({
      tokensPerCredit: 500,
      maxOutputTokens: 8192,
      imageInputTokenEstimate: 1500,
    });
  });

  it("falls back to the code default when nothing is configured yet", async () => {
    asMock(prisma.faithBillingSetting.findUnique).mockResolvedValue(null);
    await expect(faithBillingSettingRepo.resolveSetting()).resolves.toEqual(
      DEFAULT_FAITH_BILLING,
    );
  });
});
