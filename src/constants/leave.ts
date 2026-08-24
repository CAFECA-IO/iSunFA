/**
 * Info: (20260813 - Julian) 假勤（請假與銷假徵詢）的共用常數。
 *
 * 與 `attendance.ts` 分開：判定引擎只讀 `EmployeeShiftDay`（假單核准/銷假時投影 dayType），
 * 資料流是單向的（假勤寫排班 → 排班餵判定），判定不應反向 import 假別。
 * enum 刻意不從 `@/generated` 匯入，兩個都有 schema 對應物，登記在 `hr_enum_mirror.test.ts` 的 `MIRRORED`。
 *
 * Info: (20260817 - Julian) **`LeaveType` 已移除。** 假別依 ADR 021 改為 `LeavePolicy` 資料表
 * （行為分類用 enum、參數用欄位），內建的七個值降為 seed 的 `LeavePolicy.code` 初始列，
 * 定義見 `src/constants/leave_policy.ts` 的 `LEAVE_POLICY_CODE`。
 * 假別設定相關的 enum 一律在 `leave_policy.ts`，本檔只留假單與銷假徵詢的狀態。
 */

// Info: (20260813 - Julian) 假單狀態，對齊 Prisma enum LeaveRequestStatus
export enum LeaveRequestStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  WITHDRAWN = "WITHDRAWN",
}

// Info: (20260813 - Julian) 銷假徵詢狀態，對齊 Prisma enum LeaveRecallStatus
export enum LeaveRecallStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  DECLINED = "DECLINED",
}

/**
 * Info: (20260813 - Julian) 員工對徵詢的回應。
 *
 * 刻意不用 boolean：`respond(true)` 在呼叫端看不出 true 是「同意」還是「已讀」，
 * 而這個動作的兩個結果在法律意義上差很多。
 */
export enum LeaveRecallDecision {
  ACCEPT = "ACCEPT",
  DECLINE = "DECLINE",
}

/**
 * Info: (20260814 - Julian) 回應徵詢的結果。徵詢已被回應不是故障而是併發下的正常結局，
 * 用回傳值表達而非丟例外，呼叫端才無法忘記處理。
 */
export enum LeaveRecallResolutionOutcome {
  RESOLVED = "RESOLVED",
  ALREADY_ANSWERED = "ALREADY_ANSWERED",
}

/**
 * Info: (20260813 - Julian) 銷假徵詢的理由長度上限。
 * 它是「企業經營上之急迫需求」的書面記載（勞基法 §38 III），不是備註欄。
 */
export const LEAVE_RECALL_REASON_MAX_LENGTH = 200;
export const LEAVE_RECALL_NOTE_MAX_LENGTH = 200;

/**
 * Info: (20260817 - Julian) 「可否單方銷假」已改為 `LeavePolicy.recallable` 欄位（ADR 021）。
 * 原本寫死的 `EMPLOYEE_SCHEDULED_LEAVE_TYPES` 隨 `LeaveType` 一併移除 ——
 * 該常數自己的 ToDo 就是預告這件事。
 */
