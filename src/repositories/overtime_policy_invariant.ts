/**
 * Info: (20260818 - Julian) 加班政策的「放寬必須有記載」不變式。
 *
 * ## 為什麼擋在 repository
 *
 * §32 III 把單月上限從 46 小時放寬到 54 小時的前提是「經工會同意，如事業單位
 * 無工會者，經勞資會議同意」。**一個沒有記載的『已同意』等於沒有同意**，
 * 而系統會據此多放 8 小時 —— 那是會被開罰的 8 小時（ADR 024 §6.1）。
 *
 * 放在 repository 而不是 service：政策這一列會被 seed、資料遷移與日後的
 * 管理畫面各自寫入，而它們不會都經過同一支 service。
 */

export class OvertimePolicyInvariantError extends Error {
  constructor(
    public readonly reason: string,
    detail: string,
  ) {
    super(`OvertimePolicy: ${reason} (${detail})`);
    this.name = "OvertimePolicyInvariantError";
  }
}

export interface IStorableOvertimePolicy {
  extendedLimitAgreed: boolean;
  agreementRecordUrl: string | null | undefined;
  agreedAt: Date | null | undefined;
  /** Info: (20260818 - Julian) 補休期限（月）。§32-1 無法定日數，未協商時為 null */
  compensatoryExpiryMonths: number | null | undefined;
}

export function assertOvertimePolicy(params: IStorableOvertimePolicy): void {
  if (params.extendedLimitAgreed) {
    const url = params.agreementRecordUrl;
    if (url === null || url === undefined || url.trim() === "") {
      throw new OvertimePolicyInvariantError(
        "the 54-hour extension requires a recorded union or labour-management agreement (Article 32 III); an unrecorded consent grants 8 hours nobody agreed to",
        `agreementRecordUrl=${url}`,
      );
    }
    if (params.agreedAt === null || params.agreedAt === undefined) {
      throw new OvertimePolicyInvariantError(
        "the recorded agreement must carry the date it was made; without it the extension cannot be tied to a meeting",
        `agreedAt=${params.agreedAt}`,
      );
    }
  }

  /**
   * Info: (20260818 - Julian) 補休期限可以不設定（那代表尚未協商，屆時擋下換補休），
   * 但**設定了就必須是正整數**。0 個月的期限代表補休當天就過期，
   * 而過期的補休要折現成錢 —— 那不是「沒有期限」，是最短的期限。
   */
  const months = params.compensatoryExpiryMonths;
  if (months !== null && months !== undefined) {
    if (!Number.isInteger(months) || months < 1) {
      throw new OvertimePolicyInvariantError(
        "compensatoryExpiryMonths must be a positive whole number of months when set; zero would expire the leave on the day it is granted",
        `compensatoryExpiryMonths=${months}`,
      );
    }
  }
}
