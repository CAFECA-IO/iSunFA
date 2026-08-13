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
 * Info: (20260813 - Julian) 出勤判定引擎。
 *
 * ## 這是一支純函數
 *
 * 無資料庫存取、無 I/O、**不呼叫 `Date.now()`**（「現在」由呼叫端以
 * `nowMinuteOfDay` 注入）。同一組輸入永遠得到同一組輸出，因此可重算、
 * 可回溯、可用表格窮舉驗證 —— 而窮舉正是決定論唯一的驗收方式。
 *
 * ## 為什麼不碰時區
 *
 * 引擎收到的全部是整數（當地當日 00:00 起算的分鐘數）。
 * 「`Date` → 當地分鐘數」的換算屬於 service 層，那裡才有帳本的時區設定，
 * 也才是 `hr_date.ts` 那些日光節約陷阱該被處理的地方。
 *
 * 把換算留在外面換到兩件事：引擎的測試不需要任何時區設定；
 * 而時區的測試（`npm run test:tz`）可以只針對換算函式，不必反覆跑整套判定。
 *
 * ## 為什麼沒有 `switch (shiftType)`
 *
 * 因為資料庫裡沒有那個欄位。固定班表是「彈性窗收縮到與核心時間重合」的
 * 彈性班表，因此下面四條規則同時覆蓋兩種制度：
 *
 * | 判定     | 規則                                  | 朝九晚六(固定)      | 核心 10–16(彈性)    |
 * |----------|---------------------------------------|---------------------|---------------------|
 * | 遲到     | `firstIn > coreStart + grace`         | 09:47 → 遲到 47 分  | 09:47 → 正常        |
 * | 早退     | `lastOut < coreEnd - grace`           | 17:30 → 早退 30 分  | 17:30 → 正常        |
 * | 工時不足 | `worked < requiredWorkMinutes`        | 恆滿足即無異常      | 10:00–16:00 → 不足  |
 * | 窗外時間 | 打卡先 clamp 進 `[windowStart, End]`  | 08:00 到班不多算    | 06:00 到班不多算    |
 *
 * 要加第三種工時制度時，改的是 `ShiftPattern` 那六個欄位的值，不是這個檔案。
 *
 * ## 相關文件
 *
 * `documents/architecture/time_attendance_module_plan.md` §D1（統一班別模型）、
 * §D7（純函數）、§7.2（判定表）；`attendance_demo_plan.md` §6。
 */

/**
 * Info: (20260813 - Julian) 規則引擎版本。
 *
 * 判定邏輯或門檻語意改變時 +1，並重算受影響的區間。
 * 只是重構、輸出不變時**不要**動它 —— 版本號的用途是解釋
 * 「同樣的打卡為什麼今年判得不一樣」，改了卻沒有差異只會製造假訊號。
 */
export const ATTENDANCE_ENGINE_VERSION = 1;

/**
 * Info: (20260813 - Julian) 由班別的值推出它是哪一種制度。
 *
 * **這是衍生值，資料庫沒有對應欄位**（見 `ShiftPatternKind` 的說明）。
 * 供畫面標示用；判定引擎自己不呼叫它，因為判定根本不需要知道制度是哪一種。
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
 * Info: (20260813 - Julian) 判定單一員工單一工作日的出勤。
 *
 * 判定順序即計畫書 §7.2 的表格，由上而下第一個命中即決定狀態。
 * 第 8–10 條（遲到／早退／工時不足）**可同時成立**，因此走的是累積而非提前返回。
 *
 * 第 11 條 `SUSPICIOUS_JUMP`（瞬移偵測）不在此實作：它需要跨日的前一筆打卡，
 * 屬於打卡當下的護欄（G5）而不是當日的比對，由 service 層在寫入時判斷。
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
   * Info: (20260813 - Julian) 判定表 #3：完全沒有排班紀錄。
   *
   * **不判曠職。** 判曠職等於系統自己發明了一個不存在的出勤義務 ——
   * 沒有班表就沒有比較基準，這是「零捏造」在本模組的具體形狀。
   */
  if (schedule === null) {
    return buildEvaluation({
      ...base,
      status: AttendanceDayStatus.NO_SCHEDULE,
    });
  }

  /**
   * Info: (20260813 - Julian) 判定表 #1 #2：非上班日。
   *
   * 有打卡也不算異常 —— 假日到工是**加班事實**不是異常，標紅會讓真正的
   * 異常被淹沒。工時不在此認列：假日出勤的時數認定屬加班規則，
   * 而加班費與時數換算是薪資模組的職責（母計畫 §5.3 的跨模組邊界）。
   */
  if (schedule.dayType !== WorkDayType.WORK) {
    return buildEvaluation({ ...base, status: AttendanceDayStatus.OFF_DAY });
  }

  const { shift } = schedule;
  const windowEnded = nowMinuteOfDay > shift.windowEndMinute;

  /**
   * Info: (20260813 - Julian) 判定表 #4 #5：應出勤但完全沒有打卡。
   *
   * 只有在**當日窗迄已過**之後才判曠職。提早下結論會讓早班同仁
   * 每天早上都收到一封曠職通知 —— 判定的前提是「這一天已經過完」。
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
   * Info: (20260813 - Julian) 判定表 #7：有上班卡沒有下班卡。
   *
   * 窗迄加寬限之前不算異常 —— 那是「還在上班」，不是「漏打卡」。
   * 這個寬限與現場狀態轉 `STALE` 的寬限刻意分開（見 constants 的說明）：
   * 這裡服務於工時計算，寧可晚一點判；那裡服務於安全，寧可早一點承認不知道。
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
   *
   * 打卡時間先夾進彈性窗內：08:00 到班的固定班（窗起 09:00）不因早到而
   * 多算工時，也不因此被判成任何異常。夾完仍為負則取 0（不產生負工時）。
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
   * Info: (20260813 - Julian) #10 工時不足。
   *
   * 這條是彈性工時真正要管的東西：核心 10–16 的人 10:00 進、16:00 出，
   * 既不遲到也不早退，但總時數不夠。固定班因為窗＝核心，正常出勤時恆滿足。
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
