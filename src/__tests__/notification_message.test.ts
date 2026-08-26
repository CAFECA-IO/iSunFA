import { describe, it, expect } from "@jest/globals";
import {
  analysisTitleOf,
  isNotificationType,
  notificationMessageOf,
  type TranslateFn,
} from "@/lib/notification_message";
import { NOTIFICATION_TYPE } from "@/constants/notification";

/**
 * Info: (20260826 - Julian) 「哪一種型別顯示哪句話」（review：前端細節）。
 *
 * 這段 switch 原本住在 `notification_row.tsx` 裡並且閉包了 `t`，
 * 所以一條都測不到（repo 沒有 jsdom）。它是計畫書 D11 的落點：
 * 未知型別必須回 `null`，而不是掉進「你的分析已完成」那一支。
 */

/**
 * Info: (20260826 - Julian) 假的 `t`：回鍵名與插值，讓斷言看得出「用了哪個鍵、帶了什麼」。
 *
 * 不回一句翻譯好的話，是因為那樣就變成在測字典而不是測邏輯 ——
 * 而字典的完整性另有 `notification_i18n_placeholders.test.ts` 在管。
 */
const t: TranslateFn = (key, options) => {
  if (options?.defaultValue !== undefined && key.startsWith("analysis.")) {
    // Info: (20260826 - Julian) 只有 `market_trends` 查得到名字，其餘回 defaultValue
    return key === "analysis.categories.market_trends"
      ? "交易市場趨勢"
      : String(options.defaultValue);
  }
  const extra = options
    ? Object.entries(options)
        .filter(([name]) => name !== "defaultValue")
        .map(([name, value]) => `${name}=${value}`)
        .join(",")
    : "";
  return extra ? `${key}(${extra})` : key;
};

const itemOf = (type: string, payload: Record<string, unknown> = {}) => ({
  type,
  payload,
});

describe("isNotificationType", () => {
  it.each(Object.values(NOTIFICATION_TYPE))("%s 是已知型別", (type) => {
    expect(isNotificationType(type)).toBe(true);
  });

  /**
   * Info: (20260826 - Julian) 未知字串必須回 false。
   *
   * 這是取代 `as NotificationType` 的整個理由：`type` 是資料庫裡的字串，
   * 硬轉等於宣稱一件我們無法保證的事。
   */
  it.each(["", "ANALYSIS", "analysis_completed", "SOMETHING_NEW"])(
    "%s 不是已知型別",
    (type) => {
      expect(isNotificationType(type)).toBe(false);
    },
  );
});

describe("notificationMessageOf", () => {
  it("團隊邀請帶入邀請人與團隊名", () => {
    expect(
      notificationMessageOf(
        itemOf(NOTIFICATION_TYPE.TEAM_INVITATION, {
          inviterName: "Amy",
          teamName: "CAFECA",
        }),
        t,
      ),
    ).toBe("notification.team_invitation(inviterName=Amy,teamName=CAFECA)");
  });

  /**
   * Info: (20260826 - Julian) 缺欄位時帶空字串，不是 `undefined`。
   *
   * `String(undefined)` 會是字面的 "undefined" 出現在畫面上 ——
   * 而那是使用者看得到的字。
   */
  it("團隊邀請缺欄位時帶空字串而不是 undefined", () => {
    const message = notificationMessageOf(
      itemOf(NOTIFICATION_TYPE.TEAM_INVITATION),
      t,
    );

    expect(message).toBe(
      "notification.team_invitation(inviterName=,teamName=)",
    );
    expect(message).not.toContain("undefined");
  });

  it("錢包升級沒有插值", () => {
    expect(
      notificationMessageOf(itemOf(NOTIFICATION_TYPE.WALLET_UPGRADE), t),
    ).toBe("notification.wallet_upgrade");
  });

  // Info: (20260826 - Julian) 查得到類別名 → 用帶標題的那句
  it.each([
    [NOTIFICATION_TYPE.ANALYSIS_COMPLETED, "notification.analysis_completed"],
    [NOTIFICATION_TYPE.ANALYSIS_FAILED, "notification.analysis_failed"],
  ])("%s 查得到類別名時用帶標題的文案", (type, base) => {
    expect(
      notificationMessageOf(itemOf(type, { analysisType: "MARKET_TRENDS" }), t),
    ).toBe(`${base}_named(title=交易市場趨勢)`);
  });

  /**
   * Info: (20260826 - Julian) 查不到類別名 → 退回不帶標題那句（不是顯示鍵名）。
   *
   * 常數層有 `JOURNAL_CORRECTION` 而字典裡是 `journal_upload`，
   * 這個缺口今天就存在 —— 所以這條不是假想的情境。
   */
  it.each([
    [NOTIFICATION_TYPE.ANALYSIS_COMPLETED, "notification.analysis_completed"],
    [NOTIFICATION_TYPE.ANALYSIS_FAILED, "notification.analysis_failed"],
  ])("%s 查不到類別名時退回不帶標題的文案", (type, base) => {
    expect(
      notificationMessageOf(
        itemOf(type, { analysisType: "JOURNAL_CORRECTION" }),
        t,
      ),
    ).toBe(base);
  });

  it.each([
    [NOTIFICATION_TYPE.ANALYSIS_COMPLETED],
    [NOTIFICATION_TYPE.ANALYSIS_FAILED],
  ])("%s 完全沒有 analysisType 時也退回不帶標題的文案", (type) => {
    expect(notificationMessageOf(itemOf(type), t)).not.toContain("_named");
  });

  /**
   * Info: (20260826 - Julian) D11：未知型別回 `null`，呼叫端據此整列不渲染。
   *
   * 原本的 fallback 會把任何新增的型別渲染成「你的分析已完成」——
   * 一句錯的話，而新增型別的人不會發現。
   */
  it.each(["SOMETHING_NEW", "", "analysis_completed"])(
    "未知型別 %s 回 null",
    (type) => {
      expect(notificationMessageOf(itemOf(type), t)).toBeNull();
    },
  );
});

describe("analysisTitleOf", () => {
  it("非字串或空字串一律回空", () => {
    expect(analysisTitleOf({}, t)).toBe("");
    expect(analysisTitleOf({ analysisType: "" }, t)).toBe("");
    expect(analysisTitleOf({ analysisType: 123 }, t)).toBe("");
    expect(analysisTitleOf({ analysisType: null }, t)).toBe("");
  });

  // Info: (20260826 - Julian) 大小寫：常數是大寫，字典鍵是小寫
  it("以小寫查字典", () => {
    expect(analysisTitleOf({ analysisType: "MARKET_TRENDS" }, t)).toBe(
      "交易市場趨勢",
    );
  });
});
