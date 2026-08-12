import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";
import { WalletCustodyType } from "@/constants/auth_provider";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { ApiCode } from "@/lib/utils/status";
import { requestPrfSecret } from "@/lib/auth/assertion_client";
import { isRateLimitedApiError } from "@/hooks/use_carbon_chat.helpers";

/**
 * Info: (20260812 - Luphia) `requestPrfSecret` 的分流是這批修正的核心，原本零測試。
 *
 * 它決定「這個帳號的對話金鑰從哪來」：passkey 走驗證器、託管走 API。走錯的後果不對稱 ——
 * 把託管帳號送去驗證器，就是開出一個永遠不會成功的系統對話框（這批要消滅的那個 bug）；
 * 把 passkey 帳號送去 API 則是把非託管帳號降級成「伺服器可解密」（server 會擋，
 * 但前端不該先犯）。
 */
const fetchMock = jest.fn<() => Promise<unknown>>();

describe("requestPrfSecret", () => {
  const PRF_SALT = "c2FsdA==";
  const derivePasskeySecret = jest.fn<() => Promise<ArrayBuffer>>();

  const envelope = (payload: unknown, extra: Record<string, unknown> = {}) => ({
    ok: true,
    status: 200,
    json: async () => ({ code: ApiCode.SUCCESS, payload, ...extra }),
  });

  beforeEach(() => {
    fetchMock.mockReset();
    derivePasskeySecret.mockReset();
    derivePasskeySecret.mockResolvedValue(new Uint8Array([1, 2, 3]).buffer);
    global.fetch = fetchMock as unknown as typeof fetch;
    Object.defineProperty(global, "localStorage", {
      value: { getItem: () => "dewt-token" },
      configurable: true,
    });
    global.atob = (value: string) =>
      Buffer.from(value, "base64").toString("binary");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should use the authenticator for a passkey account and never call the API", async () => {
    await requestPrfSecret({
      prfSaltBase64: PRF_SALT,
      custody: WalletCustodyType.PASSKEY,
      derivePasskeySecret,
    });

    expect(derivePasskeySecret).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("should call the API for a custodial account and never touch the authenticator", async () => {
    fetchMock.mockResolvedValue(envelope({ prfSecret: "AQID" }));

    await requestPrfSecret({
      prfSaltBase64: PRF_SALT,
      custody: WalletCustodyType.CUSTODIAL,
      derivePasskeySecret,
    });

    expect(derivePasskeySecret).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(JSON.parse(String(init.body))).toEqual({ prfSalt: PRF_SALT });
  });

  /**
   * Info: (20260812 - Luphia) 未知 custody 不猜，也不得偷偷走任一條路。
   * 猜錯的方向不對稱（見檔頭），所以這裡驗的是「兩條路都沒走」。
   */
  it("should refuse to guess when custody is unknown", async () => {
    await expect(
      requestPrfSecret({ prfSaltBase64: PRF_SALT, derivePasskeySecret }),
    ).rejects.toThrow();

    expect(derivePasskeySecret).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  /**
   * Info: (20260812 - Luphia) 限流必須是**可分類的**（`rate_limiting_guideline.md` 第 3 條：
   * 前端以專屬文案提示，不得顯示為一般系統錯誤）。
   *
   * 這條原本接不起來:`isRateLimitedApiError()` 要求 `RequestApiError`，
   * 而這支用原生 fetch 拋 `AppError`。改拋 `RequestApiError` 之後，
   * 既有的型別守衛不必改動就認得它。
   */
  it("should throw a rate-limit error the existing type guard can classify", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({
        code: ApiCode.RATE_LIMIT,
        errorCode: API_ERRORS.IS_RATE_LIMITED.code,
        message: "Too many requests",
        payload: null,
      }),
    });

    const error = await requestPrfSecret({
      prfSaltBase64: PRF_SALT,
      custody: WalletCustodyType.CUSTODIAL,
      derivePasskeySecret,
    }).catch((caught: unknown) => caught);

    expect(isRateLimitedApiError(error)).toBe(true);
  });
});
