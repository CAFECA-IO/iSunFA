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

/**
 * Info: (20260904 - Julian) 「已寄出」分頁一列所需的東西。
 *
 * ## 為什麼不帶薪資單快照
 *
 * 前一版的假資料（`ISentRecord`）每一列都掛著一整份 `ISalaryCalculatorUI`，
 * 因為那時它只是硬編的兩筆。接真資料之後那個形狀會變成：
 * **把整本帳每一位員工的完整薪資明細一次送到瀏覽器**，只為了畫一張
 * 「期間／收件人／寄出日」的表格 —— 而使用者一次只會點開其中一列。
 *
 * 所以清單只回中繼資料，點開某一列時再用既有的
 * `GET record/:record_id` 取那一筆的快照。多一次請求，換掉一整份
 * 不該離開伺服器的資料。
 *
 * ## 為什麼帶 employee
 *
 * `recipientEmail` 是當初的信箱，答得出「寄到哪」但答不出「這是誰的薪資單」——
 * 而同一個人換過信箱之後，光看信箱會以為是兩個人。
 */
export interface ISalaryPaySlipDeliveryListItem extends ISalaryPaySlipDelivery {
  year: number;
  month: number;
  employee: {
    id: string;
    name: string;
    number: string;
  };
}

export interface ISalaryPaySlipDeliveryWriteInput {
  accountBookId: string;
  salaryRecordId: string;
  sentByUserId: string;
  recipientEmail: string;
  status: SalaryDeliveryStatus;
  failureReason?: string | null;
}
