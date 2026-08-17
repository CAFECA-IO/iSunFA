import { WorkDayType } from "@/constants/attendance";
import { OvertimePremiumTier } from "@/constants/overtime";

/**
 * Info: (20260817 - Julian) 加班引擎的型別。純函數的輸入輸出，不是 API 的 DTO。
 */

/**
 * Info: (20260817 - Julian) 切段的輸入。
 *
 * `priorRecognizedMinutes` 由呼叫端查好後傳入，引擎不查 DB ——
 * 一個會自己查資料的判定函數，其結果無法在測試裡完整重現，
 * 也就無法在爭議時重算（同 `evaluateAttendanceDay` 的邊界）。
 */
export interface IOvertimeSegmentInput {
  /** Info: (20260817 - Julian) 當日排班的性質。決定走平日、休息日或休假日的加成 */
  workDayType: WorkDayType;
  /** Info: (20260817 - Julian) §32 IV 天災事變等情形且已報備。優先於其他所有判定 */
  isEmergency: boolean;
  /** Info: (20260817 - Julian) 本次要切段的認列分鐘（已是 min(核准, 事實) 的結果） */
  minutes: number;
  /** Info: (20260817 - Julian) 當日先前已認列的加班分鐘。決定本段從第幾小時起算 */
  priorRecognizedMinutes: number;
}

export interface IOvertimeSegment {
  order: number;
  tier: OvertimePremiumTier;
  minutes: number;
}

/**
 * Info: (20260817 - Julian) 工時上限的檢查輸入。
 *
 * 三個累計值都由呼叫端提供：引擎不知道「這個月」是哪個月，
 * 那牽涉政策時區與週期定義，屬 service。
 */
export interface IOvertimeLimitInput {
  /** Info: (20260817 - Julian) 當日正常工作分鐘（班別的 requiredWorkMinutes） */
  regularWorkMinutes: number;
  /** Info: (20260817 - Julian) 含本次在內的當日延長工時累計 */
  dailyOvertimeMinutes: number;
  /** Info: (20260817 - Julian) 含本次在內的當月延長工時累計 */
  monthlyOvertimeMinutes: number;
  /** Info: (20260817 - Julian) 含本次在內的滾動三個月延長工時累計 */
  quarterlyOvertimeMinutes: number;
  /**
   * Info: (20260817 - Julian) 帳本是否已記載工會或勞資會議同意（§32 III）。
   * 為真才適用 54 小時／138 小時；**且該記載必須有 URL 與日期**，
   * 那條不變式在 repository，不在這裡 —— 引擎只認一個布林值。
   */
  extendedLimitAgreed: boolean;
}

// Info: (20260817 - Julian) 被違反的上限種類。回傳清單而非單一值：一次申請可能同時破三條
export enum OvertimeLimitKind {
  DAILY_TOTAL = "DAILY_TOTAL",
  MONTHLY = "MONTHLY",
  QUARTERLY = "QUARTERLY",
}

export interface IOvertimeLimitViolation {
  kind: OvertimeLimitKind;
  limitMinutes: number;
  actualMinutes: number;
}

/**
 * Info: (20260817 - Julian) 上限檢查結果。
 *
 * 引擎回傳違反清單，由 service 丟對應的 `AppError` ——
 * 純函數不該知道 HTTP 狀態碼，而 service 需要知道破的是哪一條才能給出正確錯誤碼。
 */
export interface IOvertimeLimitResult {
  violations: IOvertimeLimitViolation[];
}
