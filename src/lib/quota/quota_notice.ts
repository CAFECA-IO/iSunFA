import {
  QUOTA_WINDOW,
  QUOTA_EXCEEDED_OPTION,
  type QuotaExceededOption,
} from "@/constants/subscription_quota";
import type { IQuotaExceededPayload } from "@/interfaces/team_wallet";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { ApiError as RequestApiError } from "@/lib/utils/request";

/**
 * Info: (20260812 - Luphia) 額度用罄（402 / TW000001）的前端純函式層。
 *
 * 設計書 §5 規定「額度用完」的回應必須帶雙視窗 resetAt 與出路資訊，本檔負責把那個
 * payload 從 fetch 錯誤裡**驗證**出來，並算出倒數——不碰 React、不碰 Date.now()，
 * 時間一律由呼叫端注入 epoch 秒（與 src/lib/quota/window.ts 同慣例），可單元測試。
 *
 * payload 來自網路，屬外部不可預知資料：一律以 unknown + Type Guard 收斂，
 * 缺欄位或型別不符即回 null，讓呼叫端退回通用錯誤文案，絕不讓 undefined 流進畫面
 * 變成「將於 NaN 後重置」。
 */

const QUOTA_WINDOWS: readonly string[] = Object.values(QUOTA_WINDOW);
const QUOTA_EXCEEDED_OPTIONS: readonly string[] = Object.values(
  QUOTA_EXCEEDED_OPTION,
);

function isQuotaWindowStatus(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const status = value as Record<string, unknown>;
  return (
    typeof status.limit === "string" &&
    typeof status.used === "string" &&
    typeof status.resetAt === "number" &&
    Number.isFinite(status.resetAt)
  );
}

export function isQuotaExceededPayload(
  value: unknown,
): value is IQuotaExceededPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return (
    typeof payload.exceeded === "string" &&
    QUOTA_WINDOWS.includes(payload.exceeded) &&
    isQuotaWindowStatus(payload.quota5h) &&
    isQuotaWindowStatus(payload.quotaWeek) &&
    typeof payload.allocationBalance === "string" &&
    Array.isArray(payload.options) &&
    payload.options.every(
      (option): option is QuotaExceededOption =>
        typeof option === "string" && QUOTA_EXCEEDED_OPTIONS.includes(option),
    )
  );
}

/**
 * Info: (20260812 - Luphia) 自 request() 拋出的錯誤取出額度用罄 payload；
 * 非本錯誤碼（或 payload 形狀不符）一律回 null。
 */
export function parseQuotaExceededError(
  error: unknown,
): IQuotaExceededPayload | null {
  if (!(error instanceof RequestApiError)) return null;
  const body = error.data as
    | { errorCode?: string; payload?: unknown }
    | undefined;
  if (body?.errorCode !== API_ERRORS.TW_QUOTA_EXCEEDED.code) return null;
  return isQuotaExceededPayload(body.payload) ? body.payload : null;
}

/**
 * Info: (20260812 - Luphia) 倒數要讀「被擋下的那個視窗」的 resetAt：
 * 週額度用罄時 5 小時視窗的 resetAt 早得多，拿它報時會讓用戶白等一場。
 */
export function resolveQuotaResetAt(payload: IQuotaExceededPayload): number {
  return payload.exceeded === QUOTA_WINDOW.PER_WEEK
    ? payload.quotaWeek.resetAt
    : payload.quota5h.resetAt;
}

/**
 * Info: (20260813 - Luphia) 額度儀表的「剩餘百分比」（團隊錢包面板與費思提示共用）。
 *
 * 語意為剩餘而非已用（見 components/common/quota_meter.tsx）。金額以字串傳輸，
 * 這裡只做顯示用的百分比，故容許轉 Number——百分比不參與任何金額運算。
 * limit 為 0 或不可解析時回 0：沒有額度可用時，儀表應該是空的而不是滿的。
 */
export function quotaRemainingPercent(limit: string, used: string): number {
  const limitValue = Number(limit);
  const usedValue = Number(used);
  if (!Number.isFinite(limitValue) || limitValue <= 0) return 0;
  if (!Number.isFinite(usedValue)) return 0;
  const usedRatio = Math.min(1, Math.max(0, usedValue / limitValue));
  return Math.round((1 - usedRatio) * 100);
}

export interface IQuotaCountdown {
  // Info: (20260812 - Luphia) true 表示重置時間已到，呼叫端據此解除輸入鎖
  expired: boolean;
  totalSeconds: number;
  // Info: (20260812 - Luphia) days 分離而非讓 hours 累加：週視窗可達 167 小時，
  // 「167:59:59」這種讀數無法一眼判斷還要等多久
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const SECONDS_PER_DAY = 24 * 60 * 60;

/**
 * Info: (20260812 - Luphia) 重置倒數（秒級）。resetAt 已過或時鐘偏移導致負值時
 * 收斂為 expired，不顯示負數倒數。
 */
export function describeQuotaCountdown(
  resetAt: number,
  nowSec: number,
): IQuotaCountdown {
  const remaining = Math.max(0, Math.floor(resetAt - nowSec));
  return {
    expired: remaining <= 0,
    totalSeconds: remaining,
    days: Math.floor(remaining / SECONDS_PER_DAY),
    hours: Math.floor(remaining / 3600) % 24,
    minutes: Math.floor((remaining % 3600) / 60),
    seconds: remaining % 60,
  };
}
