/**
 * Info: (20260813 - Julian) 假勤（請假與銷假徵詢）的共用常數。
 *
 * 與 `attendance.ts` 分開：判定引擎只讀 `EmployeeShiftDay`（假單核准/銷假時投影 dayType），
 * 資料流是單向的（假勤寫排班 → 排班餵判定），判定不應反向 import 假別。
 * enum 刻意不從 `@/generated` 匯入，三個都有 schema 對應物，登記在 `hr_enum_mirror.test.ts` 的 `MIRRORED`。
 */

// Info: (20260813 - Julian) 假別，對齊 Prisma enum LeaveType
export enum LeaveType {
  ANNUAL = "ANNUAL",
  PERSONAL = "PERSONAL",
  SICK = "SICK",
  OFFICIAL = "OFFICIAL",
  MARRIAGE = "MARRIAGE",
  BEREAVEMENT = "BEREAVEMENT",
  OTHER = "OTHER",
}

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

export const LEAVE_TYPE_I18N_KEY: Record<LeaveType, string> = {
  [LeaveType.ANNUAL]: "hr_management.leave.type_annual",
  [LeaveType.PERSONAL]: "hr_management.leave.type_personal",
  [LeaveType.SICK]: "hr_management.leave.type_sick",
  [LeaveType.OFFICIAL]: "hr_management.leave.type_official",
  [LeaveType.MARRIAGE]: "hr_management.leave.type_marriage",
  [LeaveType.BEREAVEMENT]: "hr_management.leave.type_bereavement",
  [LeaveType.OTHER]: "hr_management.leave.type_other",
};

/**
 * Info: (20260817 - Luphia) 這裡曾有一個 `EMPLOYEE_SCHEDULED_LEAVE_TYPES = [ANNUAL]`，
 * 已移除：全樹零引用，且它自己的註解就寫著「此集合暫無分歧作用」——
 * 目前所有假別的銷假都走同一條三段式流程，沒有任何程式碼需要區分。
 *
 * 留著的害處不是佔空間，是它看起來像一條**生效中**的規則
 * （「只有特休能銷假」），而讀到它的人會以為某處有在讀它。
 * 假別設定表做出來時，「可否單方銷假」是那張表的一個欄位，不是這裡的一個陣列。
 */
