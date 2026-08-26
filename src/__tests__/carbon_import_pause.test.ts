import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";
import {
  resolveCreditPauseReason,
  summarisePausedUnits,
} from "@/hooks/use_carbon_chat.helpers";
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
 * Info: (20260825 - Luphia) 「一份做完、另一份撞牆」——本 PR 的阻擋級缺陷
 *（review #6717 阻擋-1）。
 *
 * `buildImportUnits` 會把節數多的章切成兩份（實測 11 章 → 14 個單元，
 * ch1／ch3／ch9 各兩份）。先前這段推導以**章**為單位做正向標記，
 * 於是任一份成功就把整章排除：那一章既不在暫停名單、也不在失敗名單，
 * 而合併出來的內容少了一半的節，沒有任何訊息提過。
 *
 * 這一組是行為測試，不是掃字串——正是那條掃描測試擋不住的東西。
 */
describe("暫停單元收斂成章", () => {
  const title = (id: string) => `${id} 章名`;

  it("章被切成兩份、一份做完一份撞牆 → 那一章仍在暫停名單", () => {
    const summary = summarisePausedUnits({
      // Info: (20260825 - Luphia) ch1 的第一份有結果，第二份沒有（撞牆）
      remainingUnits: [
        { chapterId: "ch1", sectionIds: ["1.5"], partIndex: 2, partTotal: 2 },
      ],
      failedChapterIds: [],
      resolveTitle: title,
    });

    expect(summary.pausedChapters.map((c) => c.id)).toEqual(["ch1"]);
    // Info: (20260825 - Luphia) 接續只跑沒做完的那一份——做完的不重跑（訊息裡的承諾）
    expect(summary.pausedUnits).toHaveLength(1);
    expect(summary.pausedUnits[0].partIndex).toBe(2);
  });

  it("同一章的兩份都沒做 → 章只列一次，但兩份都要接續", () => {
    const summary = summarisePausedUnits({
      remainingUnits: [
        { chapterId: "ch3", sectionIds: ["3.1"], partIndex: 1, partTotal: 2 },
        { chapterId: "ch3", sectionIds: ["3.5"], partIndex: 2, partTotal: 2 },
      ],
      failedChapterIds: [],
      resolveTitle: title,
    });

    expect(summary.pausedChapters).toHaveLength(1);
    expect(summary.pausedUnits).toHaveLength(2);
  });

  /**
   * Info: (20260825 - Luphia) 同一章同時出現在「解析失敗」與「還沒開始解析」
   * 兩句話裡是自相矛盾的，而使用者無從判斷該信哪一句。失敗優先——
   * 它有重試入口，而那條路會把整章重跑。
   */
  it("已經在失敗名單的章不重複出現在暫停名單", () => {
    const summary = summarisePausedUnits({
      remainingUnits: [
        { chapterId: "ch3", sectionIds: ["3.5"], partIndex: 2, partTotal: 2 },
        { chapterId: "ch7", sectionIds: ["7.1"], partIndex: 1, partTotal: 1 },
      ],
      failedChapterIds: ["ch3"],
      resolveTitle: title,
    });

    expect(summary.pausedChapters.map((c) => c.id)).toEqual(["ch7"]);
    expect(summary.pausedUnits.map((u) => u.chapterId)).toEqual(["ch7"]);
  });

  it("沒有暫停的單元時兩份清單都是空的", () => {
    expect(
      summarisePausedUnits({
        remainingUnits: [],
        failedChapterIds: ["ch2"],
        resolveTitle: title,
      }),
    ).toEqual({ pausedUnits: [], pausedChapters: [] });
  });

  // Info: (20260825 - Luphia) 章名由呼叫端解析：接續時 chapters 只帶要重跑的那幾章
  it("章名由 resolveTitle 提供", () => {
    const summary = summarisePausedUnits({
      remainingUnits: [
        { chapterId: "ch9", sectionIds: ["9.1"], partIndex: 1, partTotal: 2 },
      ],
      failedChapterIds: [],
      resolveTitle: (id) => (id === "ch9" ? "第九章 附錄" : id),
    });

    expect(summary.pausedChapters[0].title).toBe("第九章 附錄");
  });
});

/**
 * Info: (20260825 - Luphia) 「接著匯入」的入口（review #6717 高-1）。
 *
 * 在此之前訊息（五語言）告訴使用者補上點數後可以「從這裡接著匯入」，
 * 而畫面上**沒有那個動作**：`pausedChapters` 只在 props interface 裡宣告，
 * 元件本體一次都沒讀；唯一的重試入口只吃 `failedChapters`。
 * 使用者唯一走得到的路是整份重新匯入——已解析的章再解析一次、再收一次點數，
 * 正好是那句承諾的反面。
 *
 * 這與這個 PR 自己要修的毛病是同一類：**畫面說了一件與實際能做的事不符的話**。
 */
describe("接著匯入的入口", () => {
  const card = readFileSync(
    join(
      process.cwd(),
      "src",
      "components",
      "carbon_chatbot",
      "import_preview.tsx",
    ),
    "utf8",
  );
  const page = readFileSync(
    join(process.cwd(), "src", "app", "user", "carbon_chatbot", "page.tsx"),
    "utf8",
  );
  const hook = readFileSync(
    join(process.cwd(), "src", "hooks", "use_carbon_chat.ts"),
    "utf8",
  );

  it("預覽卡真的讀 pausedChapters，並且與失敗分成兩塊", () => {
    expect(card).toContain("pendingImport.pausedChapters ?? []).length > 0");
    expect(card).toContain("carbon_chatbot.import_paused_chapters");
    // Info: (20260825 - Luphia) 失敗那塊還在——兩者是不同的事實，不可以合併
    expect(card).toContain("pendingImport.failedChapters.length > 0");
  });

  it("有一顆接續按鈕，且與重試失敗是不同的動作", () => {
    expect(card).toContain("onResumePaused");
    expect(card).toContain("carbon_chatbot.import_resume_paused");
    expect(page).toContain("onResumePaused={resumePausedImportChapters}");
  });

  /**
   * Info: (20260825 - Luphia) 接續要以**份**為粒度送出：以章接續會把已完成的
   * 那一份再跑一次、再收一次點數，而訊息裡明寫「已完成的部分不會重跑」。
   */
  it("接續送出的是單元（份），不是章", () => {
    const start = hook.indexOf("const resumePausedImportChapters");
    expect(start).toBeGreaterThan(-1);
    const scope = hook.slice(start, start + 1600);
    expect(scope).toContain("pendingImport?.pausedUnits ?? []");
    // Info: (20260825 - Luphia) 第六個參數就是 resumeUnits（見 runImportChapters 的簽章）
    expect(scope).toContain("units,\n      );");
  });

  /**
   * Info: (20260825 - Luphia) 接續之後三個欄位要一起換：這一趟可能又暫停、
   * 可能跑完、也可能有章真的壞掉。只換其中一個會讓畫面同時顯示舊的暫停清單
   * 與新的結果。
   */
  it("接續之後暫停狀態整組更新", () => {
    const start = hook.indexOf("const resumePausedImportChapters");
    const scope = hook.slice(start, start + 3000);
    expect(scope).toContain("pausedChapters: result.pausedChapters");
    expect(scope).toContain("pausedUnits: result.remainingUnits");
    expect(scope).toContain("pauseReason: result.pausedBy");
  });

  it("斷點存得回 DB（validator 收得下這三個欄位）", () => {
    const validator = readFileSync(
      join(process.cwd(), "src", "validators", "carbon_pending_import.ts"),
      "utf8",
    );
    expect(validator).toContain("pausedChapters:");
    expect(validator).toContain("pausedUnits:");
    expect(validator).toContain("pauseReason:");
    // Info: (20260825 - Luphia) 必須是選填：舊紀錄沒有這些欄位，必填會讓它們存不回去
    const start = validator.indexOf("pausedUnits:");
    expect(validator.slice(start, start + 500)).toContain(".optional()");
  });

  it("五個語言都有暫停清單與接續按鈕的文案", () => {
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
      expect(file).toContain("import_paused_chapters:");
      expect(file).toContain("import_resume_paused:");
    }
  });
});

/**
 * Info: (20260825 - Luphia) 逐章迴圈的接線（issue #6713 / review #6717 阻擋-1）。
 *
 * 控制流已經交給共用驅動器（`runResumableJob`，它自己有 12 條不變式測試），
 * 因此這裡只確認**接上了**：用驅動器、分類函式把點數用完歸為 PAUSE、
 * 剩餘的推導走那支純函式。掃描測試能回答的就只到這裡（檢查表 §1.11）。
 */
describe("逐章迴圈的接線", () => {
  const hook = readFileSync(
    join(process.cwd(), "src", "hooks", "use_carbon_chat.ts"),
    "utf8",
  );

  it("控制流交給共用驅動器，不再手寫迴圈", () => {
    expect(hook).toContain("runResumableJob<IImportUnit, void>");
    /**
     * Info: (20260825 - Luphia) 不准回到手寫的正向標記（那正是阻擋-1 的形狀）。
     * 只禁**程式碼**，不禁註解——那段歷史說明留著才知道為什麼不能那樣寫。
     */
    expect(hook).not.toContain("settledChapterIds.add(");
    expect(hook).not.toContain("const settledChapterIds");
  });

  it("點數用完歸類為暫停，其餘歸類為失敗", () => {
    const start = hook.indexOf("classify: (error) =>");
    expect(start).toBeGreaterThan(-1);
    const scope = hook.slice(start, start + 400);
    expect(scope).toContain("resolveCreditPauseReason");
    expect(scope).toContain("STEP_OUTCOME.PAUSE");
    expect(scope).toContain("STEP_OUTCOME.FAIL");
  });

  it("剩餘的推導走 summarisePausedUnits（份粒度）", () => {
    expect(hook).toContain("summarisePausedUnits({");
    expect(hook).toContain("remainingUnits: outcome.remaining");
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
