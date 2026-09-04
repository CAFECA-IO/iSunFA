import { SalaryDeliveryStatus } from "@/constants/salary_delivery";

/**
 * Info: (20260904 - Julian) 一次薪資單寄送的對外形狀。
 *
 * `sentBy` 帶著名字而不只是 id：母計畫 §13.2 記著
 * `SalaryRecord.createdByUserId` 沒有任何讀者、稽核價值等於零。
 * 這次「已寄出」分頁的每一列都要顯示寄送者，所以名字要跟著回應一起出去 ——
 * 前端不該為了顯示一個名字再打一次 user API（計畫書 §6.3）。
 */
export interface ISalaryPaySlipDelivery {
  id: string;
  salaryRecordId: string;
  /**
   * Info: (20260904 - Julian) 當初**實際**寄到的信箱，不是查詢時 join 員工檔取的現值。
   * 員工的 email 之後會被改，而稽核要問的正是「這封當初寄到哪」。
   */
  recipientEmail: string;
  status: SalaryDeliveryStatus;
  /** Info: (20260904 - Julian) 只在 FAILED 時有值。給診斷用，不對外顯示。 */
  failureReason: string | null;
  sentBy: {
    id: string;
    name: string;
  };
  // Info: (20260904 - Julian) Unix 秒，沿用本專案前端時間戳的慣例
  createdAt: number;
}

export interface ISalaryPaySlipDeliveryWriteInput {
  accountBookId: string;
  salaryRecordId: string;
  sentByUserId: string;
  recipientEmail: string;
  status: SalaryDeliveryStatus;
  failureReason?: string | null;
}
