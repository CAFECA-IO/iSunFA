// Info: (20260730 - Tzuhan) 錯誤描述:實測匯入失敗時 log 只印 `{}`,診斷完全瞎猜,故此工具本身需有測試護住
import { describe, it, expect } from "@jest/globals";
import { describeError } from "@/lib/utils/error_message";

describe("describeError", () => {
  it("Error 實例保留名稱與訊息(JSON.stringify 對 Error 一律得到 {})", () => {
    expect(JSON.stringify(new Error("boom"))).toBe("{}");
    expect(describeError(new Error("boom"))).toBe("Error: boom");
  });

  it("帶 HTTP 狀態的 SDK 錯誤附上 status/statusText/details(分辨 429 額度的關鍵)", () => {
    const error = Object.assign(new Error("Too Many Requests"), {
      name: "GoogleGenerativeAIFetchError",
      status: 429,
      statusText: "Too Many Requests",
      errorDetails: [{ reason: "RATE_LIMIT_EXCEEDED" }],
    });
    const described = describeError(error);
    expect(described).toContain(
      "GoogleGenerativeAIFetchError: Too Many Requests",
    );
    expect(described).toContain("status=429");
    expect(described).toContain("RATE_LIMIT_EXCEEDED");
  });

  it("巢狀 cause 一併展開", () => {
    const error = new Error("outer", { cause: new Error("inner") });
    expect(describeError(error)).toContain("cause=Error: inner");
  });

  it("字串與物件皆可描述", () => {
    expect(describeError("plain text")).toBe("plain text");
    expect(describeError({ code: 42 })).toBe('{"code":42}');
  });

  it("循環參照不讓記 log 本身變成新的失敗點", () => {
    const circular: Record<string, unknown> = { a: 1 };
    circular.self = circular;
    expect(() => describeError(circular)).not.toThrow();
  });
});
