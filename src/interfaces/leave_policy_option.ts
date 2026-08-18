import {
  LeaveAccrualMethod,
  LeaveCycleBasis,
  LeaveProofRequirement,
  LeaveQuotaMode,
  LeaveRoundingMode,
  LeaveUnitBasis,
} from "@/constants/leave_policy";

/**
 * Info: (20260817 - Julian) 請假表單需要知道的假別資訊（L1）。
 *
 * 不是整張 `LeavePolicy` —— 給假規則（級距、遞延、折現）是 HR 設定畫面的事，
 * 請假的人只需要知道「這個假別叫什麼、最小單位多大、要不要附證明」。
 * 回整張表會讓前端看得到 `paidRatio`，而那是薪資模組的事。
 */
export interface ILeavePolicyOption {
  id: string;
  code: string;
  name: string;
  quotaMode: LeaveQuotaMode;
  /** Info: (20260817 - Julian) 決定表單能不能選「半天」與「自訂時段」 */
  unitBasis: LeaveUnitBasis;
  minimumUnitMinutes: number | null;
  proofRequirement: LeaveProofRequirement;
  proofThresholdDays: number | null;
  /**
   * Info: (20260817 - Julian) 雇主有無准駁權。特休為 false（§38 II 期日由勞工排定）——
   * 畫面據此把併休超限顯示成「提醒」而不是「不可送出」。
   */
  employerMayReject: boolean;
  legalBasis: string | null;
}

/**
 * Info: (20260818 - Julian) 假別設定畫面看到的完整一列（L3 / L5）。
 *
 * 與 `ILeavePolicyOption` 分開：那一份是**請假的人**需要知道的（叫什麼、
 * 最小單位多大、要不要附證明），這一份是**設定的人**需要知道的。
 * 合成一個會讓 `paidRatio` 流到請假表單，而那是薪資模組的事。
 */
export interface ILeaveAccrualTierView {
  /** Info: (20260818 - Julian) 年資下界（含），以月為單位 */
  minSeniorityMonths: number;
  days: number;
  /** Info: (20260818 - Julian) §38 I ⑥「每一年加給一日」。只有最後一級可以有值 */
  incrementDaysPerYear: number | null;
  maxDays: number | null;
}

export interface ILeavePolicyDetail {
  id: string;
  code: string;
  name: string;
  accrualMethod: LeaveAccrualMethod;
  cycleBasis: LeaveCycleBasis;
  quotaMode: LeaveQuotaMode;
  /** Info: (20260818 - Julian) `SENIORITY_TIER` 者必為 null —— 日數來自級距表 */
  annualDays: number | null;
  unitBasis: LeaveUnitBasis;
  minimumUnitMinutes: number | null;
  roundingMode: LeaveRoundingMode;
  proratedRoundingScale: number;
  carryForwardMonths: number;
  cashOutOnExpiry: boolean;
  /** Info: (20260818 - Julian) 條件式給付者為 null（產假依年資而異） */
  paidRatio: number | null;
  proofRequirement: LeaveProofRequirement;
  proofThresholdDays: number | null;
  employerMayReject: boolean;
  recallable: boolean;
  mergesIntoPolicyId: string | null;
  legalBasis: string | null;
  /**
   * Info: (20260818 - Julian) 內建假別（seed 產生）。法定欄位鎖住、不可停用 ——
   * 畫面必須看得到這個旗標，否則使用者會對著一個灰掉的欄位找原因。
   */
  isSystemDefined: boolean;
  isActive: boolean;
}

/** Info: (20260818 - Julian) 新增／修改時可寫的欄位。`isSystemDefined` 與 `isActive` 不在其中 */
export type ILeavePolicyWritable = Omit<
  ILeavePolicyDetail,
  "id" | "isSystemDefined" | "isActive"
>;
