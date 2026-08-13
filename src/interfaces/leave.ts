import { LeaveRecallStatus, LeaveType } from "@/constants/leave";

/**
 * Info: (20260813 - Julian) 假勤 API 的回應型別。
 *
 * 一律是**扁平的顯示用 DTO**，不是 Prisma 實體：`LeaveDay → LeaveRequest → Employee`
 * 三層巢狀對前端沒有任何價值，而把實體直接回傳出去，等於讓 API 的形狀
 * 跟著資料表一起漂移 —— 那正是 `IAttendanceRosterRow` 當初不用 `Employee` 的理由。
 */

/** Info: (20260813 - Julian) 今日請假名單的一列 */
export interface ILeaveTodayEntry {
  leaveDayId: string;
  workDate: string;
  employeeId: string;
  employeeNo: string;
  name: string;
  departmentName: string | null;
  jobTitle: string | null;
  leaveType: LeaveType;
  reason: string;
  /**
   * Info: (20260813 - Julian) 是否已經有一張待回應的徵詢。
   *
   * 前端據此把按鈕換成「徵詢中」而不是讓人再按一次 ——
   * 讓他按下去再回 409，等於用錯誤訊息當說明文字。
   */
  hasPendingRecall: boolean;
}

export interface ILeaveTodayView {
  workDate: string;
  timeZone: string;
  entries: ILeaveTodayEntry[];
  /** Info: (20260813 - Julian) 呼叫者是否為主管；決定前端顯不顯示徵詢入口 */
  canRequestRecall: boolean;
}

/** Info: (20260813 - Julian) 一張銷假徵詢（主管端與員工端共用同一個形狀） */
export interface ILeaveRecallView {
  recallId: string;
  leaveDayId: string;
  workDate: string;
  status: LeaveRecallStatus;
  reason: string;
  responseNote: string | null;
  respondedAt: string | null;
  createdAt: string;
  /** Info: (20260813 - Julian) 被徵詢的員工 */
  employeeId: string;
  employeeNo: string;
  employeeName: string;
  leaveType: LeaveType;
  /** Info: (20260813 - Julian) 發起人。員工端要看到「是誰要求我回來」 */
  requestedByEmployeeNo: string;
  requestedByName: string;
  /** Info: (20260813 - Julian) 要回來上的那一班 */
  shiftPatternId: string;
  shiftName: string;
}
