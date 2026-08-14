import { PresenceStatus, PunchType } from "@/constants/attendance";
import { IPunchSnapshot, IShiftWindow } from "@/interfaces/attendance";

/**
 * Info: (20260813 - Julian) 由打卡紀錄推導現場在班狀態。純函數，不碰資料庫也不取現在時間。
 * 正式版會落地為 `AttendancePresence` 快取的 rebuild 邏輯（母文件 §D10.1），此處是快取的正當性來源。
 *
 * `STALE` 的語意是「系統不知道」，不是「他不在」：忘記打下班卡的人可能仍在現場，
 * 不可移出名單，也不可顯示成「不在」（母文件 §D10.4）。
 */

// Info: (20260813 - Julian) 一筆打卡在推導在班狀態時需要的欄位；比 `IPunchSnapshot` 多一個地點
export interface IPresencePunch extends IPunchSnapshot {
  workLocationId: string;
}

export interface IPresenceDayInput {
  workDate: string;
  punches: IPresencePunch[];
  /** Info: (20260813 - Julian) 該工作日的班別；無排班時為 null */
  shift: IShiftWindow | null;
  /** Info: (20260813 - Julian) 「現在」相對於本工作日當地 00:00 的分鐘數，由呼叫端注入 */
  nowMinuteOfDay: number;
}

export interface IOpenSession {
  workDate: string;
  sinceMinute: number;
  workLocationId: string;
  status: PresenceStatus;
}

/**
 * Info: (20260813 - Julian) 這一天結束時，是否還有一段沒有關掉的上班。
 * 依時刻排序逐筆走：CLOCK_IN 開一段、CLOCK_OUT 關掉；走完仍開著的就是在班中的那一段。
 * 一天多次進出時取最後一次進場的時刻與地點。
 */
export function findOpenSession(
  punches: IPresencePunch[],
): { sinceMinute: number; workLocationId: string } | null {
  const ordered = [...punches].sort((a, b) => a.minuteOfDay - b.minuteOfDay);

  let open: { sinceMinute: number; workLocationId: string } | null = null;
  for (const punch of ordered) {
    if (punch.punchType === PunchType.CLOCK_IN) {
      open = {
        sinceMinute: punch.minuteOfDay,
        workLocationId: punch.workLocationId,
      };
    } else {
      open = null;
    }
  }
  return open;
}

/**
 * Info: (20260813 - Julian) 在班與「系統不知道」的分界：`班別窗迄 + staleGraceMinutes`。
 * 緩衝避免準時下班、走到門口才打卡的人被閃一下黃燈（母文件 §D10.3）。
 * 無排班時以整個日曆日為窗，等到換日才判定。
 */
export function isPresenceStale(params: {
  nowMinuteOfDay: number;
  shift: IShiftWindow | null;
  staleGraceMinutes: number;
  minutesPerDay: number;
}): boolean {
  const { nowMinuteOfDay, shift, staleGraceMinutes, minutesPerDay } = params;
  const windowEnd = shift ? shift.windowEndMinute : minutesPerDay;
  return nowMinuteOfDay > windowEnd + staleGraceMinutes;
}

/**
 * Info: (20260813 - Julian) 一位員工現在的在班狀態。**候選工作日須由新到舊傳入。**
 * 需要看昨天：跨夜班的打卡 `workDate` 記在昨天，只看今天會讓仍在現場的夜班人數顯示為零。
 * 取「最近一個有打卡紀錄」的工作日決定狀態，而非「第一個未關閉的段落」——
 * 否則今天已正常下班的人，會被昨天忘記關閉的夜班段落誤判成還在現場。
 */
export function resolvePresence(
  days: IPresenceDayInput[],
  policy: { staleGraceMinutes: number; minutesPerDay: number },
): IOpenSession | null {
  for (const day of days) {
    if (day.punches.length === 0) continue;

    const open = findOpenSession(day.punches);
    // Info: (20260813 - Julian) 這一天有紀錄但已收工 —— 不必再往前找，人已經走了
    if (!open) return null;

    return {
      workDate: day.workDate,
      sinceMinute: open.sinceMinute,
      workLocationId: open.workLocationId,
      status: isPresenceStale({
        nowMinuteOfDay: day.nowMinuteOfDay,
        shift: day.shift,
        staleGraceMinutes: policy.staleGraceMinutes,
        minutesPerDay: policy.minutesPerDay,
      })
        ? PresenceStatus.STALE
        : PresenceStatus.ON_SITE,
    };
  }

  return null;
}

/**
 * Info: (20260813 - Julian) 排了上班日、時間到了卻沒有任何打卡。
 * 門檻取「核心起 + 遲到寬限」而不是「窗起」：彈性班的窗起可能早於核心起許多，
 * 用窗起當門檻會把彈性班同仁的正當彈性全部誤判為未到工。
 */
export function isExpectedAbsent(params: {
  nowMinuteOfDay: number;
  shift: IShiftWindow;
  lateGraceMinutes: number;
  hasAnyPunch: boolean;
}): boolean {
  const { nowMinuteOfDay, shift, lateGraceMinutes, hasAnyPunch } = params;
  if (hasAnyPunch) return false;
  return nowMinuteOfDay > shift.coreStartMinute + lateGraceMinutes;
}
