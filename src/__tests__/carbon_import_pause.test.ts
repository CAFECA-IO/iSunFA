import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";
import { resolveCreditPauseReason } from "@/hooks/use_carbon_chat.helpers";
import { ApiError as RequestApiError } from "@/lib/utils/request";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { JOB_PAUSE_REASON } from "@/constants/resumable_job";
import { buildImportParsedNotice } from "@/constants/carbon_chatbot";

/**
 * Info: (20260825 - Luphia) 智能溫盤匯入的「點數用完」路徑（issue #6713）。
 *
 * 這一組守的是一個**已經發生過**的缺陷：64 頁報告匯入到一半點數用完，
 * 而前端把它講成「以下章節解析失敗」——那些章一個字都沒讀過。
 * 使用者因此回去改檔案，而真正要做的是補點數。
 *
 * 三件事各自要有一條會紅的斷言：分辨得出來、訊息說對、剩餘與失敗分開。
 */

function envelopeError(errorCode: string): RequestApiError {
  return new RequestApiError("failed", 200, {
    success: false,
    errorCode,
  } as unknown as Record<string, unknown>);
}

describe("分辨「點數用完」與其他失敗", () => {
  /**
   * Info: (20260825 - Luphia) 這兩個碼是**使用者的點數**用完。
   * 重試一百次也一樣——要等額度重置、加購點數或升級方案。
   */
  it("團隊額度用盡 → 暫停（等點數）", () => {
    expect(
      resolveCreditPauseReason(
        envelopeError(API_ERRORS.TW_QUOTA_EXCEEDED.code),
      ),
    ).toBe(JOB_PAUSE_REASON.CREDITS_EXHAUSTED);
  });

  it("需要個人付款 → 暫停（要付款）", () => {
    expect(
      resolveCreditPauseReason(
        envelopeError(API_ERRORS.TW_PERSONAL_PAYMENT_REQUIRED.code),
      ),
    ).toBe(JOB_PAUSE_REASON.PAYMENT_REQUIRED);
  });

  /**
   * Info: (20260825 - Luphia) 這一條是整個缺陷的核心混淆：
   * `IS_LLM_QUOTA_EXCEEDED` 是 **LLM 供應商**的配額，與使用者的錢無關，
   * 稍後重試就好——它**不是**暫停。在此之前前端只認得這一個碼，
   * 於是使用者的點數用完會落到「一般失敗」那條路（＝解析失敗的文案）。
   */
  it("LLM 供應商配額 ≠ 使用者點數用完", () => {
    expect(
      resolveCreditPauseReason(
        envelopeError(API_ERRORS.IS_LLM_QUOTA_EXCEEDED.code),
      ),
    ).toBeNull();
  });

  it("其他錯誤與非 API 錯誤都不是暫停", () => {
    expect(
      resolveCreditPauseReason(envelopeError(API_ERRORS.IS_LLM_TIMEOUT.code)),
    ).toBeNull();
    expect(resolveCreditPauseReason(new Error("boom"))).toBeNull();
    expect(resolveCreditPauseReason(null)).toBeNull();
  });
});

describe("對話通知：兩種情況兩句話", () => {
  const base = {
    fileName: "report.pdf",
    pendingCount: 12,
    draftedCount: 0,
    activityCount: 3,
    failedChapters: [],
  };

  /**
   * Info: (20260825 - Luphia) 點數用完那句必須說「還沒開始解析」，
   * 而且要說得出怎麼繼續。**不可以**出現「解析失敗」——那是另一件事。
   */
  it("點數用完時說「還沒開始解析」，不說「解析失敗」", () => {
    const text = buildImportParsedNotice("zh-TW", {
      ...base,
      pausedChapters: ["第五章 減量目標", "第六章 能源管理"],
    });

    expect(text).toContain("點數已用完");
    expect(text).toContain("還沒開始解析");
    expect(text).toContain("第五章 減量目標");
    expect(text).not.toContain("解析失敗");
    // Info: (20260825 - Luphia) 要說得出三條出路，否則使用者不知道下一步
    expect(text).toContain("加購點數");
    expect(text).toContain("升級方案");
    // Info: (20260825 - Luphia) 也要說已完成的不會重跑——那是使用者最擔心的事（會不會重複扣錢）
    expect(text).toContain("不會重跑");
  });

  it("真的解析失敗時仍然說「解析失敗」", () => {
    const text = buildImportParsedNotice("zh-TW", {
      ...base,
      failedChapters: ["第二章 邊界設定"],
    });

    expect(text).toContain("解析失敗");
    expect(text).not.toContain("點數已用完");
  });

  /**
   * Info: (20260825 - Luphia) 兩者可以併存（先有一章真的壞掉，之後才點數用完），
   * 那時兩句話都要在——各自指名各自的章節。
   */
  it("兩者併存時兩句話都在，章節各自歸屬", () => {
    const text = buildImportParsedNotice("zh-TW", {
      ...base,
      failedChapters: ["第二章 邊界設定"],
      pausedChapters: ["第五章 減量目標"],
    });

    expect(text).toContain("解析失敗");
    expect(text).toContain("點數已用完");
    expect(text.indexOf("第二章 邊界設定")).toBeLessThan(
      text.indexOf("第五章 減量目標"),
    );
  });

  it("沒有暫停也沒有失敗時兩句話都不出現", () => {
    const text = buildImportParsedNotice("zh-TW", base);

    expect(text).not.toContain("解析失敗");
    expect(text).not.toContain("點數已用完");
  });

  // Info: (20260825 - Luphia) 五個語言都要有那句；缺一個就是那個語系的使用者看不到原因
  it("五個語系都說得出點數用完", () => {
    const marks: Record<string, string> = {
      "zh-TW": "點數已用完",
      "zh-CN": "点数已用完",
      en: "ran out of credits",
      ja: "クレジットが不足",
      ko: "크레딧이 모두 소진",
    };
    for (const [language, mark] of Object.entries(marks)) {
      const text = buildImportParsedNotice(language, {
        ...base,
        pausedChapters: ["ch5"],
      });
      expect(text).toContain(mark);
    }
  });
});

/**
 * Info: (20260825 - Luphia) 逐章迴圈的接線（issue #6713）。
 *
 * 掃描原始碼而不是渲染 hook：那支 hook 有 4,000 行與大量 React 狀態相依，
 * 而這裡要釘的три件事都是**控制流**——它們在原始碼上看得見，
 * 而把整個 hook 拉起來測的成本與脆弱度都遠高於它擋到的東西。
 * 判斷本身（什麼算暫停）已由上面那組行為測試涵蓋。
 */
describe("逐章迴圈的接線", () => {
  const hook = readFileSync(
    join(process.cwd(), "src", "hooks", "use_carbon_chat.ts"),
    "utf8",
  );

  it("先問是不是點數用完，再決定要不要記成失敗", () => {
    const start = hook.indexOf("const pauseReason = resolveCreditPauseReason");
    expect(start).toBeGreaterThan(-1);
    const scope = hook.slice(start, start + 700);
    // Info: (20260825 - Luphia) 暫停要在 failed.push 之前 return，否則兩份清單又混在一起
    expect(scope).toContain("if (pausedBy === null) pausedBy = pauseReason");
    expect(scope).toContain("return;");
  });

  it("暫停之後不再領新的章", () => {
    expect(hook).toContain("if (pausedBy !== null) return;");
  });

  it("剩餘的章以「有沒有結果」判斷，不是索引之後", () => {
    expect(hook).toContain("!settledChapterIds.has(chapter.id)");
  });

  /**
   * Info: (20260825 - Luphia) 暫停時**不跑草稿補齊**：它同樣要花點數，
   * 送出去必然再撞一次同一面牆，而它的失敗會落到「補齊失敗」的文案上。
   */
  it("暫停時不跑草稿補齊", () => {
    expect(hook).toContain(
      "missingSectionIds.length > 0 && pauseReason === null",
    );
  });

  /**
   * Info: (20260825 - Luphia) 第一章就用完點數時 segments 與 failed 都是空的，
   * 而原本會落到「檔案裡找不到可匯入的內容」——使用者會回去改檔案。
   */
  it("暫停不會被當成「檔案裡沒有內容」", () => {
    const start = hook.indexOf("payload.segments.length === 0 &&");
    expect(start).toBeGreaterThan(-1);
    expect(hook.slice(start, start + 200)).toContain("pauseReason === null");
  });
});
