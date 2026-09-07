import { NextResponse } from "next/server";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import {
  fail,
  jsonFailWithPayload,
  type IApiResponse,
} from "@/lib/utils/response";
import { QuotaExceededError } from "@/services/spend.service";
import { PersonalPaymentRequiredError } from "@/services/personal_credit.service";

/**
 * Info: (20260813 - Luphia) 計費失敗的統一回應映射（設計書 §5 / §5.5）。
 *
 * 兩種失敗都必須帶 payload，前端才知道下一步：
 * - 團隊額度用罄 → 雙視窗 resetAt 與分配點數餘額（等重置 / 加購 / 升級）
 * - 無帳本會話待付款 → 待付訂單 orderId（走既有簽章付款流程後重送）
 *
 * 抽成共用函式而非在每支 route 各寫一次：碳盤查有四條路徑會丟這兩種錯誤，
 * 漏接任何一條就會退化成「系統錯誤」，而那正是用戶最無從處理的訊息。
 * 非計費錯誤回 null，交由呼叫端原本的處理鏈。
 */
export function toBillingFailureResponse(error: unknown): NextResponse | null {
  if (error instanceof QuotaExceededError) {
    return jsonFailWithPayload(API_ERRORS.TW_QUOTA_EXCEEDED, error.data);
  }
  if (error instanceof PersonalPaymentRequiredError) {
    return jsonFailWithPayload(
      API_ERRORS.TW_PERSONAL_PAYMENT_REQUIRED,
      error.data,
    );
  }
  return null;
}

/**
 * Info: (20260813 - Luphia) 保活式串流端點專用的同一組映射。
 *
 * 那些端點（匯入、結構圖）一開始就送出 200 表頭，失敗只能寫在信封裡，
 * 因此不能回 NextResponse。payload 仍要帶上——待付訂單的 orderId 少了就沒有下一步。
 */
export function toBillingFailureEnvelope(
  error: unknown,
): IApiResponse<unknown> | null {
  if (error instanceof QuotaExceededError) {
    return { ...fail(API_ERRORS.TW_QUOTA_EXCEEDED), payload: error.data };
  }
  if (error instanceof PersonalPaymentRequiredError) {
    return {
      ...fail(API_ERRORS.TW_PERSONAL_PAYMENT_REQUIRED),
      payload: error.data,
    };
  }
  return null;
}
