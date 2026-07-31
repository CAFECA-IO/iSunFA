// Info: (20260730 - Tzuhan) gateway 連線中斷的辨識:誤判成「工作失敗」會讓使用者以為要重跑,
// Info: (20260730 - Tzuhan) 但實測連線被切時伺服端仍跑完且草稿已推達,重跑等於白燒一次 LLM 額度
import { describe, it, expect } from "@jest/globals";
import { isGatewayTimeoutError } from "@/hooks/use_carbon_chat.helpers";
import { ApiError } from "@/lib/utils/request";
import { API_ERRORS } from "@/lib/utils/error_dictionary";

describe("isGatewayTimeoutError", () => {
  it("504 Gateway Time-out 視為連線中斷", () => {
    expect(isGatewayTimeoutError(new ApiError("Gateway Time-out", 504))).toBe(
      true,
    );
  });

  it("502 與 524 同屬連線中斷族群", () => {
    expect(isGatewayTimeoutError(new ApiError("Bad Gateway", 502))).toBe(true);
    expect(isGatewayTimeoutError(new ApiError("Timeout", 524))).toBe(true);
  });

  it("帶業務錯誤碼者不算連線中斷(交由原有專屬文案處理)", () => {
    const quota = new ApiError("quota", 502, {
      errorCode: API_ERRORS.IS_LLM_QUOTA_EXCEEDED.code,
    });
    expect(isGatewayTimeoutError(quota)).toBe(false);
  });

  it("一般業務失敗(400/500)不算連線中斷", () => {
    expect(isGatewayTimeoutError(new ApiError("bad request", 400))).toBe(false);
    expect(isGatewayTimeoutError(new ApiError("server error", 500))).toBe(
      false,
    );
  });

  it("限流 429 不算連線中斷", () => {
    expect(isGatewayTimeoutError(new ApiError("too many", 429))).toBe(false);
  });

  it("非 ApiError 的例外不誤判", () => {
    expect(isGatewayTimeoutError(new Error("boom"))).toBe(false);
    expect(isGatewayTimeoutError(undefined)).toBe(false);
  });
});
