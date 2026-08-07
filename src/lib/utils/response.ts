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
      "Content-Disposition": `attachment; filename="${filename}"`,
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
