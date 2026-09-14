import { NextResponse } from "next/server";
import { ApiCode, HTTP_MAP } from "@/lib/utils/status";
import { name, version } from "@/package";
import { IErrorDef } from "@/lib/utils/error_dictionary";

export const POWERBY = `${name} v${version}`;

export interface IApiResponse<T> {
  powerby: string;
  success: boolean;
  code: ApiCode | string;
  errorCode?: string;
  message: string;
  payload: T | null;
}

export const ok = <T>(payload: T, message = "OK"): IApiResponse<T> => {
  // Info: (20250926 - Luphia) jsonstringify 無法解析 bigint，這邊做個轉換
  const safePayload = JSON.parse(
    JSON.stringify(payload, (key, value) =>
      typeof value === "bigint" ? value.toString() : value,
    ),
  );

  return {
    powerby: POWERBY,
    success: true,
    code: ApiCode.SUCCESS,
    message,
    payload: safePayload,
  };
};

export const fail = (def: IErrorDef): IApiResponse<null> => ({
  powerby: POWERBY,
  success: false,
  code: def.status,
  errorCode: def.code,
  message: def.message,
  payload: null,
});

export const jsonOk = <T>(payload: T, message = "OK", init?: ResponseInit) =>
  NextResponse.json<IApiResponse<T>>(ok(payload, message), init);

export const jsonFail = (def: IErrorDef, init?: ResponseInit) =>
  NextResponse.json<IApiResponse<null>>(fail(def), {
    status: httpStatusOf(def.status),
    ...init,
  });

/**
 * Info: (20260807 - Luphia) 帶結構化 payload 的失敗回應：
 * 402 額度用罄需回傳雙視窗 resetAt 與三條出路資訊（設計書 §5），
 * 前端據此渲染重置倒數與 fallback 選項。
 */
export const jsonFailWithPayload = <T>(
  def: IErrorDef,
  payload: T,
  init?: ResponseInit,
) =>
  NextResponse.json<IApiResponse<T | null>>(
    { ...fail(def), payload },
    {
      status: httpStatusOf(def.status),
      ...init,
    },
  );

/**
 * Info: (20260914 - Julian) 非 ASCII 檔名要兩種寫法並存（RFC 6266 §4.3）。
 *
 * 原本只有 `filename="${filename}"`。HTTP header 的值是 ISO-8859-1，
 * 塞中文進去各家瀏覽器的處理不一致 —— 有的存成亂碼、有的整個忽略。
 * 在 20260914 之前所有呼叫端的檔名都是純 ASCII，所以這個坑沒出現過；
 * 工資清冊要帶公司名（`測試股份有限公司_工資清冊_2026-08.csv`）才踩到。
 *
 * 兩種並存的理由：`filename*` 是較新的、瀏覽器優先採用；
 * `filename=` 留一個 ASCII 退路給讀不懂 `filename*` 的舊客戶端。
 *
 * **引號與控制字元一律拿掉**，不是跳脫：檔名是使用者輸入
 * （公司名稱），一個 `"` 就能提前關掉 `filename="..."` 並在
 * header 裡多塞一段。拿掉比跳脫容易驗證，而代價只是檔名少幾個字。
 */
const contentDispositionOf = (filename: string): string => {
  // Info: (20260914 - Julian) 控制字元、引號、反斜線、路徑分隔符一律去掉
  const safe = filename.replace(/[\u0000-\u001f"\\/]/g, "");
  const ascii = safe.replace(/[^\u0020-\u007e]/g, "_") || "download";

  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(safe)}`;
};

export const fileOk = (
  content: string | Blob | ArrayBuffer,
  filename: string,
  contentType: string,
  init?: ResponseInit,
) => {
  return new NextResponse(content, {
    status: 200,
    ...init,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": contentDispositionOf(filename),
      ...init?.headers,
    },
  });
};

/**
 * Info: (20260807 - Luphia) 改以 HTTP_MAP 為唯一對照來源，
 * 修正雙套對照缺陷（known_issues/api_http_status_dual_mapping.md）：
 * 原 switch 缺 CONFLICT / RATE_LIMIT 導致 409/429 實際回 500，
 * 且新增 ApiCode 成員時 tsc 不會提醒同步。HTTP_MAP 為 Record<ApiCode, number>，
 * 缺成員會直接編譯失敗。
 */
function httpStatusOf(code: ApiCode): number {
  return HTTP_MAP[code] ?? 500;
}
