import { describe, it, expect } from "@jest/globals";
import {
  analysisTitleOf,
  isNotificationType,
  notificationHrefOf,
  notificationMessageOf,
  type TranslateFn,
} from "@/lib/notification_message";
import {
  ANALYSIS_LINK_PATH_BY_CATEGORY,
  NOTIFICATION_LINK_PATH,
  NOTIFICATION_TYPE,
} from "@/constants/notification";
import { ANALYSIS_CATEGORY, CATEGORIES } from "@/constants/analysis";

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

/**
 * Info: (20260827 - Julian) 「點下去要去哪裡」（D43）。
 *
 * 這一組測的是**退回那條路**。逐類別的去處寫錯了，下一個加類別的人會發現；
 * 而 fallback 壞掉是靜默的 —— 那正是 D11／D43 的形狀。
 */
describe("notificationHrefOf", () => {
  const itemOf = (
    type: string,
    payload: Record<string, unknown> = {},
  ): { type: string; payload: Record<string, unknown> } => ({ type, payload });

  const ANALYSIS_HISTORY = NOTIFICATION_LINK_PATH[
    NOTIFICATION_TYPE.ANALYSIS_COMPLETED
  ] as string;

  it("未知型別回 null", () => {
    expect(notificationHrefOf(itemOf("SOMETHING_NEW"))).toBeNull();
  });

  // Info: (20260827 - Julian) 非分析型別沒有類別可言，一律走型別層
  it.each([
    [NOTIFICATION_TYPE.TEAM_INVITATION, "/user/team"],
    [NOTIFICATION_TYPE.WALLET_UPGRADE, null],
  ])("非分析型別 %s 走型別層那一格", (type, expected) => {
    expect(notificationHrefOf(itemOf(type))).toBe(expected);
  });

  /**
   * Info: (20260827 - Julian) 這一條是 D43 的反向保護。
   *
   * 修法只該影響那四種不在 `CATEGORIES` 裡的類別。11 種原本正確的
   * 不得被改成特例 —— 表格驅動地把它們全部釘住，加一種就會有人發現。
   */
  it.each([...new Set(CATEGORIES)])(
    "%s 仍然走 /analysis?tab=history",
    (category) => {
      expect(
        notificationHrefOf(
          itemOf(NOTIFICATION_TYPE.ANALYSIS_COMPLETED, {
            analysisType: category,
          }),
        ),
      ).toBe(ANALYSIS_HISTORY);
    },
  );

  it.each([
    ["analysisType 缺漏", {}],
    ["analysisType 是空字串", { analysisType: "" }],
    ["analysisType 不是字串", { analysisType: 123 }],
    ["未知的類別字串", { analysisType: "NOT_A_REAL_CATEGORY" }],
  ])("%s 時退回型別層，不炸掉也不回 undefined", (unusedLabel, payload) => {
    expect(
      notificationHrefOf(itemOf(NOTIFICATION_TYPE.ANALYSIS_COMPLETED, payload)),
    ).toBe(ANALYSIS_HISTORY);
  });

  it("AI 諮詢完成時落在那一則對話", () => {
    expect(
      notificationHrefOf(
        itemOf(NOTIFICATION_TYPE.ANALYSIS_COMPLETED, {
          analysisType: ANALYSIS_CATEGORY.AI_CONSULTING,
          analysisId: "talk-123",
        }),
      ),
    ).toBe("/ai_consultation_room/talk-123");
  });

  /**
   * Info: (20260827 - Julian) 失敗的 payload 沒有 `analysisId`（刻意的：
   * 失敗路徑上 analysis 未必存在，而 order 一定在），所以落在列表頁。
   */
  it("AI 諮詢失敗時落在列表頁，不是 null", () => {
    expect(
      notificationHrefOf(
        itemOf(NOTIFICATION_TYPE.ANALYSIS_FAILED, {
          analysisType: ANALYSIS_CATEGORY.AI_CONSULTING,
        }),
      ),
    ).toBe("/ai_consultation_room");
  });

  it.each([
    [NOTIFICATION_TYPE.ANALYSIS_COMPLETED],
    [NOTIFICATION_TYPE.ANALYSIS_FAILED],
  ])("運輸碳足跡（%s）落在計算機頁", (type) => {
    expect(
      notificationHrefOf(
        itemOf(type, {
          analysisType: ANALYSIS_CATEGORY.TRANSPORTATION_CARBON_FOOTPRINT,
        }),
      ),
    ).toBe("/transportation_carbon_footprint_calculator");
  });

  /**
   * Info: (20260827 - Julian) token 代不進去要回 `null`，不是回半條路徑。
   *
   * `/user/account_book/undefined/journal` 與 `/user/account_book/:accountBookId/journal`
   * 都是「看起來有反應」的錯誤去處，而那正是 D43 要修掉的症狀。
   * D43 第二步把 `accountBookId` 補進 payload 之後，下面第二條會自動改行為 ——
   * 屆時這兩條測試就是它有沒有真的接上的判準。
   */
  it.each([
    [ANALYSIS_CATEGORY.CERTIFICATE_ANALYSIS],
    [ANALYSIS_CATEGORY.JOURNAL_CORRECTION],
  ])("%s 缺 accountBookId 時回 null（渲染成不可點）", (category) => {
    expect(
      notificationHrefOf(
        itemOf(NOTIFICATION_TYPE.ANALYSIS_COMPLETED, {
          analysisType: category,
        }),
      ),
    ).toBeNull();
  });

  it.each([
    [ANALYSIS_CATEGORY.CERTIFICATE_ANALYSIS],
    [ANALYSIS_CATEGORY.JOURNAL_CORRECTION],
  ])("%s 有 accountBookId 時組出日記帳頁", (category) => {
    expect(
      notificationHrefOf(
        itemOf(NOTIFICATION_TYPE.ANALYSIS_COMPLETED, {
          analysisType: category,
          accountBookId: "book-9",
        }),
      ),
    ).toBe("/user/account_book/book-9/journal");
  });

  it("代入的值會被 encode，不會逃出路徑", () => {
    expect(
      notificationHrefOf(
        itemOf(NOTIFICATION_TYPE.ANALYSIS_COMPLETED, {
          analysisType: ANALYSIS_CATEGORY.AI_CONSULTING,
          analysisId: "a/b?c=1",
        }),
      ),
    ).toBe("/ai_consultation_room/a%2Fb%3Fc%3D1");
  });

  // Info: (20260827 - Julian) 類別大小寫：常數是大寫，但別依賴呼叫端一定給大寫
  it("類別字串大小寫不影響查表", () => {
    expect(
      notificationHrefOf(
        itemOf(NOTIFICATION_TYPE.ANALYSIS_FAILED, {
          analysisType: "ai_consulting",
        }),
      ),
    ).toBe("/ai_consultation_room");
  });

  /**
   * Info: (20260827 - Julian) 這張表只該列**不在 `CATEGORIES` 裡**的類別。
   *
   * 有人把某個已在 `CATEGORIES` 的類別加進來時，它會同時出現在兩條路上，
   * 而上面那條「11 種仍走 history」的測試會紅得莫名。這一條說得出原因。
   */
  it("類別表不與 CATEGORIES 重疊", () => {
    const overlap = Object.keys(ANALYSIS_LINK_PATH_BY_CATEGORY).filter(
      (category) => (CATEGORIES as readonly string[]).includes(category),
    );
    expect(overlap).toEqual([]);
  });
});
