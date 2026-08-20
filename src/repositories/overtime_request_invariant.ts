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
  OvertimePremiumTier,
  OvertimeRequestStatus,
} from "@/constants/overtime";
import type { IOvertimeSegment } from "@/interfaces/overtime";
import { isSafeHttpUrl } from "@/lib/utils/safe_url";

export class OvertimeRequestInvariantError extends Error {
  constructor(
    public readonly reason: string,
    detail: string,
  ) {
    super(`OvertimeRequest: ${reason} (${detail})`);
    this.name = "OvertimeRequestInvariantError";
  }
}

export interface IStorableOvertimeEmergency {
  isEmergency: boolean;
  emergencyReportUrl: string | null | undefined;
  emergencyReportedAt: Date | null | undefined;
  emergencyDeclaredByEmployeeId: string | null | undefined;
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

/**
 * Info: (20260819 - Julian) §32 IV 的「經報備」必須有記載（review B7）。
 *
 * ## 為什麼這一欄不能只靠自律
 *
 * `isEmergency` 為真的後果有兩個，而兩個都對填單的人有利：整段加班跳到
 * `EMERGENCY_DOUBLE`（加倍發給），且它曾經還會繞過例假日的閘門。
 * 原本它是**申請人在送出時自填的一個布林值** —— 沒有佐證欄位、
 * 沒有 HR 覆核、沒有主管機關報備紀錄。計畫書 §8.3 自己寫下了這件事：
 * 「程式已經假設報備發生過，但系統裡沒有任何地方記錄它。」
 *
 * ## 標準與 54 小時放寬一致
 *
 * `assertOvertimePolicy` 對 §32 III 立的標準是「**一個沒有記載的『已同意』
 * 等於沒有同意**，而系統會據此多放 8 小時」。這裡的結構完全相同，
 * 代價更大：放寬是多 8 小時的額度，加倍發給是整段工資的計算標準。
 * 兩者用同一把尺，否則先鬆的那一邊會被當成先例。
 *
 * ## 為什麼反方向也要擋
 *
 * 一筆帶著報備紀錄卻沒有 `isEmergency` 的單子，事後分不出來是
 * 「認定被撤回了」還是「認定漏掉了」—— 而前者應該留下撤回的痕跡，
 * 不是把旗標翻回去就算了。留著半套資料等於留下一個講兩種故事的紀錄。
 */
export function assertOvertimeEmergencyRecord(
  params: IStorableOvertimeEmergency,
): void {
  const url = params.emergencyReportUrl;
  const reportedAt = params.emergencyReportedAt;
  const declaredBy = params.emergencyDeclaredByEmployeeId;

  const hasUrl = url !== null && url !== undefined && url.trim() !== "";
  const hasReportedAt = reportedAt !== null && reportedAt !== undefined;
  const hasDeclaredBy =
    declaredBy !== null && declaredBy !== undefined && declaredBy.trim() !== "";

  if (params.isEmergency) {
    if (!hasUrl) {
      throw new OvertimeRequestInvariantError(
        "an emergency overtime (Article 32 IV) requires a recorded filing with the union or the local authority; an unrecorded claim doubles the entire premium on nobody's authority",
        `emergencyReportUrl=${url}`,
      );
    }
    /**
     * Info: (20260820 - Julian) 記載要**點得進去**（review 第 1 條）。
     *
     * 只要求非空的話，`N/A` 就通得過 —— 而
     * `OVERTIME_EMERGENCY_REPORT_URL_MAX_LENGTH` 的註解自己寫著
     * 「一個填了 `N/A` 的必填欄位，比沒有這個欄位更糟：它看起來像有記載」。
     * B7 把這一欄從自填布林值改成強制記載，要的正是「不再有看起來像記載的狀態」，
     * 而一個不是連結的字串把那個狀態原封不動地搬了回來。
     *
     * 協定白名單而不只是「像不像 URL」：這一欄會直接進 `<a href={...}>`，
     * 而 `new URL()`（zod `.url()` 的實作）認得 `javascript:` 與 `data:`。
     */
    if (!isSafeHttpUrl((url as string).trim())) {
      throw new OvertimeRequestInvariantError(
        "the Article 32 IV filing must be an http(s) link that can actually be opened; a placeholder like N/A reads as a record while pointing at nothing, and a javascript: value would reach the anchor that renders it",
        `emergencyReportUrl=${url}`,
      );
    }
    if (!hasReportedAt) {
      throw new OvertimeRequestInvariantError(
        "the emergency filing must carry the moment it was made; Article 32 IV allows twenty-four hours and an inspection asks for that timestamp",
        `emergencyReportedAt=${String(reportedAt)}`,
      );
    }
    if (!hasDeclaredBy) {
      throw new OvertimeRequestInvariantError(
        "the emergency determination must name the HR administrator who made it; the applicant may not certify their own premium",
        `emergencyDeclaredByEmployeeId=${declaredBy}`,
      );
    }
    return;
  }

  if (hasUrl || hasReportedAt || hasDeclaredBy) {
    throw new OvertimeRequestInvariantError(
      "a request that is not an emergency must not carry an emergency filing; half a record cannot be read as either withdrawn or forgotten",
      `emergencyReportUrl=${url}, emergencyReportedAt=${String(reportedAt)}, emergencyDeclaredByEmployeeId=${declaredBy}`,
    );
  }
}

export interface IStorableOvertimeSegmentSet {
  isEmergency: boolean;
  segments: readonly IOvertimeSegment[];
}

/**
 * Info: (20260820 - Julian) 旗標與級距必須講同一個故事（review 第 3 條）。
 *
 * ## 這條守的是什麼
 *
 * `deriveOvertimeSegments` 的判定表 #2 是「`isEmergency` 為真 ⇒ 整段一筆
 * `EMERGENCY_DOUBLE`，不切級距」。那是一個**雙向**的對應，而它原本只活在
 * 那支純函式裡 —— 只要有人不是從那支函式拿到分段（核准的交錯、資料遷移、
 * 手動補資料），這張表就能同時存著「已依 §32 IV 報備」與「按平日前兩小時
 * 加給三分之一計算」的兩筆紀錄，而它們不可能同時為真。
 *
 * ## 為什麼兩個方向的代價不對稱，但兩個方向都要擋
 *
 * `isEmergency` 為真卻是普通級距：報備做了、工資少算 —— 對勞工不利，
 * 而勞檢時那份報備紀錄會證明公司知道該加倍發給。
 *
 * 普通旗標卻掛著 `EMERGENCY_DOUBLE`：加倍發給了，而系統裡**沒有任何一份
 * §32 IV 的報備紀錄**（那三個欄位由 `assertOvertimeEmergencyRecord` 綁在
 * `isEmergency` 上）。這是錢已經出去、佐證答不出來的那一種。
 *
 * ## 為什麼不在這裡驗分鐘總數
 *
 * 分段的分鐘合計等於 `recognizedMinutes` 是另一條規則，
 * 由 `assertOvertimeFilingType` 那一側的認列分鐘負責。一條不變式驗兩件事，
 * 壞掉的時候讀者分不出是哪一件壞了。
 */
export function assertOvertimeSegmentPremium(
  params: IStorableOvertimeSegmentSet,
): void {
  /**
   * Info: (20260820 - Julian) 認列 0 分鐘時沒有分段（service 的 `recognizedMinutes === 0`
   * 分支）。那不是矛盾 —— 一張核准 0 分鐘的單子沒有任何工資標準要決定。
   */
  if (params.segments.length === 0) return;

  const emergencyCount = params.segments.filter(
    (segment) => segment.tier === OvertimePremiumTier.EMERGENCY_DOUBLE,
  ).length;

  if (params.isEmergency) {
    if (params.segments.length !== 1 || emergencyCount !== 1) {
      throw new OvertimeRequestInvariantError(
        "an Article 32 IV emergency is paid double for its whole span; segments computed on the ordinary tiers contradict the filing this request carries",
        `isEmergency=true, tiers=[${params.segments.map((s) => s.tier).join(", ")}]`,
      );
    }
    return;
  }

  if (emergencyCount > 0) {
    throw new OvertimeRequestInvariantError(
      "a segment may not be paid at the emergency double rate unless the request carries the Article 32 IV filing; the premium would be doubled with no record to show an inspection",
      `isEmergency=false, tiers=[${params.segments.map((s) => s.tier).join(", ")}]`,
    );
  }
}

export interface IStorableEmergencyDeclaration {
  reportUrl: string;
  reportedAt: Date;
  declaredByEmployeeId: string;
  revokedAt: Date | null | undefined;
  revokedByEmployeeId: string | null | undefined;
  revokeReason: string | null | undefined;
}

/**
 * Info: (20260820 - Julian) 認定歷史列的「撤回三欄同生共死」（review 第 3 輪第 2 條）。
 *
 * ## 為什麼撤回要留列而不是把欄位清空
 *
 * `assertOvertimeEmergencyRecord` 的反方向（沒有 `isEmergency` 就不得帶記載）
 * 是對的 —— 半套資料讀不出是撤回還是漏填。但它逼出的動作是**把三欄一起
 * 設成 null**，而那等於硬刪一份對外發生過的紀錄：公司真的通知過工會、
 * 真的報過主管機關，那件事不會因為欄位變成 null 而沒有發生過。
 * 那條不變式的註解自己寫下了正解：「前者**應該留下撤回的痕跡**」——
 * 這張表就是那個痕跡，而這一支是它的把關。
 *
 * ## 為什麼理由必填
 *
 * 「報備被主管機關退回」與「當初認定錯了」的後續處置完全不同：前者要重新
 * 報備、後者要檢討是誰認定的。一筆沒有理由的撤回，事後分不出是哪一種。
 * 同 `LeaveGrant` 的人工調整、`OvertimeRequest.withdrawReason` 的既有處置。
 */
export function assertEmergencyDeclaration(
  params: IStorableEmergencyDeclaration,
): void {
  if (!isSafeHttpUrl(params.reportUrl.trim())) {
    throw new OvertimeRequestInvariantError(
      "the Article 32 IV filing must be an http(s) link that can actually be opened",
      `reportUrl=${params.reportUrl}`,
    );
  }
  if (Number.isNaN(params.reportedAt.getTime())) {
    throw new OvertimeRequestInvariantError(
      "the emergency filing must carry a real moment; an unparseable timestamp cannot answer the twenty-four hour question",
      `reportedAt=${String(params.reportedAt)}`,
    );
  }
  if (params.declaredByEmployeeId.trim() === "") {
    throw new OvertimeRequestInvariantError(
      "the emergency determination must name the HR administrator who made it",
      `declaredByEmployeeId=${params.declaredByEmployeeId}`,
    );
  }

  const revokedAt = params.revokedAt;
  const revokedBy = params.revokedByEmployeeId;
  const reason = params.revokeReason;

  const hasRevokedAt = revokedAt !== null && revokedAt !== undefined;
  const hasRevokedBy =
    revokedBy !== null && revokedBy !== undefined && revokedBy.trim() !== "";
  const hasReason =
    reason !== null && reason !== undefined && reason.trim() !== "";

  // Info: (20260820 - Julian) 三欄全空＝這份認定仍然有效
  if (!hasRevokedAt && !hasRevokedBy && !hasReason) return;

  if (!hasRevokedAt || !hasRevokedBy || !hasReason) {
    throw new OvertimeRequestInvariantError(
      "a revoked determination must state when, by whom and why; half a revocation cannot be told apart from a forgotten field, and the difference decides whether the filing has to be made again",
      `revokedAt=${String(revokedAt)}, revokedByEmployeeId=${revokedBy}, revokeReason=${reason}`,
    );
  }
}
