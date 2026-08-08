/**
 * Info: (20260806 - Tzuhan) 保活式串流端點的信封解封。
 *
 * 這一組守的是採用心跳串流的**代價**:HTTP 狀態鎖 200,失敗只在信封裡。
 * 漏判 `success` 的表現是「失敗被當成成功」—— 沒結果、沒錯誤、console 一片乾淨,
 * 比原本的 504 更難查。所以那條反向情形要有測試。
 */

import { describe, it, expect } from "@jest/globals";
import {
  unwrapEnvelope,
  ApiError,
  type IEnvelopeLike,
} from "@/lib/utils/request";
import { API_ERRORS } from "@/lib/utils/error_dictionary";

describe("unwrapEnvelope", () => {
  it("成功時回 payload", () => {
    const envelope: IEnvelopeLike<{ value: number }> = {
      success: true,
      payload: { value: 1 },
    };
    expect(unwrapEnvelope(envelope)).toEqual({ value: 1 });
  });

  /**
   * Info: (20260806 - Tzuhan) 這條就是那個代價的反向測試:
   * `success: false` 但 HTTP 200 —— 不轉成拋出的話,呼叫端的 catch 路徑
   * (重試清單、退回送全文、退避重試)一條都不會走到。
   */
  it("success 為 false 即拋 ApiError,而不是安靜回 null", () => {
    const envelope: IEnvelopeLike<null> = {
      success: false,
      errorCode: API_ERRORS.IS_REPORT_IMPORT_FAILED.code,
      message: "import failed",
      payload: null,
    };
    expect(() => unwrapEnvelope(envelope)).toThrow(ApiError);
  });

  /**
   * Info: (20260806 - Tzuhan) errorCode 必須留在 `data` 上:
   * isQuotaApiError / isTimeoutApiError / isRateLimitedApiError 讀的都是 `data.errorCode`,
   * 少了它,額度與逾時就退化成「一般失敗」,專屬文案與退避策略全部失效。
   */
  it("errorCode 帶進 error.data(既有型別守衛靠它分類)", () => {
    const envelope: IEnvelopeLike<null> = {
      success: false,
      errorCode: API_ERRORS.IS_LLM_QUOTA_EXCEEDED.code,
      payload: null,
    };
    try {
      unwrapEnvelope(envelope);
      throw new Error("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      const apiError = error as ApiError;
      expect((apiError.data as IEnvelopeLike<null>).errorCode).toBe(
        API_ERRORS.IS_LLM_QUOTA_EXCEEDED.code,
      );
      // Info: (20260806 - Tzuhan) status 帶 200 是誠實的:HTTP 那層真的成功,失敗在應用層
      expect(apiError.status).toBe(200);
    }
  });

  /**
   * Info: (20260806 - Tzuhan) 沒有 `success` 欄位的舊式回應不得被誤判為失敗 ——
   * 大部分端點仍是非串流的,它們的成功回應不一定帶 success。
   */
  it("沒有 success 欄位時視為成功(非串流端點不受影響)", () => {
    expect(
      unwrapEnvelope<{ value: number }>({ payload: { value: 2 } }),
    ).toEqual({ value: 2 });
  });

  // Info: (20260806 - Tzuhan) 成功但 payload 為 null 是合法的(如 INDEX 模式無索引),不可拋
  it("成功但 payload 為 null 時回 null,不拋", () => {
    expect(unwrapEnvelope({ success: true, payload: null })).toBeNull();
  });
});
