/**
 * Info: (20260817 - Julian) 簽核規則的「區間不重疊**且完整覆蓋**」不變式。
 *
 * ## 為什麼覆蓋比不重疊更重要
 *
 * 只檢查不重疊而漏掉覆蓋，會讓某個天數區間展開出空鏈 ——
 * 而空鏈在 ADR 023 §3 是拒絕送出（`CF_LEAVE_APPROVAL_CHAIN_UNRESOLVED`）。
 * 那個錯誤訊息會指向「您尚未設定直屬主管」，因為那是空鏈最常見的成因，
 * **而真正的原因在這張規則表**。使用者會去改人事資料，改到對為止都不會有效。
 *
 * 因此本檔的檢查是：排序後從 0 起、首尾相接、最後一條無上界。
 * 三個條件合起來等於「`[0, ∞)` 被恰好一次覆蓋」。
 *
 * ## 邊界是左閉右開
 *
 * 需求原文「3 天內直屬主管、3 天以上簽至部門經理或 HR」在 3.0 天處重疊。
 * 本專案定為 `[0, 3)` 與 `[3, ∞)`，即**恰好 3 天走長假規則**。
 * 這種邊界不能留給實作者猜，所以它是這裡的比較運算子，不是某人的記憶。
 *
 * ## 為什麼假別專屬規則也要自己覆蓋滿
 *
 * 若允許「特休 0–3 天用專屬規則、3 天以上退回通則」，一張假單的簽核路徑
 * 就取決於兩張表的交互作用 —— 而使用者改了通則之後，會發現特休的長假流程
 * 跟著變了，但短假沒變。要嘛全部自己來，要嘛全部交給通則。
 *
 * ## 為什麼擋在 repository
 *
 * 規則表是整批覆寫的（L6 全量取代，同 `/admin/settings` 的處置）——
 * 而整批覆寫最容易在「刪掉中間一條」時留下一個洞。
 */

export class LeaveApprovalRuleInvariantError extends Error {
  constructor(
    public readonly reason: string,
    detail: string,
  ) {
    super(`LeaveApprovalRule: ${reason} (${detail})`);
    this.name = "LeaveApprovalRuleInvariantError";
  }
}

export interface IApprovalRuleRange {
  /** Info: (20260817 - Julian) 下界（含） */
  minDays: number;
  /** Info: (20260817 - Julian) 上界（不含）。null 表無上界 */
  maxDays: number | null;
}

/**
 * Info: (20260817 - Julian) 檢查**同一個 scope**（同帳本 × 同假別，或同帳本的通則）
 * 之下的整組規則。呼叫端負責先依 scope 分組 —— 把不同 scope 的規則混在一起檢查，
 * 會把「特休有自己的一套」誤判成重疊。
 */
export function assertRuleRangesDisjoint(
  rules: readonly IApprovalRuleRange[],
): void {
  /**
   * Info: (20260817 - Julian) 空集合是合法的：代表這個假別沒有專屬規則、走通則。
   * 通則本身是空的則由 service 在展開時擋（那時才知道有沒有假單要送）。
   */
  if (rules.length === 0) return;

  const ordered = [...rules].sort(
    (left, right) => left.minDays - right.minDays,
  );

  for (const rule of ordered) {
    if (!Number.isFinite(rule.minDays) || rule.minDays < 0) {
      throw new LeaveApprovalRuleInvariantError(
        "minDays must be a non-negative number",
        `minDays=${rule.minDays}`,
      );
    }
    /**
     * Info: (20260820 - Julian) 門檻必須是**可對帳的十進位**（review 第 4 條）。
     *
     * `compareDaysTo` 走 `exactRationalOf`，而它對指數記號直接丟
     * （B5 的規矩：一個沒有辦法用手還原成分數的門檻，事後對不了帳）。
     * `1e-7` 通得過 `min(0).max(366)`、通得過這裡原本的 `isFinite`、
     * 也通得過區間不重疊的檢查，落地之後 `String()` 寫成 `"1e-7"`、
     * 讀回來仍是 `1e-7` —— 而該帳本的每一次試算與送出從此 500。
     *
     * 擋在這裡而不是只擋在 validator：seed 與資料遷移不經過 validator，
     * 而這一列一旦寫進去，壞的不是這一列，是整個帳本的假單功能。
     */
    assertPlainDecimalThreshold("minDays", rule.minDays);
    if (rule.maxDays !== null) {
      assertPlainDecimalThreshold("maxDays", rule.maxDays);
    }
    if (rule.maxDays !== null && rule.maxDays <= rule.minDays) {
      throw new LeaveApprovalRuleInvariantError(
        "maxDays must be greater than minDays; a zero-width range can never match",
        `minDays=${rule.minDays}, maxDays=${rule.maxDays}`,
      );
    }
  }

  // Info: (20260817 - Julian) 必須自 0 起：否則「請半天」沒有任何規則命中
  if (ordered[0].minDays !== 0) {
    throw new LeaveApprovalRuleInvariantError(
      "the first range must start at 0; requests shorter than it would resolve to an empty chain and be blamed on the employee's manager settings",
      `firstMinDays=${ordered[0].minDays}`,
    );
  }

  for (let index = 0; index < ordered.length - 1; index += 1) {
    const current = ordered[index];
    const next = ordered[index + 1];

    if (current.maxDays === null) {
      throw new LeaveApprovalRuleInvariantError(
        "an unbounded range must be the last one; anything after it is unreachable",
        `unboundedAt=${current.minDays}, nextMinDays=${next.minDays}`,
      );
    }
    if (current.maxDays > next.minDays) {
      throw new LeaveApprovalRuleInvariantError(
        "ranges overlap; a request in the overlap would have two different approval chains",
        `previous=[${current.minDays}, ${current.maxDays}), next=[${next.minDays}, ...)`,
      );
    }
    /**
     * Info: (20260817 - Julian) 相接而非留縫。`<` 而不是 `!==` 是為了讓錯誤訊息
     * 分得出「重疊」與「有洞」—— 兩者的修法不同，而修錯方向會再撞一次。
     */
    if (current.maxDays < next.minDays) {
      throw new LeaveApprovalRuleInvariantError(
        "ranges leave a gap; requests inside it resolve to an empty chain, which surfaces as a misleading 'no manager configured' error",
        `gap=[${current.maxDays}, ${next.minDays})`,
      );
    }
  }

  /**
   * Info: (20260817 - Julian) 最後一條必須無上界。
   *
   * 留一個上界等於宣告「超過 N 天的假不需要任何人簽核」——
   * 而那正是最需要簽核的那一種。
   */
  const last = ordered[ordered.length - 1];
  if (last.maxDays !== null) {
    throw new LeaveApprovalRuleInvariantError(
      "the last range must be unbounded; otherwise the longest leaves would need no approval at all",
      `lastRange=[${last.minDays}, ${last.maxDays})`,
    );
  }
}

/**
 * Info: (20260820 - Julian) 天數門檻的十進位形狀（review 第 4 條）。
 *
 * 兩件事：不得是指數記號（`String(1e-7)` 就是 `"1e-7"`，而 JS 對絕對值
 * 小於 `1e-6` 的數字一律用指數記號），且小數位不得超過三位。
 *
 * 三位不是隨便挑的：簽核門檻是**寫在人事規章裡的一個數字** ——
 * 半天（0.5）、四分之一天（0.25）都在三位之內，而 0.0001 天（8.6 秒）
 * 作為「這種長度以上要多簽一關」的界線沒有任何意義。
 * 上界擋掉的是誤植與惡意，不是需求。
 */
const MAX_THRESHOLD_DECIMALS = 3;

function assertPlainDecimalThreshold(field: string, value: number): void {
  const text = String(value);
  if (text.includes("e") || text.includes("E")) {
    throw new LeaveApprovalRuleInvariantError(
      `${field} must be a plain decimal; a threshold in exponential notation cannot be reconciled by hand, and the approval engine refuses to compare against it`,
      `${field}=${text}`,
    );
  }
  const dot = text.indexOf(".");
  const decimals = dot === -1 ? 0 : text.length - dot - 1;
  if (decimals > MAX_THRESHOLD_DECIMALS) {
    throw new LeaveApprovalRuleInvariantError(
      `${field} must have at most ${MAX_THRESHOLD_DECIMALS} decimal places; a boundary finer than that is not a rule anyone wrote down`,
      `${field}=${text}`,
    );
  }
}
