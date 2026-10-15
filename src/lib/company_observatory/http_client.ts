import { fetchWithRetry } from "@/lib/utils/http_client";
import {
  OBSERVATORY_DEFAULT_HOST_MIN_INTERVAL_MS,
  OBSERVATORY_HOST_MIN_INTERVAL_MS,
  OBSERVATORY_HTTP_MAX_RETRIES,
  OBSERVATORY_HTTP_RETRY_BASE_DELAY_MS,
  OBSERVATORY_HTTP_TIMEOUT_MS,
  OBSERVATORY_USER_AGENT,
} from "@/constants/company_observatory";
import {
  IObservatoryHttpClient,
  IObservatoryHttpRequest,
  IObservatoryHttpResponse,
} from "@/interfaces/company_observatory";
import {
  createHostRateLimiter,
  IHostRateLimiter,
} from "@/lib/company_observatory/host_rate_limiter";

/**
 * Info: (20261015 - Luphia) 企業觀測站對外連線的唯一出口：先過逐主機限速，再走既有的
 * `fetchWithRetry`（逾時 + 429/5xx 指數退避）。下載器只依賴 `IObservatoryHttpClient`，
 * 測試以 fixture 實作替換，不連外網。
 */
export function createObservatoryHttpClient(
  limiter: IHostRateLimiter = createHostRateLimiter({
    intervals: OBSERVATORY_HOST_MIN_INTERVAL_MS,
    defaultIntervalMs: OBSERVATORY_DEFAULT_HOST_MIN_INTERVAL_MS,
  }),
): IObservatoryHttpClient {
  return {
    async request(
      url: string,
      init: IObservatoryHttpRequest = {},
    ): Promise<IObservatoryHttpResponse> {
      await limiter.wait(new URL(url).host);
      const response = await fetchWithRetry(
        url,
        {
          method: init.method ?? "GET",
          headers: { "User-Agent": OBSERVATORY_USER_AGENT, ...init.headers },
          body: init.body,
        },
        OBSERVATORY_HTTP_MAX_RETRIES,
        OBSERVATORY_HTTP_RETRY_BASE_DELAY_MS,
        OBSERVATORY_HTTP_TIMEOUT_MS,
      );
      return {
        status: response.status,
        body: Buffer.from(await response.arrayBuffer()),
      };
    },
  };
}
