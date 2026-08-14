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

export const LEAVE_RECALL_STATUS_I18N_KEY: Record<LeaveRecallStatus, string> = {
  [LeaveRecallStatus.PENDING]: "hr_management.leave.recall_pending",
  [LeaveRecallStatus.ACCEPTED]: "hr_management.leave.recall_accepted",
  [LeaveRecallStatus.DECLINED]: "hr_management.leave.recall_declined",
};

export const LEAVE_RECALL_STATUS_STYLE: Record<LeaveRecallStatus, string> = {
  [LeaveRecallStatus.PENDING]: "bg-amber-100 text-amber-700",
  [LeaveRecallStatus.ACCEPTED]: "bg-emerald-100 text-emerald-700",
  [LeaveRecallStatus.DECLINED]: "bg-gray-200 text-gray-600",
};

/**
 * Info: (20260813 - Julian) 特別休假的期日由勞工排定（勞基法 §38 III）。目前所有假別銷假皆走同一流程，此集合暫無分歧作用。
 *
 * ToDo: (20260813 - Julian) 假別設定表做出來後，「可否單方銷假」應改為該表的一個欄位，而非寫死於此。
 */
export const EMPLOYEE_SCHEDULED_LEAVE_TYPES: readonly LeaveType[] = [
  LeaveType.ANNUAL,
];
