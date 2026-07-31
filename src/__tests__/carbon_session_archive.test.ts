// Info: (20260730 - Tzuhan) 會話封存的權限分層與請求驗證。
// Info: (20260730 - Tzuhan) 「封存整個會話」會讓一整份 33 節報告與活動數據帳本從清單消失,
// Info: (20260730 - Tzuhan) 因此它的權限必須與「編輯內容」分開——EDITOR 能寫報告,不該能收掉別人建的會話。
import { describe, it, expect } from "@jest/globals";
import { CarbonAccessLevelEnum } from "@/services/carbon_access.guard";
import { CarbonSessionArchiveSchema } from "@/validators";
import { buildCarbonChatChannel } from "@/constants/carbon_chatbot";

describe("CarbonAccessLevelEnum", () => {
  it("DELETE 為獨立層級,不等同 EDIT", () => {
    expect(CarbonAccessLevelEnum.DELETE).toBe("DELETE");
    expect(CarbonAccessLevelEnum.DELETE).not.toBe(CarbonAccessLevelEnum.EDIT);
  });

  it("三個層級皆存在(VIEW / EDIT / DELETE)", () => {
    expect(Object.values(CarbonAccessLevelEnum)).toEqual([
      "VIEW",
      "EDIT",
      "DELETE",
    ]);
  });
});

describe("CarbonSessionArchiveSchema", () => {
  it("接受合法 channel", () => {
    const channel = buildCarbonChatChannel("0xabc", "2025");
    const parsed = CarbonSessionArchiveSchema.safeParse({ channel });
    expect(parsed.success).toBe(true);
  });

  it("缺 channel 或型別錯誤一律拒絕", () => {
    expect(CarbonSessionArchiveSchema.safeParse({}).success).toBe(false);
    expect(CarbonSessionArchiveSchema.safeParse({ channel: "" }).success).toBe(
      false,
    );
    expect(CarbonSessionArchiveSchema.safeParse({ channel: 123 }).success).toBe(
      false,
    );
  });

  it("過長的 channel 拒絕(避免以超長字串探測)", () => {
    const parsed = CarbonSessionArchiveSchema.safeParse({
      channel: "c".repeat(201),
    });
    expect(parsed.success).toBe(false);
  });

  it("schema 不承擔授權職責(不驗擁有權,授權由 resolveCarbonAccess 裁決)", () => {
    // Info: (20260730 - Tzuhan) 他人的 channel 在 schema 層是合法輸入,會在權限層被擋
    const othersChannel = buildCarbonChatChannel("0xsomeone_else", "2025");
    expect(
      CarbonSessionArchiveSchema.safeParse({ channel: othersChannel }).success,
    ).toBe(true);
  });
});
