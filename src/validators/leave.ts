import { z } from "zod";
import {
  LeaveRecallDecision,
  LEAVE_RECALL_NOTE_MAX_LENGTH,
  LEAVE_RECALL_REASON_MAX_LENGTH,
} from "@/constants/leave";
import { isoDateSchema } from "@/validators/attendance";

/**
 * Info: (20260813 - Julian) 今日請假名單的查詢。
 *
 * `date` 可省略（預設今天）。**不開放區間** —— 這支端點服務的是
 * 「現在人手夠不夠」，而那個問題只問今天。要看歷史請假走出勤總覽。
 */
export const leaveTodayQuerySchema = z.object({
  date: isoDateSchema.optional(),
});

/**
 * Info: (20260813 - Julian) 發起銷假徵詢。
 *
 * 對象是 `leaveDayId` 而不是 `leaveRequestId`：缺人是逐日的問題，
 * 一次徵詢一天，員工因此可以只同意其中一天（計畫書 §8.10）。
 *
 * `reason` 非空且必須去除空白後仍有內容 —— 它是「企業經營上之急迫需求」的
 * 書面記載，一個空白字元不是理由。
 */
export const leaveRecallCreateSchema = z.object({
  leaveDayId: z.string().min(1),
  /**
   * Info: (20260813 - Julian) 要他回來上哪一班。必填。
   *
   * 「請你回來上班」不是一個完整的請求 —— 員工同意的必須是一個具體的班別。
   * 它同時讓「同意之後那天沒有班別」不可表示：投影回排班時
   * `dayType = WORK` 與 `shiftPatternId` 一起寫入，`assertSchedulableDay` 因此永遠成立。
   */
  shiftPatternId: z.string().min(1),
  reason: z.string().trim().min(1).max(LEAVE_RECALL_REASON_MAX_LENGTH),
});

/**
 * Info: (20260813 - Julian) 員工回應徵詢。
 *
 * `note` 對婉拒特別有意義（「當天人在南部」），但不強制 ——
 * 強制填寫理由才能拒絕，本身就是一種壓力。
 */
export const leaveRecallRespondSchema = z.object({
  decision: z.enum([LeaveRecallDecision.ACCEPT, LeaveRecallDecision.DECLINE]),
  note: z.string().trim().max(LEAVE_RECALL_NOTE_MAX_LENGTH).optional(),
});

export type ILeaveTodayQuery = z.infer<typeof leaveTodayQuerySchema>;
export type ILeaveRecallCreate = z.infer<typeof leaveRecallCreateSchema>;
export type ILeaveRecallRespond = z.infer<typeof leaveRecallRespondSchema>;
