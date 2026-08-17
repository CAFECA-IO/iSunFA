/**
 * Info: (20260817 - Julian) 加班單的「填法必須與時序、與狀態一致」不變式。
 *
 * ## 為什麼事前／事後不拆表
 *
 * `ADVANCE` 與 `POST_HOC` 的欄位完全相同，差別只在送出時點與工作日的先後
 * （ADR 024 §3）。拆表不會讓非法狀態變少，只會讓「我的加班單」要查兩張表
 * 再合併排序 —— 那正是 ADR 019 自己列出的代價。**不拆的代價就是這個檔案。**
 *
 * ## 「事前申請卻在下班後才送出」不是一種可選的填法，是一個謊
 *
 * 而且是一個有動機的謊：事後補單在勞動檢查時的證據力低於事前申請，
 * 因此把事後補的單標成事前申請，對填單的人是有利的。這種欄位不能只靠自律。
 *
 * ## 時區換算不在這裡
 *
 * 呼叫端傳入的是兩個**絕對時點**（epoch 毫秒）：送出時刻，與該工作日
 * 班別窗起的時刻。把政策時區的換算留在 service（`attendance_time.ts` 的職責），
 * 這裡只做比較 —— 一個會自己做時區換算的不變式，在夏令時間邊界上會有
 * 自己的一套錯誤，而那與它要守的規則無關。
 */

import {
  OvertimeFilingType,
  OvertimeRequestStatus,
} from "@/constants/overtime";

export class OvertimeRequestInvariantError extends Error {
  constructor(
    public readonly reason: string,
    detail: string,
  ) {
    super(`OvertimeRequest: ${reason} (${detail})`);
    this.name = "OvertimeRequestInvariantError";
  }
}

export interface IStorableOvertimeRequest {
  filingType: OvertimeFilingType;
  status: OvertimeRequestStatus;
  /** Info: (20260817 - Julian) 送出時刻（epoch ms）。由 service 提供，不在此取 Date.now() */
  submittedAtMs: number;
  /** Info: (20260817 - Julian) 該工作日班別窗起的絕對時點（epoch ms），由 service 依政策時區解出 */
  shiftWindowStartMs: number;
  /** Info: (20260817 - Julian) 當日 00:00 起算的分鐘數，>= 1440 表次日 */
  requestedStartMinute: number;
  requestedEndMinute: number;
  approvedMinutes: number | null | undefined;
  recognizedMinutes: number | null | undefined;
}

export function assertOvertimeFilingType(
  params: IStorableOvertimeRequest,
): void {
  // Info: (20260817 - Julian) 區間不得反向或為零長度
  if (params.requestedEndMinute <= params.requestedStartMinute) {
    throw new OvertimeRequestInvariantError(
      "the requested overtime window must span forward",
      `start=${params.requestedStartMinute}, end=${params.requestedEndMinute}`,
    );
  }

  if (
    params.filingType === OvertimeFilingType.ADVANCE &&
    params.submittedAtMs >= params.shiftWindowStartMs
  ) {
    throw new OvertimeRequestInvariantError(
      "filed as ADVANCE but submitted after the shift window opened; after-the-fact filings carry less weight in an inspection and must not be relabelled",
      `submittedAtMs=${params.submittedAtMs}, shiftWindowStartMs=${params.shiftWindowStartMs}`,
    );
  }

  /**
   * Info: (20260817 - Julian) 反方向也擋。
   *
   * 這個方向沒有「對填單者有利」的動機，擋它的理由不同：`POST_HOC` 會在
   * 統計端點被單獨計數（勞動檢查會問事後補單的比例），一張其實是事前送出、
   * 卻被標成事後補單的單子，會讓那個比例失真 —— 而失真的方向是把公司
   * 說得比實際更糟，沒有人會去更正它。
   */
  if (
    params.filingType === OvertimeFilingType.POST_HOC &&
    params.submittedAtMs < params.shiftWindowStartMs
  ) {
    throw new OvertimeRequestInvariantError(
      "filed as POST_HOC but submitted before the shift window opened; the after-the-fact ratio reported to inspectors would be wrong",
      `submittedAtMs=${params.submittedAtMs}, shiftWindowStartMs=${params.shiftWindowStartMs}`,
    );
  }

  const hasApproved =
    params.approvedMinutes !== null && params.approvedMinutes !== undefined;
  const hasRecognized =
    params.recognizedMinutes !== null && params.recognizedMinutes !== undefined;

  /**
   * Info: (20260817 - Julian) 已核准的加班單必須說得出核准與認列各是幾分鐘。
   *
   * 一張標著 APPROVED 卻沒有 `approvedMinutes` 的單子，在「本月加班時數」
   * 的加總裡會被當成 0 —— 它出現在清單上、看起來已經核准，但一分鐘都不算。
   * 那是最難查的一種錯：畫面與數字各自都沒有異常。
   */
  if (params.status === OvertimeRequestStatus.APPROVED) {
    if (!hasApproved || !hasRecognized) {
      throw new OvertimeRequestInvariantError(
        "an approved request must state both approved and recognized minutes; otherwise it silently counts as zero in every total",
        `status=${params.status}, approvedMinutes=${params.approvedMinutes}, recognizedMinutes=${params.recognizedMinutes}`,
      );
    }
  } else if (hasApproved || hasRecognized) {
    /**
     * Info: (20260817 - Julian) 反方向：尚未核准（或已駁回／撤回）的單子不得帶著核准分鐘。
     * 駁回後留著核准分鐘，會讓「這張單曾經被核准過」看起來像事實。
     */
    throw new OvertimeRequestInvariantError(
      "only an approved request may carry approved or recognized minutes",
      `status=${params.status}, approvedMinutes=${params.approvedMinutes}, recognizedMinutes=${params.recognizedMinutes}`,
    );
  }

  /**
   * Info: (20260817 - Julian) 認列不得超過核准（ADR 024 §2：認列 = min(核准, 事實)）。
   *
   * 這條擋的是「主管核准 1 小時、系統卻認列 3 小時」——
   * 那 2 小時會一路變成補休或加班費，而沒有任何人核准過它。
   */
  if (
    hasApproved &&
    hasRecognized &&
    (params.recognizedMinutes as number) > (params.approvedMinutes as number)
  ) {
    throw new OvertimeRequestInvariantError(
      "recognized minutes exceed what was approved; recognition is min(approved, actual)",
      `approvedMinutes=${params.approvedMinutes}, recognizedMinutes=${params.recognizedMinutes}`,
    );
  }

  if (hasApproved && (params.approvedMinutes as number) < 0) {
    throw new OvertimeRequestInvariantError(
      "approvedMinutes must not be negative",
      `approvedMinutes=${params.approvedMinutes}`,
    );
  }
  if (hasRecognized && (params.recognizedMinutes as number) < 0) {
    throw new OvertimeRequestInvariantError(
      "recognizedMinutes must not be negative",
      `recognizedMinutes=${params.recognizedMinutes}`,
    );
  }
}
