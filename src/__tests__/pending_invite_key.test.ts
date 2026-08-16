import { describe, it, expect } from "@jest/globals";
import { buildPendingInviteKey } from "@/lib/team/pending_invite_key";

/**
 * Info: (20260816 - Luphia) 「同時只能有一封待接受邀請」這條約束的全部內容
 * 就是這個字串。算錯就有兩種結果：算得太寬，同一個人被邀請兩次、扣兩次席次費；
 * 算得太窄，兩個不同的人被視為同一個而擋掉其中一個。
 */
describe("buildPendingInviteKey", () => {
  const teamId = "team-1";

  it("信箱邀請以 mail 前綴組鍵", () => {
    expect(buildPendingInviteKey({ teamId, inviteeEmail: "a@x.com" })).toBe(
      "team-1:mail:a@x.com",
    );
  });

  it("位址邀請以 addr 前綴組鍵", () => {
    expect(buildPendingInviteKey({ teamId, inviteeAddress: "0xAbC" })).toBe(
      "team-1:addr:0xabc",
    );
  });

  /**
   * Info: (20260816 - Luphia) 大小寫不同的同一個信箱必須算同一把鍵，
   * 否則 `A@x.com` 與 `a@x.com` 會各佔一席、各扣一次錢。
   */
  it("信箱大小寫與空白正規化後視為同一個對象", () => {
    expect(buildPendingInviteKey({ teamId, inviteeEmail: "  A@X.CoM " })).toBe(
      buildPendingInviteKey({ teamId, inviteeEmail: "a@x.com" }),
    );
  });

  // Info: (20260816 - Luphia) EIP-55 的檢查碼大小寫是同一個位址的兩種寫法
  it("位址大小寫正規化後視為同一個對象", () => {
    expect(buildPendingInviteKey({ teamId, inviteeAddress: "0xABCDEF" })).toBe(
      buildPendingInviteKey({ teamId, inviteeAddress: "0xabcdef" }),
    );
  });

  it("不同團隊的同一個信箱是不同的鍵", () => {
    expect(buildPendingInviteKey({ teamId, inviteeEmail: "a@x.com" })).not.toBe(
      buildPendingInviteKey({ teamId: "team-2", inviteeEmail: "a@x.com" }),
    );
  });

  /**
   * Info: (20260816 - Luphia) 前綴不能省：沒有它，位址與信箱共用一個欄位時
   * 理論上可能撞在一起，而那是一個查起來毫無頭緒的「邀請失敗」。
   */
  it("同樣的字串當位址與當信箱是不同的鍵", () => {
    expect(buildPendingInviteKey({ teamId, inviteeEmail: "abc" })).not.toBe(
      buildPendingInviteKey({ teamId, inviteeAddress: "abc" }),
    );
  });

  /**
   * Info: (20260816 - Luphia) 回 null 就是「這一列不受唯一鍵約束」。
   * 兩者皆空時不可以回空字串——空字串是一個值，會讓所有這種列互相排斥。
   */
  it("兩者皆空時回 null（而不是空字串）", () => {
    expect(buildPendingInviteKey({ teamId })).toBeNull();
    expect(
      buildPendingInviteKey({ teamId, inviteeEmail: "", inviteeAddress: "" }),
    ).toBeNull();
    expect(
      buildPendingInviteKey({
        teamId,
        inviteeEmail: null,
        inviteeAddress: null,
      }),
    ).toBeNull();
  });

  // Info: (20260816 - Luphia) 只有 email 邀請會兩者並存（接受後才有位址），以信箱為準
  it("兩者都有時以信箱為準", () => {
    expect(
      buildPendingInviteKey({
        teamId,
        inviteeEmail: "a@x.com",
        inviteeAddress: "0xabc",
      }),
    ).toBe("team-1:mail:a@x.com");
  });
});
