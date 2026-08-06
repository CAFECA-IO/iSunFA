/**
 * Info: (20260806 - Tzuhan) 保活式 JSON 回應。
 *
 * 核心不變式只有一條:**心跳不得破壞客戶端的解析**。
 * 若這條壞了,表現是所有走這條路的端點一律「JSON 解析失敗」——
 * 而它們正是最長、最難重現的那幾個呼叫。
 */

import { describe, it, expect } from "@jest/globals";
import { streamingJson } from "@/lib/utils/streaming_response";
import { ok, fail, type IApiResponse } from "@/lib/utils/response";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { STREAM_HEARTBEAT_CHARACTER } from "@/constants/http_streaming";

const unexpected = (): IApiResponse<null> => fail(API_ERRORS.IS_UNKNOWN);

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

describe("streamingJson", () => {
  it("工作很快時 body 就是純 JSON(沒有心跳)", async () => {
    const response = streamingJson(async () => ok({ value: 1 }), unexpected, {
      heartbeatIntervalMs: 1_000,
    });
    const text = await response.text();
    expect(text.startsWith(STREAM_HEARTBEAT_CHARACTER)).toBe(false);
    expect(JSON.parse(text).payload).toEqual({ value: 1 });
  });

  /**
   * Info: (20260806 - Tzuhan) 這條是本模組存在的理由:
   * 心跳寫在 JSON 前面,而 JSON.parse 依規範忽略前導空白 —— 客戶端零改動。
   */
  it("工作很慢時前面會有心跳,而 JSON 照樣解析得出來", async () => {
    const response = streamingJson(
      async () => {
        await sleep(30);
        return ok({ value: 2 });
      },
      unexpected,
      { heartbeatIntervalMs: 5 },
    );
    const text = await response.text();
    expect(text.startsWith(STREAM_HEARTBEAT_CHARACTER)).toBe(true);
    expect(JSON.parse(text).payload).toEqual({ value: 2 });
  });

  // Info: (20260806 - Tzuhan) 心跳只在信封之前:信封後面若還有字元,JSON.parse 會拋
  it("心跳不會出現在信封之後", async () => {
    const response = streamingJson(
      async () => {
        await sleep(30);
        return ok({ value: 3 });
      },
      unexpected,
      { heartbeatIntervalMs: 5 },
    );
    const text = await response.text();
    expect(text.trimStart().endsWith("}")).toBe(true);
    expect(() => JSON.parse(text)).not.toThrow();
  });

  /**
   * Info: (20260806 - Tzuhan) 開始串流後狀態碼鎖 200,失敗只能寫在信封裡。
   * 這正是採用本模組的代價,寫成測試讓它是明示的約定而不是意外。
   */
  it("失敗以信封表達,HTTP 狀態仍是 200", async () => {
    const response = streamingJson(
      async () => fail(API_ERRORS.IS_LLM_TIMEOUT),
      unexpected,
    );
    expect(response.status).toBe(200);
    const body = JSON.parse(await response.text());
    expect(body.success).toBe(false);
    expect(body.errorCode).toBe(API_ERRORS.IS_LLM_TIMEOUT.code);
    expect(body.payload).toBeNull();
  });

  /**
   * Info: (20260806 - Tzuhan) `work` 若真的拋出來,不可讓連線無聲斷掉 ——
   * 斷掉的表現與 504 一模一樣,等於整個模組白做。
   */
  it("work 拋錯時仍寫出一個可解析的失敗信封", async () => {
    const response = streamingJson(async () => {
      throw new Error("boom");
    }, unexpected);
    const body = JSON.parse(await response.text());
    expect(body.success).toBe(false);
    expect(body.errorCode).toBe(API_ERRORS.IS_UNKNOWN.code);
  });

  it("宣告 application/json 且不可被快取", async () => {
    const response = streamingJson(async () => ok(null), unexpected);
    expect(response.headers.get("Content-Type")).toContain("application/json");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
