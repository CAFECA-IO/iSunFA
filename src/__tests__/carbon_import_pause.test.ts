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
 * Info: (20260826 - Luphia) 三條路徑對「未綁帳本」的處理必須一致。
 *
 * 未綁帳本的會話走個人點數：每次呼叫先回 402 帶一張待付訂單，付掉才放行。
 * 聊天、草稿、**單發匯入**各只有一次呼叫，都該走那條路；逐章匯入是 14 次
 * 呼叫＝14 筆訂單，所以它在送出前就被擋下。
 *
 * 這一組的由來是一句寫錯的註解：帳本前置檢查原本聲稱「單發匯入的待付款重送
 * 在下方照常運作」——而那段程式當時根本不存在。註解說謊比缺功能更難查，
 * 因為下一個人會相信它。
 */
describe("未綁帳本時三條路徑的一致性", () => {
  const hook = readFileSync(
    join(process.cwd(), "src", "hooks", "use_carbon_chat.ts"),
    "utf8",
  );

  it("單發匯入會付掉待付訂單再重送", () => {
    const start = hook.indexOf("const postSingleCall = () =>");
    expect(start).toBeGreaterThan(-1);
    const scope = hook.slice(start, start + 1400);
    expect(scope).toContain("parsePersonalPaymentRequired(error)");
    expect(scope).toContain("payExistingOrder(");
    expect(scope).toContain("chunk = await postSingleCall();");
  });

  /**
   * Info: (20260826 - Luphia) 重送要用同一把冪等鍵。單發路徑的
   * `clientMessageId` 已經寫進 `formData`，重送同一個物件即同一把鍵——
   * 這一條釘住「不要改成每次重建 formData」。
   */
  it("單發重送沿用同一個 formData（同一把冪等鍵）", () => {
    const start = hook.indexOf("const postSingleCall = () =>");
    const scope = hook.slice(start, start + 1400);
    expect(scope).toContain("body: formData,");
    expect(scope).not.toContain("new FormData()");
  });

  // Info: (20260826 - Luphia) 逐章仍然擋下：那條路是 14 次呼叫
  it("逐章匯入仍在送出前擋下", () => {
    expect(hook).toContain(
      "willChunk && !sessionAccess[chatChannel]?.accountBookId",
    );
  });
});

/**
 * Info: (20260826 - Luphia) 重試失敗章節也要抽活動數據。
 *
 * 萃取只對證據章 `ch3` 生效，而重試的觸發正是「那一章真的解析失敗」——
 * 若失敗的正是 ch3，傳 `false` 等於重試成功了但活動數據仍是 0 筆，
 * `computedLedger` 空、所有數據圖表畫不出來，而畫面上沒有任何跡象。
 */
describe("重試與活動數據", () => {
  const hook = readFileSync(
    join(process.cwd(), "src", "hooks", "use_carbon_chat.ts"),
    "utf8",
  );
  const retryScope = hook.slice(
    hook.indexOf("const retryFailedImportChapters"),
    hook.indexOf("const resumePausedImportChapters"),
  );

  it("重試的章含證據章時才打開萃取", () => {
    expect(retryScope).toContain(
      "failed.some((chapter) => chapter.id === CARBON_EVIDENCE_CHAPTER_ID)",
    );
  });

  it("抽到的活動數據累加回暫存，且數字跟著更新", () => {
    expect(retryScope).toContain("importActivitiesRef.current = [");
    expect(retryScope).toContain("...result.activities,");
    expect(retryScope).toContain(
      "activityCount: importActivitiesRef.current.length",
    );
  });
});

/**
 * Info: (20260826 - Luphia) 換裝置／重載之後的接續（自我 review 第六輪）。
 *
 * 暫停清單跟著帳號走（存在 `CarbonPendingImport`），但原始檔案只在記憶體
 *（`lastImportSourceRef`）。於是使用者在另一台機器上看得到清單與按鈕，
 * 而按下去**毫無反應、沒有任何訊息**——那是最難自救的一種失敗：
 * 使用者無從判斷是壞了還是自己沒按到。
 */
describe("接續時原始檔案已不在", () => {
  const hook = readFileSync(
    join(process.cwd(), "src", "hooks", "use_carbon_chat.ts"),
    "utf8",
  );
  const resumeScope = hook.slice(
    hook.indexOf("const resumePausedImportChapters"),
    hook.indexOf("const toggleImportItem"),
  );

  it("沒有檔案時說出原因，而不是靜靜返回", () => {
    // Info: (20260826 - Luphia) 不准把 !source 和其他前置條件混在同一個早退裡
    expect(resumeScope).not.toContain(
      "if (!source || units.length === 0 || !pendingImport) return;",
    );
    expect(resumeScope).toContain("if (!source) {");
    expect(resumeScope).toContain("carbon_chatbot.import_resume_needs_file");
  });

  /**
   * Info: (20260826 - Luphia) 那句話要說「已完成的不會重跑」：
   * 使用者被要求重新上傳同一份大檔時，第一個念頭是「是不是要重跑一遍、
   * 再扣一次點數」。
   */
  it("五個語言都說得出「已完成的不會重跑」", () => {
    const marks: Record<string, string> = {
      zh_tw: "不會重跑",
      zh_cn: "不会重跑",
      en: "will not be redone",
      ja: "再実行されません",
      ko: "다시 실행되지 않습니다",
    };
    for (const [locale, mark] of Object.entries(marks)) {
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
      expect(file).toContain("import_resume_needs_file:");
      const start = file.indexOf("import_resume_needs_file:");
      expect(file.slice(start, start + 400)).toContain(mark);
    }
  });
});

/**
 * Info: (20260826 - Luphia) 接續必須把活動數據帶回來（review #6717 二輪中-1）。
 *
 * 萃取只對證據章 `ch3` 生效，而 ch3 在 11 章裡排第 3、又是被切成兩份的三章之一
 * ——「點數在它之前用完」是常態。先前接續傳 `false` 且結果也沒併回去，
 * 於是補上點數之後那一章的活動數據一筆都不會有，`computedLedger` 空、
 * 所有數據圖表畫不出來，而畫面上沒有任何跡象。
 */
describe("接續與活動數據", () => {
  const hook = readFileSync(
    join(process.cwd(), "src", "hooks", "use_carbon_chat.ts"),
    "utf8",
  );
  const resumeScope = (() => {
    const start = hook.indexOf("const resumePausedImportChapters");
    expect(start).toBeGreaterThan(-1);
    return hook.slice(start, hook.indexOf("const toggleImportItem", start));
  })();

  it("接續的單元含證據章時才打開萃取", () => {
    expect(resumeScope).toContain(
      "units.some((unit) => unit.chapterId === CARBON_EVIDENCE_CHAPTER_ID)",
    );
    // Info: (20260826 - Luphia) 不准回到寫死的 false（那就是中-1 的形狀）
    expect(resumeScope).not.toContain(
      "pendingImport.pausedChapters ?? [],\n        false,",
    );
  });

  /**
   * Info: (20260826 - Luphia) 旗標打開但結果沒接回來等於沒抽：
   * `importActivitiesRef` 是套用時真正會被讀的那一份。
   * 累加而不是覆蓋——證據章被切成兩份，其中一份可能先跑完了。
   */
  it("抽到的活動數據累加回暫存，且數字跟著更新", () => {
    expect(resumeScope).toContain("importActivitiesRef.current = [");
    expect(resumeScope).toContain("...result.activities,");
    expect(resumeScope).toContain(
      "activityCount: importActivitiesRef.current.length",
    );
  });

  /**
   * Info: (20260826 - Luphia) 重試路徑的書籤分母要是**總份數**：
   * 先前寫成剩餘份數且完成數恆 0，`GET /user/job` 一接上就會顯示 0/N，
   * 而 N 還會隨著每次重試變小。
   */
  it("重試寫回的書籤分母不是剩餘份數", () => {
    const retryScope = hook.slice(
      hook.indexOf("const retryFailedImportChapters"),
      hook.indexOf("const resumePausedImportChapters"),
    );
    expect(retryScope).toContain("const retryTotalUnits = Math.max(");
    expect(retryScope).not.toContain(
      "totalUnits: merged.pausedUnits?.length ?? 0",
    );
    expect(retryScope).not.toContain("completedUnits: 0,");
  });
});

/**
 * Info: (20260826 - Luphia) 第五輪自我 review 抓到的四項（都在同一條主線上）。
 *
 * 前三項的共同形狀是：**修好了「暫停」這個狀態，但沒有把它接到所有出入口**。
 * 第四項是 `nextStepCost` 拿不到值，而那讓整套「額度回來就翻成可以繼續」
 * 在常態路徑上是死的——最像修好了卻沒有作用的那一種。
 */
describe("暫停狀態的其他出入口", () => {
  const hook = readFileSync(
    join(process.cwd(), "src", "hooks", "use_carbon_chat.ts"),
    "utf8",
  );
  const scopeOf = (fnName: string, nextFn: string) => {
    const start = hook.indexOf(fnName);
    expect(start).toBeGreaterThan(-1);
    const end = hook.indexOf(nextFn, start);
    return hook.slice(start, end > start ? end : start + 4000);
  };

  /**
   * Info: (20260826 - Luphia) 額度見底時按「重試失敗章節」：`result.failed` 是空的
   *（暫停不進 failed），先前整批取代之後那幾章從畫面上**消失**——
   * 既不在失敗清單也不在暫停清單，使用者同時失去資訊與重試入口。
   */
  it("重試時撞到點數用完，章節不會從畫面上消失", () => {
    const scope = scopeOf(
      "const retryFailedImportChapters",
      "const resumePausedImportChapters",
    );
    // Info: (20260826 - Luphia) 不准整批取代
    expect(scope).not.toContain("failedChapters: result.failed,");
    expect(scope).toContain("pausedChapters: [");
    expect(scope).toContain("pausedUnits: [");
    expect(scope).toContain(
      "pauseReason: result.pausedBy ?? current.pauseReason",
    );
  });

  /**
   * Info: (20260826 - Luphia) 重試與接續之後書籤要更新，否則伺服器永遠以為
   * 那份匯入停在原地：掃描行程每 5 分鐘評估一次已經跑完的任務，
   * 而 `GET /user/job` 會回報一個實際上已完成的「未完成任務」。
   */
  it("重試與接續都會更新書籤", () => {
    expect(
      scopeOf(
        "const retryFailedImportChapters",
        "const resumePausedImportChapters",
      ),
    ).toContain("saveImportJobBookmark({");
    expect(
      scopeOf("const resumePausedImportChapters", "const toggleImportItem"),
    ).toContain("saveImportJobBookmark({");
  });

  /**
   * Info: (20260826 - Luphia) 成本要用**原始 File** 的大小。
   *
   * 附件上傳成功就會有 cid，而那時 `importSource.file` 被刻意設為 null
   * 讓瀏覽器回收大檔——也就是**常態路徑**拿不到大小。少了它，
   * 書籤的 `nextStepCost` 是 null，掃描行程只能算進 `unknown`，
   * 於是「額度回來就翻成可以繼續」永遠不會發生。
   */
  it("下一步成本用原始 File 的大小，不是可能為 null 的那份", () => {
    expect(hook).toContain("nextStepInputChars: file.size");
    expect(hook).not.toContain("nextStepInputChars: importSource.file?.size");
  });

  /**
   * Info: (20260826 - Luphia) 小型文字檔是**單發**呼叫，402 直接拋到外層 catch，
   * 而那裡說的是「匯入失敗」。同一份檔案改天點數夠了就會成功，
   * 而那句話會讓使用者去改檔案。
   */
  it("單發匯入撞到點數用完時說對原因", () => {
    const start = hook.indexOf(
      'console.error("[carbon-chat] report import failed:',
    );
    expect(start).toBeGreaterThan(-1);
    const scope = hook.slice(start, start + 800);
    expect(scope).toContain("resolveCreditPauseReason(error) !== null");
    expect(scope).toContain("carbon_chatbot.team_quota_exceeded");
  });
});

/**
 * Info: (20260825 - Luphia) 草稿補齊路徑的同一類缺陷（PR #6716 相容性檢視時發現）。
 *
 * 匯入迴圈把點數用完講成「章節解析失敗」；**單獨按某一節的「生成草稿」也是**——
 * 那條路只認 `isQuotaApiError`（LLM 供應商配額），使用者的點數用完會落到
 * 「草稿生成失敗」，而使用者會以為是這一節的內容有問題。
 *
 * 而它還缺一件聊天路徑早就有的事：無帳本會話的待付款重送。於是同一個使用者
 * 在同一個會話裡，送訊息會自動付款繼續、按「生成草稿」卻只看到失敗——
 * 兩者花的是同一份點數。
 */
describe("草稿補齊的點數處理", () => {
  const hook = readFileSync(
    join(process.cwd(), "src", "hooks", "use_carbon_chat.ts"),
    "utf8",
  );
  const draftScope = (() => {
    const start = hook.indexOf("const generateParagraphDraft");
    expect(start).toBeGreaterThan(-1);
    return hook.slice(start, hook.indexOf("const importBookEsgRecords"));
  })();

  it("點數用完說「額度用完」，不說「草稿生成失敗」", () => {
    expect(draftScope).toContain("resolveCreditPauseReason(error) !== null");
    expect(draftScope).toContain("carbon_chatbot.team_quota_exceeded");
    /**
     * Info: (20260825 - Luphia) 判斷順序要在 `isQuotaApiError` **之前**：
     * 兩者都是 `else if` 鏈上的分支，順序錯了就永遠走不到。
     */
    expect(
      draftScope.indexOf("resolveCreditPauseReason(error) !== null"),
    ).toBeLessThan(draftScope.indexOf("isQuotaApiError(error)"));
  });

  it("無帳本會話會付掉待付訂單再重送（與聊天路徑同一套）", () => {
    expect(draftScope).toContain("parsePersonalPaymentRequired(error)");
    expect(draftScope).toContain("payExistingOrder(");
    expect(draftScope).toContain("res = await requestDraft();");
  });

  /**
   * Info: (20260825 - Luphia) 冪等鍵在重送之間必須相同，否則是「付了一張、又建一張」。
   * 先前這個值是 inline 產生的，一旦加上重送就會踩到那個坑
   *（聊天路徑的註解早就警告過，草稿路徑漏了）。
   */
  it("重送用同一把冪等鍵", () => {
    expect(draftScope).toContain("const clientMessageId = crypto.randomUUID()");
    expect(draftScope).toContain("clientMessageId,");
    // Info: (20260825 - Luphia) 不准回到 inline 產生（那會讓重送變成第二張訂單）
    expect(draftScope).not.toContain("clientMessageId: crypto.randomUUID()");
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
    /**
     * Info: (20260826 - Luphia) 切到**下一個函式**而不是固定位移：
     * 位移在函式長大時會靜靜地把要檢查的內容切掉，而測試仍然是紅的
     * ——紅在一個與行為無關的地方（第六輪就發生了）。
     */
    const start = hook.indexOf("const resumePausedImportChapters");
    expect(start).toBeGreaterThan(-1);
    const scope = hook.slice(
      start,
      hook.indexOf("const toggleImportItem", start),
    );
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
    const scope = hook.slice(
      start,
      hook.indexOf("const toggleImportItem", start),
    );
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

/**
 * Info: (20260827 - Luphia) 暫停狀態要真的落地（issue #6713 目標 5 的補正）。
 *
 * `persistPendingImport` 寫進紀錄的 `pending` 是**明列欄位**，而還原是
 * `...restored.pending` 的展開。明列漏掉的欄位在重新整理之後就不存在了——
 * 而暫停清單一旦消失，`import_preview` 的 `pausedChapters.length > 0`
 * 不成立，「接著匯入」那顆按鈕**根本不會出現**。
 *
 * 這一條會紅在最容易漏的地方：新增暫停相關欄位卻忘了加進落地的那份明列。
 */
describe("暫停狀態要落地，不能只活在記憶體", () => {
  const hook = readFileSync(
    join(process.cwd(), "src", "hooks", "use_carbon_chat.ts"),
    "utf8",
  );
  const persistScope = (() => {
    const start = hook.indexOf("const persistPendingImport = useCallback");
    expect(start).toBeGreaterThan(-1);
    const end = hook.indexOf("const clearPersistedPendingImport", start);
    expect(end).toBeGreaterThan(start);
    return hook.slice(start, end);
  })();

  it.each(["pausedChapters", "pausedUnits", "pauseReason"])(
    "落地的 pending 帶上 %s",
    (field) => {
      expect(persistScope).toContain(field);
    },
  );

  /**
   * Info: (20260827 - Luphia) 還原是展開，所以只要寫的時候有帶就會回來。
   * 這一條釘住「不要把還原改成明列欄位」——那會把同一個缺陷搬到另一端。
   */
  it("還原用展開而不是明列欄位", () => {
    expect(hook).toContain("...restored.pending,");
  });
});
