import {
  AttendanceDayStatus,
  AttendanceExceptionType,
  PunchType,
  ShiftPatternKind,
  WorkDayType,
} from "@/constants/attendance";
import {
  IAttendanceDayInput,
  IAttendanceEvaluation,
  IAttendanceExceptionItem,
  IPunchSnapshot,
  IShiftWindow,
} from "@/interfaces/attendance";

/**
 * Info: (20260813 - Julian) 出勤判定引擎：純函數，無 DB／I/O，**不呼叫 `Date.now()`**——
 * 「現在」由呼叫端以 `nowMinuteOfDay` 注入，同輸入同輸出，可窮舉驗證。全程只認整數分鐘，
 * 時區換算是 service 層與 `attendance_time.ts` 的職責。
 *
 * 沒有 `switch(shiftType)`：固定班是彈性窗收縮至與核心重合的特例，四條規則同時覆蓋兩制度，
 * 詳見計畫書 §D1、§D7、§7.2。
 */

/**
 * Info: (20260813 - Julian) 規則引擎版本。判定邏輯或門檻語意改變時 +1，並重算受影響區間；
 * 純重構、輸出不變時不要動它，避免製造假訊號。
 */
export const ATTENDANCE_ENGINE_VERSION = 1;

/**
 * Info: (20260813 - Julian) 由班別的值推出它是哪一種制度。**這是衍生值，資料庫沒有對應欄位**，
 * 只供畫面標示用；判定引擎不需要也不會呼叫它。
 */
export function deriveShiftPatternKind(shift: IShiftWindow): ShiftPatternKind {
  const windowEqualsCore =
    shift.windowStartMinute === shift.coreStartMinute &&
    shift.windowEndMinute === shift.coreEndMinute;
  return windowEqualsCore ? ShiftPatternKind.FIXED : ShiftPatternKind.FLEXIBLE;
}

// Info: (20260813 - Julian) 取最早的上班打卡；沒有則 null
function findFirstClockIn(punches: IPunchSnapshot[]): number | null {
  const minutes = punches
    .filter((punch) => punch.punchType === PunchType.CLOCK_IN)
    .map((punch) => punch.minuteOfDay);
  return minutes.length > 0 ? Math.min(...minutes) : null;
}

// Info: (20260813 - Julian) 取最晚的下班打卡；沒有則 null
function findLastClockOut(punches: IPunchSnapshot[]): number | null {
  const minutes = punches
    .filter((punch) => punch.punchType === PunchType.CLOCK_OUT)
    .map((punch) => punch.minuteOfDay);
  return minutes.length > 0 ? Math.max(...minutes) : null;
}

function clampToWindow(minute: number, shift: IShiftWindow): number {
  return Math.min(
    Math.max(minute, shift.windowStartMinute),
    shift.windowEndMinute,
  );
}

interface IBuildParams {
  input: IAttendanceDayInput;
  status: AttendanceDayStatus;
  exceptions: IAttendanceExceptionItem[];
  workedMinutes: number;
  firstInMinute: number | null;
  lastOutMinute: number | null;
}

function buildEvaluation(params: IBuildParams): IAttendanceEvaluation {
  return {
    workDate: params.input.workDate,
    status: params.status,
    workedMinutes: params.workedMinutes,
    firstInMinute: params.firstInMinute,
    lastOutMinute: params.lastOutMinute,
    exceptions: params.exceptions,
    engineVersion: ATTENDANCE_ENGINE_VERSION,
  };
}

/**
 * Info: (20260813 - Julian) 判定單一員工單一工作日的出勤。判定順序即計畫書 §7.2 表格，
 * 由上而下第一個命中即決定狀態；#8–10（遲到／早退／工時不足）可同時成立，走累積而非提前返回。
 * #11 `SUSPICIOUS_JUMP`（瞬移偵測）不在此實作，屬打卡當下的護欄 G5，由 service 層判斷。
 */
export function evaluateAttendanceDay(
  input: IAttendanceDayInput,
): IAttendanceEvaluation {
  const { schedule, punches, policy, nowMinuteOfDay } = input;

  const firstIn = findFirstClockIn(punches);
  const lastOut = findLastClockOut(punches);

  const base = {
    input,
    exceptions: [] as IAttendanceExceptionItem[],
    workedMinutes: 0,
    firstInMinute: firstIn,
    lastOutMinute: lastOut,
  };

  /**
   * Info: (20260813 - Julian) 判定表 #3：完全沒有排班紀錄。**不判曠職**——沒有班表就沒有比較基準。
   */
  if (schedule === null) {
    return buildEvaluation({
      ...base,
      status: AttendanceDayStatus.NO_SCHEDULE,
    });
  }

  /**
   * Info: (20260813 - Julian) 判定表 #1 #2：非上班日。有打卡也不算異常（假日到工是加班事實）。
   * 工時不在此認列，時數換算屬薪資模組職責（母計畫 §5.3）。
   */
  if (schedule.dayType !== WorkDayType.WORK) {
    return buildEvaluation({ ...base, status: AttendanceDayStatus.OFF_DAY });
  }

  const { shift } = schedule;
  const windowEnded = nowMinuteOfDay > shift.windowEndMinute;

  /**
   * Info: (20260813 - Julian) 判定表 #4 #5：應出勤但完全沒有打卡。只有**當日窗迄已過**才判曠職，
   * 否則早班同仁每天早上都會收到誤判的曠職通知。
   */
  if (firstIn === null && lastOut === null) {
    if (!windowEnded) {
      return buildEvaluation({ ...base, status: AttendanceDayStatus.NORMAL });
    }
    return buildEvaluation({
      ...base,
      status: AttendanceDayStatus.EXCEPTION,
      exceptions: [{ type: AttendanceExceptionType.ABSENT, minutes: 0 }],
    });
  }

  // Info: (20260813 - Julian) 判定表 #6：有下班卡卻沒有上班卡，工時無從計算
  if (firstIn === null) {
    return buildEvaluation({
      ...base,
      status: AttendanceDayStatus.EXCEPTION,
      exceptions: [
        { type: AttendanceExceptionType.MISSING_CLOCK_IN, minutes: 0 },
      ],
    });
  }

  /**
   * Info: (20260813 - Julian) 判定表 #7：有上班卡沒有下班卡。窗迄加寬限之前不算異常（還在上班）。
   * 這個寬限刻意與現場狀態轉 `STALE` 的寬限分開：這裡服務工時計算寧可晚判，
   * 那裡服務安全寧可早一點承認不知道。
   */
  if (lastOut === null) {
    const missingOut =
      nowMinuteOfDay >
      shift.windowEndMinute + policy.missingClockOutGraceMinutes;
    if (!missingOut) {
      return buildEvaluation({ ...base, status: AttendanceDayStatus.NORMAL });
    }
    return buildEvaluation({
      ...base,
      status: AttendanceDayStatus.EXCEPTION,
      exceptions: [
        { type: AttendanceExceptionType.MISSING_CLOCK_OUT, minutes: 0 },
      ],
    });
  }

  /**
   * Info: (20260813 - Julian) 兩端都有打卡，開始算工時與判定表 #8–#10。
   * 打卡時間先夾進彈性窗內，早到不多算工時；夾完仍為負則取 0。
   */
  const inClamped = clampToWindow(firstIn, shift);
  const outClamped = clampToWindow(lastOut, shift);
  const workedMinutes = Math.max(
    0,
    outClamped - inClamped - shift.breakMinutes,
  );

  const exceptions: IAttendanceExceptionItem[] = [];

  // Info: (20260813 - Julian) #8 遲到。分鐘數以核心起算，寬限只決定「觸不觸發」
  if (firstIn > shift.coreStartMinute + policy.lateGraceMinutes) {
    exceptions.push({
      type: AttendanceExceptionType.LATE,
      minutes: firstIn - shift.coreStartMinute,
    });
  }

  // Info: (20260813 - Julian) #9 早退，語意對稱於遲到
  if (lastOut < shift.coreEndMinute - policy.earlyLeaveGraceMinutes) {
    exceptions.push({
      type: AttendanceExceptionType.EARLY_LEAVE,
      minutes: shift.coreEndMinute - lastOut,
    });
  }

  /**
   * Info: (20260813 - Julian) #10 工時不足——彈性工時真正要管的規則：核心時段內出勤但總時數不夠。
   * 固定班因窗＝核心，正常出勤時恆滿足。
   */
  if (workedMinutes < shift.requiredWorkMinutes) {
    exceptions.push({
      type: AttendanceExceptionType.INSUFFICIENT_HOURS,
      minutes: shift.requiredWorkMinutes - workedMinutes,
    });
  }

  // Info: (20260813 - Julian) #12 以上皆不成立即為正常
  return buildEvaluation({
    ...base,
    status:
      exceptions.length > 0
        ? AttendanceDayStatus.EXCEPTION
        : AttendanceDayStatus.NORMAL,
    exceptions,
    workedMinutes,
  });
}
