import fs from "fs";
import path from "path";
import { describe, it, expect } from "@jest/globals";
import {
  minIntervalMsFor,
  RateLimitBucketEnum,
  RATE_LIMIT_RULES,
} from "@/constants/rate_limit";
import { ApiError as RequestApiError } from "@/lib/utils/request";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import {
  isRateLimitedApiError,
  rateLimitBackoffMs,
} from "@/hooks/use_carbon_chat.helpers";

/**
 * Info: (20260904 - Emily) #6744:匯入把自己的 LLM 限流打爆。
 *
 * 驅動器的節流與退避行為由 `resumable_job.test.ts` 守(虛擬時鐘)。
 * 本檔守的是**兩端的膠水**:間隔從哪裡來、退避秒數從哪裡來、以及 hook 有沒有真的接上。
 *
 * 根因的三個事實(2026-09-04 實測):
 * 1. `concurrency: 2` 限的是同時在飛,不限每分鐘發出 —— 來源快取命中後 13 份一秒內全發
 * 2. 匯入的分類器把 429 歸進 FAIL,而 `isRateLimitedApiError` 早就存在、只有對話那端在用
 * 3. `Retry-After` 只在表頭,`request()` 原本把表頭丟掉 —— 用戶端知道被限流卻不知道等多久
 */

describe("發出間隔從限流規則推出(單一來源)", () => {
  it("LLM bucket:分鐘上限的倒數", () => {
    const perMinute = RATE_LIMIT_RULES[RateLimitBucketEnum.LLM].find(
      (window) => window.windowMs === 60_000,
    );
    expect(perMinute).toBeDefined();
    expect(minIntervalMsFor(RateLimitBucketEnum.LLM)).toBe(
      Math.ceil(60_000 / (perMinute as { max: number }).max),
    );
    // Info: (20260904 - Emily) 預設 12/分 → 5 秒;env 覆寫時上面那條仍成立,這條只釘預設
    expect(minIntervalMsFor(RateLimitBucketEnum.LLM)).toBeGreaterThanOrEqual(
      1000,
    );
  });

  it("沒有分鐘窗口的 bucket 不節流", () => {
    // Info: (20260904 - Emily) UPLOAD 只有小時/日窗口
    expect(minIntervalMsFor(RateLimitBucketEnum.UPLOAD)).toBe(0);
  });
});

describe("退避毫秒:優先 Retry-After,沒有才退回呼叫端給的間隔", () => {
  const limited = (retryAfterSeconds?: number) =>
    new RequestApiError(
      "rate limited",
      429,
      { errorCode: API_ERRORS.IS_RATE_LIMITED.code },
      retryAfterSeconds,
    );

  it("表頭有秒數 → 秒 × 1000", () => {
    expect(rateLimitBackoffMs(limited(46), 5000)).toBe(46_000);
  });

  it("表頭沒有 → 退回呼叫端的間隔,不在這裡寫死任何秒數", () => {
    expect(rateLimitBackoffMs(limited(undefined), 5000)).toBe(5000);
    expect(rateLimitBackoffMs(limited(0), 5000)).toBe(5000);
  });

  it("不是 API 錯誤 → 退回間隔", () => {
    expect(rateLimitBackoffMs(new Error("boom"), 5000)).toBe(5000);
  });

  it("前提:429 真的被認出來(否則上面幾條是空轉)", () => {
    expect(isRateLimitedApiError(limited(5))).toBe(true);
  });
});

describe("Retry-After 從表頭帶上 ApiError", () => {
  it("ApiError 有 retryAfterSeconds 欄位,且既有三參數建構仍成立", () => {
    const withHeader = new RequestApiError("x", 429, {}, 12);
    const without = new RequestApiError("x", 500, {});
    expect(withHeader.retryAfterSeconds).toBe(12);
    expect(without.retryAfterSeconds).toBeUndefined();
  });

  it("request.ts 在非 2xx 分支讀了 Retry-After(掃描)", () => {
    /**
     * Info: (20260904 - Emily) `request()` 要真的打 fetch,這裡不模擬整個 fetch;
     * 用掃描釘住「表頭有被讀」這件事,值的解析由上面那組守。
     */
    const src = fs.readFileSync(
      path.join(process.cwd(), "src/lib/utils/request.ts"),
      "utf-8",
    );
    expect(src).toContain('response.headers.get("Retry-After")');
  });
});

describe("匯入的驅動器接線(掃描 —— hook 沒有 jsdom)", () => {
  const hook = fs.readFileSync(
    path.join(process.cwd(), "src/hooks/use_carbon_chat.ts"),
    "utf-8",
  );
  const call = hook.slice(
    hook.indexOf("const outcome = await runResumableJob<IImportUnit, void>({"),
    hook.indexOf("const pausedBy = outcome.pausedBy;"),
  );

  it("分類器把 429 歸進 RETRY,而且帶 afterMs", () => {
    expect(call).toContain("isRateLimitedApiError(error)");
    expect(call).toContain("kind: STEP_OUTCOME.RETRY");
    expect(call).toContain(
      "afterMs: rateLimitBackoffMs(error, llmStartIntervalMs)",
    );
  });

  it("節流間隔傳進驅動器,而且來自規則表不是字面數字", () => {
    expect(call).toContain("minStartIntervalMs: llmStartIntervalMs");
    expect(hook).toContain(
      "const llmStartIntervalMs = minIntervalMsFor(RateLimitBucketEnum.LLM);",
    );
    // Info: (20260904 - Emily) 沒有人在呼叫點寫 5000 之類的數字
    expect(call).not.toMatch(/minStartIntervalMs:\s*\d/);
  });

  it("重試次數提高到 3(預設的 1 接不住同一分鐘的對話流量)", () => {
    expect(call).toContain("maxRetriesPerStep: 3");
  });

  it("三條路徑(首次匯入、重試失敗章、接續暫停)都走同一個 runImportChapters", () => {
    /**
     * Info: (20260904 - Emily) 票上寫「重試按鈕不再把全部失敗章一次重送」。
     * 只要三條路徑都經過同一個 `runImportChapters`,節流就自動涵蓋重試按鈕 ——
     * 這一條釘住「只有一個 runResumableJob 呼叫點」,否則會有一條路繞過節流。
     */
    expect(hook.split("runResumableJob<").length - 1).toBe(1);
    expect(
      hook.split("await runImportChapters(").length - 1,
    ).toBeGreaterThanOrEqual(3);
  });
});
