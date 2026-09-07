import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import type { jest as JestType } from "@jest/globals";
declare const jest: typeof JestType;
import { onUnauthorized, request, ApiError } from "@/lib/utils/request";

/**
 * Info: (20260814 - Luphia) 401 必須被通報出去（使用者回報：購買點數選不到團隊錢包）。
 *
 * 當時的真實原因是登入過期，但畫面上什麼都沒說：團隊清單的 catch 把 401 吞成空陣列，
 * 團隊按鈕因此停用，點了沒反應——「過期」在畫面上長得跟「你沒有團隊」一模一樣。
 *
 * 修法是把 401 收斂到 `request()` 集中通報，由 AuthProvider 清身分並顯示提示。
 * 這支測試守住那條通報線：拿掉它，過期又會變回無聲。
 */

const originalFetch = global.fetch;

function mockFetchStatus(status: number) {
  global.fetch = jest.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    statusText: "",
    json: async () => ({ message: "nope" }),
  })) as unknown as typeof fetch;
}

describe("unauthorized notification", () => {
  beforeEach(() => {
    // Info: (20260814 - Luphia) request 會讀 localStorage 取 token，node 環境沒有，補一個最小替身
    Object.defineProperty(globalThis, "localStorage", {
      value: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
      configurable: true,
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("notifies the registered handler when a request comes back 401", async () => {
    const handler = jest.fn();
    const unsubscribe = onUnauthorized(handler);
    mockFetchStatus(401);

    await expect(request("/api/v1/user/team")).rejects.toBeInstanceOf(ApiError);

    expect(handler).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  /**
   * Info: (20260814 - Luphia) 其他失敗不該觸發「你被登出了」：
   * 把 500 也當成過期，會讓每次後端故障都把人踢出去。
   */
  it("stays quiet for failures that are not authentication problems", async () => {
    const handler = jest.fn();
    const unsubscribe = onUnauthorized(handler);
    mockFetchStatus(500);

    await expect(request("/api/v1/user/team")).rejects.toBeInstanceOf(ApiError);

    expect(handler).not.toHaveBeenCalled();
    unsubscribe();
  });

  // Info: (20260814 - Luphia) 解除註冊後不再通報，避免元件卸載後仍被呼叫
  it("stops notifying after unsubscribe", async () => {
    const handler = jest.fn();
    onUnauthorized(handler)();
    mockFetchStatus(401);

    await expect(request("/api/v1/user/team")).rejects.toBeInstanceOf(ApiError);

    expect(handler).not.toHaveBeenCalled();
  });
});
