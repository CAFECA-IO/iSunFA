import fs from "fs";
import path from "path";
import { describe, it, expect } from "@jest/globals";
import { ApiError as RequestApiError } from "@/lib/utils/request";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { describeImportFailure } from "@/hooks/use_carbon_chat.helpers";

/**
 * Info: (20260904 - Emily) #6746 我們這半:章節失敗的 log 帶得出 errorCode。
 *
 * 2026-08-27 實測:伺服端回 `Team subscription quota exceeded`,畫面說「點數已用完」,
 * 而 log 只印「ch5 失敗」—— 三個地方三種說法,真因要從別的行反推,耗掉約一小時。
 * 文案與分類分兩碼那半是 #6713 的區域(Luphia),本票不代為改;
 * log 那半是我們的:失敗原因要在**唯一拿得到它的地方**留下來。
 */
describe("describeImportFailure:失敗原因的可記錄形式", () => {
  it("API 錯誤 → errorCode(穩定、可 grep)", () => {
    const error = new RequestApiError("Team subscription quota exceeded", 402, {
      errorCode: API_ERRORS.IS_RATE_LIMITED.code,
    });
    expect(describeImportFailure(error)).toBe(API_ERRORS.IS_RATE_LIMITED.code);
  });

  it("沒有 errorCode 的 Error → 名稱 + 訊息第一個非空行", () => {
    expect(
      describeImportFailure(new TypeError("\n  fetch failed\n  at x")),
    ).toBe("TypeError: fetch failed");
    expect(describeImportFailure(new Error(""))).toBe("Error");
  });

  it("不是 Error 的東西 → String()", () => {
    expect(describeImportFailure("boom")).toBe("boom");
  });

  it("不回傳整個 error 物件(RequestApiError 的 data 是回應 body,可能含使用者內容)", () => {
    const error = new RequestApiError("x", 500, {
      errorCode: "IS000001",
      payload: { secret: "使用者的報告內容" },
    });
    expect(describeImportFailure(error)).not.toContain("使用者的報告內容");
  });
});

describe("接線(掃描 —— hook 沒有 jsdom)", () => {
  const hook = fs.readFileSync(
    path.join(process.cwd(), "src/hooks/use_carbon_chat.ts"),
    "utf-8",
  );

  it("runUnit 在唯一拿得到錯誤的地方記下原因,然後原樣往上拋", () => {
    /**
     * Info: (20260904 - Emily) 驅動器只傳遞分類結果,`outcome.failed` 回來時錯誤已經不在了。
     * 所以記錄點必須在 runUnit 的 catch,而且**要 rethrow** —— 吞掉會讓驅動器以為成功。
     */
    const catchBlock = hook.slice(
      hook.indexOf(
        "failureReasons.set(unitKeyOf(unit), describeImportFailure(error));",
      ),
    );
    expect(catchBlock.indexOf("throw error;")).toBeGreaterThan(-1);
    expect(catchBlock.indexOf("throw error;")).toBeLessThan(200);
  });

  it("失敗章的 console.error 帶 reason", () => {
    const logCall = hook.slice(
      hook.indexOf('"[carbon-chat] import chapter failed:"'),
      hook.indexOf('"[carbon-chat] import chapter failed:"') + 400,
    );
    expect(logCall).toContain("reason=${failureReasons.get(unitKeyOf(unit))");
  });
});
