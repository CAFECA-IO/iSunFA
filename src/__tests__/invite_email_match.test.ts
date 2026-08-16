import { describe, it, expect } from "@jest/globals";
import { resolveInviteEmailMatch } from "@/lib/team/invite_email_match";
import { INVITE_EMAIL_MATCH } from "@/constants/status";

/**
 * Info: (20260817 - Luphia) 邀請信箱與接受者信箱的比對（稽核用，不影響能否加入）。
 *
 * 這個函式的輸出會出現在稽核報告上，因此三種結果必須嚴格分開：
 * 「相符」「不符」「沒有可比對的信箱」。把後兩者混在一起，
 * 會讓一個 passkey 使用者看起來像是用錯信箱加入的。
 */
describe("resolveInviteEmailMatch", () => {
  it("已驗證信箱相符時回 MATCHED", () => {
    expect(
      resolveInviteEmailMatch("friend@example.com", ["friend@example.com"]),
    ).toBe(INVITE_EMAIL_MATCH.MATCHED);
  });

  it("大小寫與空白不影響相符判定", () => {
    expect(
      resolveInviteEmailMatch("friend@example.com", ["  Friend@Example.COM "]),
    ).toBe(INVITE_EMAIL_MATCH.MATCHED);
  });

  it("多個信箱中有一個相符即為 MATCHED", () => {
    expect(
      resolveInviteEmailMatch("friend@example.com", [
        "work@example.com",
        "friend@example.com",
      ]),
    ).toBe(INVITE_EMAIL_MATCH.MATCHED);
  });

  it("有信箱但都不相符時回 MISMATCHED", () => {
    expect(
      resolveInviteEmailMatch("friend@example.com", ["other@example.com"]),
    ).toBe(INVITE_EMAIL_MATCH.MISMATCHED);
  });

  /**
   * Info: (20260817 - Luphia) 本檔最重要的一條：沒有信箱不等於不符。
   * passkey 註冊的帳號永遠走這條路，而那是本站的主要註冊方式。
   */
  it("沒有任何可比對的信箱時回 UNAVAILABLE", () => {
    expect(resolveInviteEmailMatch("friend@example.com", [])).toBe(
      INVITE_EMAIL_MATCH.UNAVAILABLE,
    );
  });

  it("信箱清單只有空值時同樣回 UNAVAILABLE", () => {
    expect(
      resolveInviteEmailMatch("friend@example.com", [null, undefined, "  "]),
    ).toBe(INVITE_EMAIL_MATCH.UNAVAILABLE);
  });

  /**
   * Info: (20260817 - Luphia) 位址邀請沒有受邀信箱：回 null 表示「不適用」。
   * 回 UNAVAILABLE 會讓稽核報告上出現一堆「查無信箱」的位址邀請，
   * 而那條路徑的身分是綁在錢包位址上的，比 email 強得多。
   */
  it("沒有受邀信箱時回 null（不適用，而非查無）", () => {
    expect(resolveInviteEmailMatch(null, ["a@x.com"])).toBeNull();
    expect(resolveInviteEmailMatch(undefined, [])).toBeNull();
    expect(resolveInviteEmailMatch("   ", ["a@x.com"])).toBeNull();
  });
});
