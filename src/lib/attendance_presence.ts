import { PresenceStatus, PunchType } from "@/constants/attendance";
import { IPunchSnapshot, IShiftWindow } from "@/interfaces/attendance";

/**
 * Info: (20260813 - Julian) 由打卡紀錄推導現場在班狀態。純函數，不碰資料庫也不取現在時間。
 *
 * ## 這段程式碼在正式版也還在
 *
 * 母文件 §D10.1 決定落地 `AttendancePresence` 快取，理由是 O(1) 讀。
 * 但它同時要求一支 `rebuildPresence()` —— **「這支函數是那張表的正當性來源：
 * 一張無法從真相重建的快取，就是第二個真相。」** 這裡寫的就是那支函數的內容。
 * Demo 只是省掉了快取，直接呼叫它。
 *
 * ## `STALE` 的語意是「我不知道」，不是「他不在」
 *
 * 忘記打下班卡的人**很可能真的還在現場**（尤其加班時），
 * 因此不能移出名單，只能標記成「系統不知道」。這些人恰恰是緊急點名時
 * 要優先打電話確認的對象 —— **把「不確定」顯示成「不在」，
 * 是這類系統最危險的失真**（母文件 §D10.4）。
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
 *
 * 依時刻排序後逐筆走：`CLOCK_IN` 開一段、`CLOCK_OUT` 關掉目前那一段。
 * 走完仍開著的就是在班中的那一段。
 *
 * **不是「數 in 比 out 多」就好**：那個算法答得出「有沒有在班」，
 * 答不出「從幾點開始、在哪個地點」—— 而名單上要顯示的正是後兩者。
 * 一天多次進出（工地人員中途離場再回來）時，該顯示的是**最後那一次**進場。
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
 * Info: (20260813 - Julian) 在班與「系統不知道」的分界。
 *
 * `班別窗迄 + presenceStaleGraceMinutes`。緩衝存在的理由是：18:00 準時下班的人，
 * 走到門口掏出手機打卡可能已經 18:03 —— 沒有緩衝，**每一位正常下班的人
 * 都會先閃一下黃燈才消失**，而黃色一旦變成常態就沒人看了（母文件 §D10.3）。
 *
 * 無排班時退回以整個日曆日為窗。那是「這個人今天不該在這裡，但他確實打了卡」
 * 的情況 —— 沒有窗迄可比，唯一不會說謊的做法是等到換日。
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
 * Info: (20260813 - Julian) 一位員工現在的在班狀態。**候選工作日由新到舊傳入。**
 *
 * ## 為什麼要看昨天
 *
 * 夜間施工班 8/12 20:05 進場、8/13 05:00 收工 —— 那筆打卡的 `workDate` 是 8/12。
 * 只看今天的話，凌晨兩點的現場看板會顯示零人，而工地上正有一整班人在灌漿。
 *
 * ## 為什麼「最近一個有打卡的工作日」說了算
 *
 * 逐日由新到舊找第一個**有打卡紀錄**的工作日，用它決定狀態 ——
 * 而不是「找到第一個未關閉的段落」。差別在於：昨天的夜班忘了打下班卡、
 * 今天又正常上下班的人，後者會把他判成還在現場（昨天那段永遠開著），
 * 前者會正確地認定今天已經下班。**有比較新的紀錄，就以新的為準。**
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
 *
 * ## 為什麼門檻取「核心起 + 遲到寬限」而不是「窗起」
 *
 * 彈性班的窗起可能是 07:00，而核心起是 10:00 —— 以窗起為門檻，
 * 每天早上七點過後所有彈性班同仁都會被列成未到工，而那是他們正當的彈性。
 * 一個每天早上都在報警的數字，不會有人看第二次。
 *
 * 取「開始判遲到的那一刻」才是這個數字的意思：**系統開始認為這個人該到了。**
 * 固定班的窗＝核心，兩者本來就同一時刻，因此這個選擇只影響彈性班。
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
