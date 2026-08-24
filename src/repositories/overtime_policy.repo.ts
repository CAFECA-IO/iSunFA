import { prisma } from "@/lib/prisma";
import { assertOvertimePolicy } from "@/repositories/overtime_policy_invariant";

/**
 * Info: (20260818 - Julian) 加班政策的寫入端（L30）。
 *
 * 一個帳本一份（`accountBookId` 是 `@unique`），因此是 upsert 而不是 create ——
 * 第一次設定時那一列還不存在，而「先查再決定要 create 還是 update」
 * 在併發下會兩邊都走 create，然後撞唯一鍵。
 *
 * 不變式擋在這裡而不是 service：這一列也會被 seed 與資料遷移寫入，
 * 而它們不經過 service（同 `assertGrantSource` 放在 repository 的理由）。
 */

export interface IStoredOvertimePolicy {
  accountBookId: string;
  extendedLimitAgreed: boolean;
  agreementRecordUrl: string | null;
  agreedAt: Date | null;
  compensatoryExpiryMonths: number | null;
}

export interface IOvertimePolicyRepository {
  upsert(params: IStoredOvertimePolicy): Promise<void>;
}

class OvertimePolicyRepository implements IOvertimePolicyRepository {
  public async upsert(params: IStoredOvertimePolicy): Promise<void> {
    assertOvertimePolicy(params);

    const values = {
      extendedLimitAgreed: params.extendedLimitAgreed,
      agreementRecordUrl: params.agreementRecordUrl,
      agreedAt: params.agreedAt,
      compensatoryExpiryMonths: params.compensatoryExpiryMonths,
    };

    await prisma.overtimePolicy.upsert({
      where: { accountBookId: params.accountBookId },
      create: { accountBookId: params.accountBookId, ...values },
      /**
       * Info: (20260818 - Julian) 全量取代，不是差異更新。
       *
       * 設定畫面送上來的是一份完整的政策 —— 把「沒送的欄位就不動」當成
       * 語意，會讓「取消同意」這個動作變成沒有辦法表達的東西
       * （同 `/admin/settings` 全量取代的既有處置）。
       */
      update: values,
    });
  }
}

export const overtimePolicyRepo: IOvertimePolicyRepository =
  new OvertimePolicyRepository();
