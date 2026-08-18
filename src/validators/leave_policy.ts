import { z } from "zod";
import {
  LeaveAccrualMethod,
  LeaveCycleBasis,
  LeaveProofRequirement,
  LeaveQuotaMode,
  LeaveRoundingMode,
  LeaveUnitBasis,
} from "@/constants/leave_policy";

/**
 * Info: (20260818 - Julian) 假別設定的 Payload 驗證（L2 / L3 / L6）。
 *
 * 這一層擋的是「欄位型別對不對」；「這些欄位放在一起說不說得通」
 * （`FIXED_MINUTES` 必須有分鐘數、`SENIORITY_TIER` 不得帶固定日數、
 * 併計不得成環）由 `assertLeavePolicyUnit` 與 service 負責 ——
 * 那些規則同時要守住 seed 這條不經過 validator 的路徑。
 */

/**
 * Info: (20260818 - Julian) 假別代號限大寫英數與底線。
 *
 * 不是為了好看：`LEAVE_POLICY_CODE` 的內建值就是這個形狀，而 code 是
 * 跨帳本統計與 i18n 對照的鍵。允許自由格式會讓「同一種假在兩個帳本
 * 叫不同的 code」變成常態，那個成本要到做跨帳本報表時才會付。
 */
const policyCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .regex(/^[A-Z][A-Z0-9_]*$/);

/**
 * Info: (20260818 - Julian) 新增與修改共用同一個形狀，且是**全量**的。
 *
 * 差異更新在這裡是錯的：假別設定的欄位互相牽制（單位基準決定要不要有分鐘數、
 * 給假方式決定能不能有固定日數），只送一部分會讓不變式對著一半新一半舊的
 * 組合做判斷 —— 而那個組合從來沒有真的存在過。
 */
export const leavePolicyWriteSchema = z.object({
  code: policyCodeSchema,
  name: z.string().trim().min(1).max(50),
  accrualMethod: z.enum([
    LeaveAccrualMethod.NONE,
    LeaveAccrualMethod.SENIORITY_TIER,
    LeaveAccrualMethod.FIXED_PER_CYCLE,
    LeaveAccrualMethod.PER_EVENT,
  ]),
  cycleBasis: z.enum([
    LeaveCycleBasis.HIRE_ANNIVERSARY,
    LeaveCycleBasis.CALENDAR_YEAR,
    LeaveCycleBasis.CALENDAR_MONTH,
  ]),
  quotaMode: z.enum([LeaveQuotaMode.QUOTA, LeaveQuotaMode.UNLIMITED]),
  annualDays: z.number().min(0).max(366).nullable().default(null),
  unitBasis: z.enum([
    LeaveUnitBasis.FIXED_MINUTES,
    LeaveUnitBasis.HALF_WORKDAY,
    LeaveUnitBasis.FULL_WORKDAY,
  ]),
  minimumUnitMinutes: z
    .number()
    .int()
    .min(1)
    .max(1440)
    .nullable()
    .default(null),
  roundingMode: z.enum([LeaveRoundingMode.UP, LeaveRoundingMode.NEAREST]),
  /** Info: (20260818 - Julian) 比例給假的小數位數。0–4 位，超過已經沒有實務意義 */
  proratedRoundingScale: z.number().int().min(0).max(4).default(1),
  carryForwardMonths: z.number().int().min(0).max(120).default(0),
  cashOutOnExpiry: z.boolean().default(false),
  /** Info: (20260818 - Julian) 工資照給 = 1、折半 = 0.5、不給 = 0；條件式給付者為 null */
  paidRatio: z.number().min(0).max(1).nullable().default(null),
  proofRequirement: z.enum([
    LeaveProofRequirement.NONE,
    LeaveProofRequirement.OPTIONAL,
    LeaveProofRequirement.REQUIRED_OVER_THRESHOLD,
  ]),
  proofThresholdDays: z.number().min(0).max(366).nullable().default(null),
  employerMayReject: z.boolean(),
  recallable: z.boolean(),
  mergesIntoPolicyId: z.string().min(1).nullable().default(null),
  legalBasis: z.string().trim().max(200).nullable().default(null),
});

// Info: (20260818 - Julian) 級距表的一列。階梯本身的規則（遞增、不重複）在不變式，不在這裡
export const leaveAccrualTierSchema = z.object({
  minSeniorityMonths: z.number().int().min(0).max(1200),
  days: z.number().positive().max(366),
  incrementDaysPerYear: z.number().positive().max(366).nullable().default(null),
  maxDays: z.number().positive().max(366).nullable().default(null),
});

/**
 * Info: (20260818 - Julian) 級距表全量取代（L6）。
 *
 * 至少一列：`SENIORITY_TIER` 的假別配一張空表，效果是每個人的額度都是零，
 * 而畫面上看起來設定完成了。上限 20 列 —— §38 I 的法定級距是 6 級，
 * 留餘裕給優於法定的公司規定，但不留到可以貼進一份試算表。
 */
export const leaveAccrualTierTableSchema = z.object({
  tiers: z.array(leaveAccrualTierSchema).min(1).max(20),
});

export type ILeavePolicyWritePayload = z.infer<typeof leavePolicyWriteSchema>;
export type ILeaveAccrualTierPayload = z.infer<typeof leaveAccrualTierSchema>;
export type ILeaveAccrualTierTablePayload = z.infer<
  typeof leaveAccrualTierTableSchema
>;
