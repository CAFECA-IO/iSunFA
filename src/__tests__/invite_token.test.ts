import { describe, it, expect } from "@jest/globals";
import {
  buildInviteUrl,
  createInviteToken,
  hashInviteToken,
  isInviteExpired,
  matchesInviteToken,
  INVITE_TOKEN_TTL_DAYS,
} from "@/lib/team/invite_token";

/**
 * Info: (20260815 - Luphia) 邀請 token 的三條規則（規範 §4 / P4）。
 *
 * 這把鑰匙能讓任何持有者加入別人的團隊，所以每一條都要釘死：
 * 不可預測、資料庫裡存的不是明文、逾期即失效。
 */
describe("invite token", () => {
  const NOW = 1_760_000_000_000;

  it("每次產生的 token 都不同", () => {
    const a = createInviteToken(NOW);
    const b = createInviteToken(NOW);
    expect(a.token).not.toBe(b.token);
    expect(a.tokenHash).not.toBe(b.tokenHash);
  });

  it("token 為 64 個十六進位字元（32 bytes）", () => {
    const { token } = createInviteToken(NOW);
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  /**
   * Info: (20260815 - Luphia) 這一條是本檔的重點：
   * 存進資料庫的必須是雜湊而不是明文，外洩一份備份才不等於任何人都能進團隊。
   */
  it("tokenHash 是 token 的 SHA-256，且不等於 token 本身", () => {
    const { token, tokenHash } = createInviteToken(NOW);
    expect(tokenHash).not.toBe(token);
    expect(tokenHash).toBe(hashInviteToken(token));
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("到期時間為建立後 7 天", () => {
    const { expiresAt } = createInviteToken(NOW);
    expect(expiresAt.getTime()).toBe(NOW + INVITE_TOKEN_TTL_DAYS * 86_400_000);
  });

  describe("matchesInviteToken", () => {
    it("對得上的 token 回 true", () => {
      const { token, tokenHash } = createInviteToken(NOW);
      expect(matchesInviteToken(token, tokenHash)).toBe(true);
    });

    it("對不上的 token 回 false", () => {
      const { tokenHash } = createInviteToken(NOW);
      const other = createInviteToken(NOW);
      expect(matchesInviteToken(other.token, tokenHash)).toBe(false);
    });

    // Info: (20260815 - Luphia) 長度不符時要回 false 而不是讓 timingSafeEqual 丟錯
    it("長度不符的雜湊回 false 而不拋錯", () => {
      const { token } = createInviteToken(NOW);
      expect(matchesInviteToken(token, "abcd")).toBe(false);
    });
  });

  describe("isInviteExpired", () => {
    it("逾期即失效", () => {
      expect(isInviteExpired(new Date(NOW - 1), NOW)).toBe(true);
    });

    // Info: (20260815 - Luphia) 邊界：到期的那一刻算逾期
    it("剛好到期算逾期", () => {
      expect(isInviteExpired(new Date(NOW), NOW)).toBe(true);
    });

    it("未到期不失效", () => {
      expect(isInviteExpired(new Date(NOW + 1), NOW)).toBe(false);
    });

    /**
     * Info: (20260815 - Luphia) 舊的位址邀請沒有 expiresAt。
     * 若這裡回 true，schema 一套用，所有既有的待處理邀請會在同一秒集體失效。
     */
    it("沒有期限的舊邀請不受期限規則約束", () => {
      expect(isInviteExpired(null, NOW)).toBe(false);
      expect(isInviteExpired(undefined, NOW)).toBe(false);
    });
  });

  describe("buildInviteUrl", () => {
    it("組出絕對網址", () => {
      expect(buildInviteUrl("https://isunfa.com", "abc")).toBe(
        "https://isunfa.com/invite/abc",
      );
    });

    // Info: (20260815 - Luphia) 設定值結尾多打斜線不該變成 //invite/
    it("base URL 結尾的斜線不會產生重複斜線", () => {
      expect(buildInviteUrl("https://isunfa.com///", "abc")).toBe(
        "https://isunfa.com/invite/abc",
      );
    });
  });
});
