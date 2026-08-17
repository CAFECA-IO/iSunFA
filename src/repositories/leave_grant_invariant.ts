/**
 * Info: (20260817 - Julian) 額度批次的「來源與內容必須對得上」不變式。
 *
 * ## 這條規則守的是什麼
 *
 * `LeaveGrant` 用單表承載四種來源（年資、遞延、加班換補休、人工調整），
 * 其中只有 `OVERTIME_CONVERSION` 掛得住 `overtimeSegmentId`。這與
 * `ProcessTask` 靠 `taskType` + 兩個可選外鍵的結構是同型的 ——
 * ADR 019 選擇拆表，這裡選擇不拆，理由在 ADR 022 §5.2：
 * 拆表會讓 `allocateConsumption`、勾稽 Worker、重建函式各寫兩套，
 * 而它們的邏輯完全相同。**不拆的代價就是這個檔案。**
 *
 * ## 為什麼 1:1 要用結構保證而不是寫在註解裡
 *
 * 勞基法 §32-1 是「依勞工工作之時數計算補休時數」—— 加班一小時換補休一小時，
 * **不乘加成倍率**。直覺會想「加班 1 小時、加給 1/3、所以補休 1.33 小時」，
 * 而那個直覺錯的方向是多給：表面上對勞工有利，實際上會在屆期折現時
 * 算出一個與法定標準不符的金額，兩邊都對不上。
 *
 * ## 為什麼要驗算 grantedMinutes
 *
 * ADR 022 §3.2 對外的承諾是「任何人事後都能驗算這 3360 分鐘是
 * 7 日 × 每日 480 分鐘來的」。那個承諾如果只寫在文件裡，
 * 第一支繞過引擎直接寫 `LeaveGrant` 的腳本就會讓它失效，
 * 而失效的症狀是一筆金額對不上的折現 —— 在薪資結算日才會被發現。
 *
 * ## 為什麼擋在 repository
 *
 * 高風險寫入路徑全部繞過 service：授予 Worker（每日重跑）、
 * 補休入帳（一次加班產生多筆）、金額調整腳本、資料遷移。
 */

import { LeaveGrantSource } from "@/constants/leave_policy";

export class LeaveGrantInvariantError extends Error {
  constructor(
    public readonly reason: string,
    detail: string,
  ) {
    super(`LeaveGrant: ${reason} (${detail})`);
    this.name = "LeaveGrantInvariantError";
  }
}

export interface IStorableLeaveGrant {
  source: LeaveGrantSource;
  grantedDays: number;
  dayEquivalentMinutes: number;
  grantedMinutes: number;
  /** Info: (20260817 - Julian) "YYYY-MM-DD" */
  cycleStartDate: string;
  cycleEndDate: string;
  expiresOn: string;
  overtimeSegmentId: string | null | undefined;
  /**
   * Info: (20260817 - Julian) 該加班分段的分鐘數。呼叫端在寫入補休批次時
   * 手上一定有它（就是它產生了這一批），傳進來才驗得了 1:1。
   * 非補休來源時為 undefined。
   */
  overtimeSegmentMinutes?: number | null;
  reason: string | null | undefined;
}

export function assertGrantSource(params: IStorableLeaveGrant): void {
  const isOvertimeConversion =
    params.source === LeaveGrantSource.OVERTIME_CONVERSION;
  const hasSegment =
    params.overtimeSegmentId !== null &&
    params.overtimeSegmentId !== undefined;

  // Info: (20260817 - Julian) 雙向：補休必掛分段，掛了分段的必是補休
  if (isOvertimeConversion && !hasSegment) {
    throw new LeaveGrantInvariantError(
      "an overtime-converted grant without a segment loses its premium tier; §32-1 cash-out would be uncomputable",
      `source=${params.source}, overtimeSegmentId=${params.overtimeSegmentId}`,
    );
  }
  if (!isOvertimeConversion && hasSegment) {
    throw new LeaveGrantInvariantError(
      "only OVERTIME_CONVERSION may reference an overtime segment",
      `source=${params.source}, overtimeSegmentId=${params.overtimeSegmentId}`,
    );
  }

  /**
   * Info: (20260817 - Julian) 補休換算固定 1:1（§32-1「依勞工工作之時數計算補休時數」）。
   * 這條若只寫在註解裡，第一個以為要乘倍率的人就會把它改壞。
   */
  if (isOvertimeConversion) {
    const segmentMinutes = params.overtimeSegmentMinutes;
    if (segmentMinutes === null || segmentMinutes === undefined) {
      throw new LeaveGrantInvariantError(
        "overtime-converted grants must carry the segment minutes so the 1:1 ratio can be verified",
        `overtimeSegmentId=${params.overtimeSegmentId}`,
      );
    }
    if (params.grantedMinutes !== segmentMinutes) {
      throw new LeaveGrantInvariantError(
        "compensatory leave is granted hour-for-hour (§32-1); the premium multiplier applies at cash-out, not at conversion",
        `grantedMinutes=${params.grantedMinutes}, segmentMinutes=${segmentMinutes}`,
      );
    }
  }

  /**
   * Info: (20260817 - Julian) 分鐘數必須能由法定面額與換算依據重算出來。
   *
   * 運算式與 `deriveGrantSchedule` 完全相同（`Math.ceil(days × dayEquivalent)`）——
   * 刻意用同一個式子而不是「差一分鐘以內就算對」：容忍值一旦引入，
   * 就會有人靠它塞進一個算錯但差不多的數字，而 ADR 022 §3.1
   * 對守恆式的整個論證建立在「零誤差」之上。
   */
  if (params.dayEquivalentMinutes <= 0) {
    throw new LeaveGrantInvariantError(
      "dayEquivalentMinutes must be positive; a zero-length day makes the grant unverifiable",
      `dayEquivalentMinutes=${params.dayEquivalentMinutes}`,
    );
  }
  const recomputed = Math.ceil(params.grantedDays * params.dayEquivalentMinutes);
  if (params.grantedMinutes !== recomputed) {
    throw new LeaveGrantInvariantError(
      "grantedMinutes does not follow from grantedDays x dayEquivalentMinutes; the audit trail would not reconcile",
      `grantedDays=${params.grantedDays}, dayEquivalentMinutes=${params.dayEquivalentMinutes}, grantedMinutes=${params.grantedMinutes}, expected=${recomputed}`,
    );
  }

  /**
   * Info: (20260817 - Julian) 人工調整必須說明理由。
   *
   * 與 `LeaveRequest.reason` 非空同一條理由：一筆沒有理由的額度調整，
   * 事後沒有人能判斷它合不合理 —— 而人工調整正是最需要被判斷的那一種。
   */
  if (
    params.source === LeaveGrantSource.MANUAL_ADJUSTMENT &&
    (params.reason === null ||
      params.reason === undefined ||
      params.reason.trim() === "")
  ) {
    throw new LeaveGrantInvariantError(
      "a manual adjustment without a reason cannot be judged after the fact",
      `source=${params.source}, reason=${params.reason}`,
    );
  }

  // Info: (20260817 - Julian) 週期不得反向
  if (params.cycleEndDate < params.cycleStartDate) {
    throw new LeaveGrantInvariantError(
      "cycle ends before it starts",
      `cycleStartDate=${params.cycleStartDate}, cycleEndDate=${params.cycleEndDate}`,
    );
  }

  /**
   * Info: (20260817 - Julian) 到期日不得早於週期結束日。
   *
   * `expiresOn` 是 FIFO 扣減的唯一排序鍵（ADR 022 §4）。一筆在週期還沒結束
   * 就已到期的批次，會被排到所有批次的最前面而優先扣光 ——
   * 使用者看到的症狀是「今年的特休先被扣完、去年遞延的還在」，
   * 剛好與制度要的順序相反。
   */
  if (params.expiresOn < params.cycleEndDate) {
    throw new LeaveGrantInvariantError(
      "expiresOn precedes the end of its own cycle; FIFO would consume this batch before batches that expire earlier in reality",
      `cycleEndDate=${params.cycleEndDate}, expiresOn=${params.expiresOn}`,
    );
  }
}
