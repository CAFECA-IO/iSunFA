export class ApiError extends Error {
  public status: number;
  public data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

interface IRequestOptions extends RequestInit {
  query?: Record<string, string | number | boolean | undefined>;
}

/**
 * Info: (20260806 - Tzuhan) 保活式串流端點的回應信封解封。
 *
 * 那些端點(見 @/lib/utils/streaming_response)為了繞開閘道 60 秒的**閒置**逾時,
 * 一開始就送出 200 表頭,失敗只能寫在信封的 `success` / `errorCode` 裡。
 * 於是 `request()` 不會拋 —— **只看 HTTP 狀態會把失敗當成成功**,
 * 而那個表現(沒結果、也沒錯誤、console 一片乾淨)比原本的 504 更難查。
 *
 * 這裡把信封裡的失敗轉回 `ApiError` 拋出,好處是呼叫端的既有 catch 路徑
 * (重試清單、退回送全文、退避重試)語意完全不變,而且 `isQuotaApiError` /
 * `isTimeoutApiError` / `isRateLimitedApiError` 這些型別守衛讀的正是 `data.errorCode`,
 * 因此額度與逾時的分類照樣成立。
 *
 * `status` 帶 200 是誠實的:HTTP 那層真的成功了,失敗在應用層 ——
 * 所以分類一律走 `errorCode`,不要拿 status 去判這類錯誤。
 */
export interface IEnvelopeLike<T> {
  success?: boolean;
  errorCode?: string;
  message?: string;
  payload: T | null;
}

export const unwrapEnvelope = <T>(envelope: IEnvelopeLike<T>): T | null => {
  if (envelope.success === false) {
    throw new ApiError(envelope.message || "Request failed", 200, envelope);
  }
  return envelope.payload;
};

export async function request<T = unknown>(
  url: string,
  options: IRequestOptions = {},
): Promise<T> {
  const { query, headers = {}, ...rest } = options;

  let finalUrl = url;
  if (query) {
    const queryString = Object.entries(query)
      .filter(([, value]) => value !== undefined)
      .map(
        ([key, value]) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
      )
      .join("&");
    if (queryString) {
      finalUrl += `?${queryString}`;
    }
  }

  const token =
    typeof window !== "undefined" ? localStorage.getItem("dewt") : null;
  const defaultHeaders: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  if (!(options.body instanceof FormData)) {
    defaultHeaders["Content-Type"] = "application/json";
  }

  const config: RequestInit = {
    ...rest,
    headers: {
      ...defaultHeaders,
      ...(headers as Record<string, string>),
    },
  };

  try {
    const response = await fetch(finalUrl, config);
    const data = (await response.json().catch(() => ({}))) as unknown;

    if (!response.ok) {
      const errorData = data as { message?: string } | undefined;
      throw new ApiError(
        errorData?.message || response.statusText || "Request failed",
        response.status,
        data,
      );
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Info: (20260118 - Luphia) Network errors or other issues
    throw new ApiError(
      error instanceof Error ? error.message : "Network error",
      0,
    );
  }
}

/**
 * Info: (20260807 - Emily) 保活式串流端點專用:發請求並直接拆信封
 * (PR review 第 1 點)。
 *
 * ## 為什麼需要這個
 *
 * `/chat/carbon/import` 與 `/chat/carbon/diagram` 走保活式串流(先送 `\n` 撐住
 * 閘道的 60 秒閒置逾時),代價是 **HTTP 狀態碼從一開始就鎖成 200** ——
 * 失敗只存在於信封的 `success: false` 裡。
 *
 * 也就是說,對這兩條端點直接用 `request()` 的人會拿到一個「成功」的回應,
 * 而裡面是失敗。表現是「沒結果、沒錯誤、console 一片乾淨」——
 * 比它想取代的那個 504 更難查。
 *
 * 目前所有呼叫點都記得接 `unwrapEnvelope`,但那是靠**作者知道**,不是靠機制。
 * 把兩步併成一步之後,錯誤用法不再是「忘了加一行」,而是要**刻意**繞過去。
 *
 * ## 這不是把 request() 取代掉
 *
 * 一般端點仍然用 `request()`:它們的失敗在 HTTP 狀態碼上,拆信封是多餘的。
 * 這支只服務「狀態碼不能表達失敗」的那一類端點。
 */
export async function requestEnvelope<T = unknown>(
  url: string,
  options: IRequestOptions = {},
): Promise<T | null> {
  const envelope = await request<IEnvelopeLike<T>>(url, options);
  return unwrapEnvelope(envelope);
}

export interface IDownloadedFile {
  blob: Blob;
  /** Info: (20260813 - Julian) 取自 `Content-Disposition`；伺服器沒給時為 null */
  filename: string | null;
}

/**
 * Info: (20260813 - Julian) 下載檔案型端點（`fileOk`）。
 *
 * ## 為什麼不能用 `request()`
 *
 * `request()` 一律 `response.json()`，而這些端點回的是 CSV／PDF ——
 * 解析必然失敗，然後被 `.catch(() => ({}))` 吞成一個空物件，
 * 呼叫端拿到「成功但沒有內容」。那是最難查的一種失敗。
 *
 * ## 檔名以伺服器為準
 *
 * 檔名由伺服器決定（點名單的檔名帶產出時刻），前端只是照抄。
 * 兩邊各組一次，遲早會出現「下載下來的檔名與稽核紀錄裡的對不起來」。
 */
export async function requestFile(
  url: string,
  options: IRequestOptions = {},
): Promise<IDownloadedFile> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("dewt") : null;

  const { query, headers = {}, ...rest } = options;
  let finalUrl = url;
  if (query) {
    const queryString = Object.entries(query)
      .filter(([, value]) => value !== undefined)
      .map(
        ([key, value]) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
      )
      .join("&");
    if (queryString) finalUrl += `?${queryString}`;
  }

  const response = await fetch(finalUrl, {
    ...rest,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(headers as Record<string, string>),
    },
  });

  if (!response.ok) {
    /**
     * Info: (20260813 - Julian) 失敗時伺服器回的是 JSON 信封（`jsonFail`），不是檔案。
     * 讀出來組成 `ApiError`，讓呼叫端的錯誤處理與其他端點一致。
     */
    const data = (await response.json().catch(() => ({}))) as
      | { message?: string }
      | undefined;
    throw new ApiError(
      data?.message || response.statusText || "Download failed",
      response.status,
      data,
    );
  }

  return {
    blob: await response.blob(),
    filename: parseContentDispositionFilename(
      response.headers.get("Content-Disposition"),
    ),
  };
}

// Info: (20260813 - Julian) 只解析 `filename="..."`，這是本專案 `fileOk` 唯一產生的形式
export function parseContentDispositionFilename(
  header: string | null,
): string | null {
  if (!header) return null;
  const matched = /filename="([^"]+)"/.exec(header);
  return matched ? matched[1] : null;
}
