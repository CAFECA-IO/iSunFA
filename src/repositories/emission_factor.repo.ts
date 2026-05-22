import { Prisma } from "@/generated";
import { ALL_COEFFICIENTS } from "@/constants/true_esg_coefficients";

export class EmissionFactorRepo {
  static async findFallbackCoefficient(
    tx: Prisma.TransactionClient,
    fallbackTag: string,
    accountBookId: string,
  ): Promise<string | null> {
    if (!fallbackTag) return null;

    // Info: (20260521 - Tzuhan) 軌道一：優先檢索資料庫的「官方標準數據」(accountBookId: null)
    const officialDbMatches = await tx.coefficient.findMany({
      where: {
        AND: [
          {
            OR: [
              { name: { contains: fallbackTag } },
              { description: { contains: fallbackTag } },
            ],
          },
          { accountBookId: null },
        ],
        isVerified: true,
      },
      orderBy: { emissionFactor: "desc" }, // Info: (20260521 - Tzuhan) 保守原則取最大
      take: 1,
    });

    if (officialDbMatches.length > 0) return officialDbMatches[0].id;

    // Info: (20260521 - Tzuhan) 軌道二：官方 DB 查無資料，退回系統全域靜態常數檔 (Sprint 1 過渡期墊片)
    const staticMatches = ALL_COEFFICIENTS.filter(
      (c) =>
        c.name.includes(fallbackTag) ||
        (c.description && c.description.includes(fallbackTag)),
    ).sort((a, b) => Number(b.emissionFactor) - Number(a.emissionFactor));

    if (staticMatches.length > 0) return staticMatches[0].id;

    // Info: (20260521 - Tzuhan) 軌道三：常數檔也沒有，檢索資料庫的「用戶自定義係數」或「AI 推測過的係數」(accountBookId)
    const tenantDbMatches = await tx.coefficient.findMany({
      where: {
        AND: [
          {
            OR: [
              { name: { contains: fallbackTag } },
              { description: { contains: fallbackTag } },
            ],
          },
          { accountBookId: accountBookId },
        ],
      },
      orderBy: { emissionFactor: "desc" }, // Info: (20260521 - Tzuhan) 保守原則取最大
      take: 1,
    });

    if (tenantDbMatches.length > 0) return tenantDbMatches[0].id;

    // Info: (20260521 - Tzuhan) 軌道四：徹底無解，退回 null，交由外層觸發 AI_SPECULATIVE_STAGE_3
    return null;
  }
}
