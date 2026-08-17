import {
  LeaveProofRequirement,
  LeaveQuotaMode,
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
