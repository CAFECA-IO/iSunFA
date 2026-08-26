import { describe, it, expect } from "@jest/globals";
import {
  canActOnInvitation,
  isIntendedRecipient,
} from "@/services/team_invitation.service";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { TEAM_INVITATION_STATUS } from "@/constants/status";

/**
 * Info: (20260826 - Julian) 「這封邀請是不是給你的」——接受與拒絕的授權判定（review B1）。
 *
 * ## 為什麼這一支要單獨存在
 *
 * D19 把查詢端改成「位址 **OR** 已驗證信箱」，處置端卻還是純位址比對。
 * 結果是 email 邀請**看得到、接不了**：鈴鐺推一則待辦、團隊頁畫兩顆按鈕、
 * 兩顆都必定失敗。查詢與處置對同一個問題給出不同答案，而沒有任何測試
 * 同時看得到兩邊 —— `team_invitation_pending_list.test.ts` 只測查詢那一半。
 *
 * 這支測的是收斂之後**唯一**那個判斷點。它是純函式，所以四種
 * 邀請形狀 × 三種身分可以窮舉，不必為每一種去架一次 route。
 *
 * ## 這裡的判定為什麼夠強（與 `invite_email_match.ts` 的關係）
 *
 * 那個檔案寫著「邀請信箱是投遞地址，不是身分斷言」，講的是**不能從持有
 * 連結反推身分**（信會被轉寄）。這裡是相反方向：使用者對該信箱有第三方
 * 驗證過的綁定，也就是他確實控制著那封信投遞到的信箱。因此這條路徑不比
 * token 弱 —— token 是 bearer，這裡多一層已驗證的身分綁定。
 */

const NOW_MS = 1_760_000_000_000;
const ADDRESS = "0xabc";
const EMAIL_KEY = "alice@gmail.com";

const keysOf = (
  overrides: Partial<{ address: string; emailKeys: string[] }> = {},
) => ({
  address: ADDRESS,
  emailKeys: [EMAIL_KEY],
  ...overrides,
});

function invitation(
  overrides: Partial<{
    status: string;
    expiresAt: Date | null;
    inviteeAddress: string | null;
    inviteeEmailKey: string | null;
  }> = {},
) {
  return {
    status: TEAM_INVITATION_STATUS.PENDING,
    expiresAt: null,
    inviteeAddress: null,
    inviteeEmailKey: null,
    ...overrides,
  };
}

describe("isIntendedRecipient", () => {
  it("位址相符 → 是（原本就成立的那一半，不能改壞）", () => {
    expect(
      isIntendedRecipient(
        { inviteeAddress: ADDRESS, inviteeEmailKey: null },
        keysOf(),
      ),
    ).toBe(true);
  });

  /**
   * Info: (20260826 - Julian) B1 的正題：這一條在修好之前是 false。
   */
  it("已驗證信箱的 canonical key 相符 → 是", () => {
    expect(
      isIntendedRecipient(
        { inviteeAddress: null, inviteeEmailKey: EMAIL_KEY },
        keysOf(),
      ),
    ).toBe(true);
  });

  it("別人的位址、別人的信箱 → 否", () => {
    expect(
      isIntendedRecipient(
        { inviteeAddress: "0xother", inviteeEmailKey: "bob@gmail.com" },
        keysOf(),
      ),
    ).toBe(false);
  });

  /**
   * Info: (20260826 - Julian) 沒有任何已驗證信箱的人（passkey 註冊）不能靠 email 進來。
   *
   * `emailKeys` 為空時 `includes` 恆為 false —— 這一條釘的是那個保證，
   * 而不是「今天剛好沒人這樣」。
   */
  it("沒有已驗證信箱的人接不了 email 邀請", () => {
    expect(
      isIntendedRecipient(
        { inviteeAddress: null, inviteeEmailKey: EMAIL_KEY },
        keysOf({ emailKeys: [] }),
      ),
    ).toBe(false);
  });

  /**
   * Info: (20260826 - Julian) 兩欄皆空的邀請，任何人都不是收件者。
   *
   * 沒有 `Boolean(...)` 那一層的話，`null === null` 會讓**所有人**都通過。
   * 這種列今天造不出來（建立路徑一定給其中一欄），這條釘的是
   * 「今天造不出來」哪天不成立 —— 而失效方向是任何人加入任何團隊。
   */
  it("兩欄皆空 → 任何人都不是收件者", () => {
    expect(isIntendedRecipient(invitation(), keysOf())).toBe(false);
    expect(
      isIntendedRecipient(invitation(), keysOf({ address: "", emailKeys: [] })),
    ).toBe(false);
  });

  // Info: (20260826 - Julian) 空位址的身分不得比對上「沒有位址」的 email 邀請
  it("身分沒有位址時不得與 inviteeAddress 為 null 的邀請相符", () => {
    expect(
      isIntendedRecipient(
        { inviteeAddress: null, inviteeEmailKey: "bob@gmail.com" },
        keysOf({ address: "", emailKeys: [] }),
      ),
    ).toBe(false);
  });
});

describe("canActOnInvitation", () => {
  it("PENDING、未逾期、是收件者 → 放行，並回收窄過的邀請", () => {
    const row = invitation({ inviteeEmailKey: EMAIL_KEY });
    const check = canActOnInvitation({
      invitation: row,
      keys: keysOf(),
      nowMs: NOW_MS,
    });

    expect(check.ok).toBe(true);
    // Info: (20260826 - Julian) 帶回邀請本身，呼叫端才不必再判一次 null
    expect(check.ok && check.invitation).toBe(row);
  });

  it("查無邀請 → NOT_FOUND", () => {
    const check = canActOnInvitation({
      invitation: null,
      keys: keysOf(),
      nowMs: NOW_MS,
    });

    expect(check).toEqual({
      ok: false,
      error: API_ERRORS.NO_INVITATION_NOT_FOUND_OR_NO,
    });
  });

  it.each([
    TEAM_INVITATION_STATUS.ACCEPTED,
    TEAM_INVITATION_STATUS.REJECTED,
    TEAM_INVITATION_STATUS.REVOKED,
  ])("狀態為 %s → NOT_FOUND", (status) => {
    const check = canActOnInvitation({
      invitation: invitation({ status, inviteeEmailKey: EMAIL_KEY }),
      keys: keysOf(),
      nowMs: NOW_MS,
    });

    expect(check.ok).toBe(false);
  });

  /**
   * Info: (20260826 - Julian) 逾期：這支端點原本**完全沒檢查**。
   *
   * 位址邀請不設 `expiresAt`，所以在舊路徑上這是潛伏的；email 邀請有
   * 7 天期限，只放寬收件者判定而不補這一道，等於開放
   * 「逾期三個月的邀請仍可接受並佔掉一個付費席次」。
   */
  it("逾期的邀請不得接受，即使收件者正確", () => {
    const check = canActOnInvitation({
      invitation: invitation({
        inviteeEmailKey: EMAIL_KEY,
        expiresAt: new Date(NOW_MS - 1),
      }),
      keys: keysOf(),
      nowMs: NOW_MS,
    });

    expect(check.ok).toBe(false);
  });

  it("尚未逾期的邀請照常放行（證明上一條不是把全部擋掉）", () => {
    const check = canActOnInvitation({
      invitation: invitation({
        inviteeEmailKey: EMAIL_KEY,
        expiresAt: new Date(NOW_MS + 1),
      }),
      keys: keysOf(),
      nowMs: NOW_MS,
    });

    expect(check.ok).toBe(true);
  });

  /**
   * Info: (20260826 - Julian) 逾期回的是 NOT_FOUND，不是「不是給你的」。
   *
   * 分開回碼會讓未持有邀請的人問得出「這個 id 存在但過期了」，
   * 而這支端點的 id 出現在網址上。
   */
  it("逾期與查無邀請回同一個錯誤碼（不洩漏 id 是否存在）", () => {
    const expired = canActOnInvitation({
      invitation: invitation({
        inviteeEmailKey: EMAIL_KEY,
        expiresAt: new Date(NOW_MS - 1),
      }),
      keys: keysOf(),
      nowMs: NOW_MS,
    });
    const missing = canActOnInvitation({
      invitation: null,
      keys: keysOf(),
      nowMs: NOW_MS,
    });

    expect(expired).toEqual(missing);
  });

  it("不是收件者 → NOT_INTENDED（與 NOT_FOUND 分開）", () => {
    const check = canActOnInvitation({
      invitation: invitation({ inviteeAddress: "0xother" }),
      keys: keysOf(),
      nowMs: NOW_MS,
    });

    expect(check).toEqual({
      ok: false,
      error: API_ERRORS.FO_YOU_ARE_NOT_THE_INTENDED_RE,
    });
  });

  /**
   * Info: (20260826 - Julian) 順序：狀態／逾期先於收件者。
   *
   * 反過來的話，非收件者可以用錯誤碼問出「這封邀請還是 PENDING 嗎」。
   */
  it("既非收件者又已逾期時，回的是 NOT_FOUND", () => {
    const check = canActOnInvitation({
      invitation: invitation({
        inviteeAddress: "0xother",
        expiresAt: new Date(NOW_MS - 1),
      }),
      keys: keysOf(),
      nowMs: NOW_MS,
    });

    expect(check).toEqual({
      ok: false,
      error: API_ERRORS.NO_INVITATION_NOT_FOUND_OR_NO,
    });
  });
});
