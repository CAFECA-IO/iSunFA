import { Prisma } from "@/generated";
import { prisma } from "@/lib/prisma";
import { ALL_COEFFICIENTS } from "@/constants/true_esg_coefficients";
import { MOCK_EEIO_COEFFICIENTS } from "@/constants/mock_eeio_coefficients";
import { LEGACY_STANDARD_COEFFICIENT_CATEGORY } from "@/constants/esg";

export class EmissionFactorRepo {
  static async getAllGlobalCoefficients(tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.coefficient.findMany({
      where: { accountBookId: null, deletedAt: null },
    });
  }

  static async getCoefficientById(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<{
    id: string;
    name: string;
    description: string;
    unit: string;
    emissionFactor: string | number;
    source: string;
    category?: string;
    ghgFactors?: Prisma.JsonValue | unknown;
  } | null> {
    if (!id) return null;

    /**
     * Info: (20260914 - Luphia) **資料庫的值贏**（PR #6650 review 三輪建議-10）。
     *
     * 原本靜態命中就 return，DB 只在靜態沒有時才查——而 mission 管線的字典
     *（`lib/worker/coefficient_snapshot.buildCoefficientDictionary`）自 9/14 起是
     * DB 蓋靜態（`esg_parsing` 從一開始就是）。撞號是常態不是邊角：
     * `carbon_emission_database/import` 拿保留 id 寫 DB，`updateGlobal` 允許 admin
     * 改 `emissionFactor`。兩套優先序並存的後果是同一個係數 id 在稽核系統裡
     * 跑出兩個 CO2e：mission 管線用新值、聊天機器人（`carbon_calculation.service`
     * 經本方法）用舊值，兩邊都不報錯。這裡改成同一個順序：DB 命中（未軟刪）→
     * 靜態 fallback。軟刪的列落回靜態，與 `getAllGlobalCoefficients` 排除軟刪
     * 後由靜態補位的行為一致。
     *
     * Info: (20260915 - Luphia) **只認全球列**（`accountBookId: null`，四輪 review
     * 阻-2）。靜態優先的年代，租戶列撞到保留 id 碰不到（靜態先命中）；DB 優先之後
     * 它會贏——任何一個帳本用保留 id 匯入一列，就靜默重新定義了那個官方係數，
     * 對**所有其他租戶**生效。與 `getAllGlobalCoefficients` 的 global-only 語意對齊；
     * 租戶自訂係數走 mission 快照的 `prerequisiteData.coefficients`，不走這支。
     * `findFirst` 而非 `findUnique`：後者只吃唯一鍵，帶不了過濾條件。
     */
    const client = tx || prisma;
    const dbMatch = await client.coefficient.findFirst({
      where: { id, accountBookId: null, deletedAt: null },
    });
    if (dbMatch) {
      return {
        id: dbMatch.id,
        name: dbMatch.name,
        description: dbMatch.description || "",
        unit: dbMatch.unit,
        emissionFactor: dbMatch.emissionFactor.toString(),
        source: dbMatch.source,
        category: dbMatch.category,
        ghgFactors: dbMatch.ghgFactors,
      };
    }

    const combinedStatic = [...ALL_COEFFICIENTS, ...MOCK_EEIO_COEFFICIENTS];
    const staticMatch = combinedStatic.find((c) => c.id === id);
    if (staticMatch) {
      return {
        id: staticMatch.id,
        name: staticMatch.name,
        description: staticMatch.description || "",
        unit: staticMatch.unit,
        emissionFactor: staticMatch.emissionFactor,
        source: staticMatch.source,
        category: staticMatch.category || LEGACY_STANDARD_COEFFICIENT_CATEGORY,
        ghgFactors: (staticMatch as Record<string, unknown>).ghgFactors,
      };
    }

    return null;
  }

  static async findFallbackCoefficient(
    fallbackTag: string,
    accountBookId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<string | null> {
    if (!fallbackTag) return null;

    const client = tx || prisma;
    // Info: (20260521 - Tzuhan) 軌道一：優先檢索資料庫的「官方標準數據」(accountBookId: null)
    const officialDbMatches = await client.coefficient.findMany({
      where: {
        AND: [
          {
            OR: [
              { name: { contains: fallbackTag } },
              { description: { contains: fallbackTag } },
            ],
          },
          { accountBookId: null },
          { deletedAt: null },
        ],
        isVerified: true,
      },
      orderBy: { emissionFactor: "desc" }, // Info: (20260521 - Tzuhan) 保守原則取最大
      take: 1,
    });

    if (officialDbMatches.length > 0) return officialDbMatches[0].id;

    // Info: (20260521 - Tzuhan) 軌道二：官方 DB 查無資料，退回系統全域靜態常數檔 (Sprint 1 過渡期墊片)
    const combinedStatic = [...ALL_COEFFICIENTS, ...MOCK_EEIO_COEFFICIENTS];
    const staticMatches = combinedStatic
      .filter(
        (c) =>
          c.name.includes(fallbackTag) ||
          (c.description && c.description.includes(fallbackTag)),
      )
      .sort((a, b) => Number(b.emissionFactor) - Number(a.emissionFactor));

    if (staticMatches.length > 0) return staticMatches[0].id;

    // Info: (20260521 - Tzuhan) 軌道三：常數檔也沒有，檢索資料庫的「用戶自定義係數」或「AI 推測過的係數」(accountBookId)
    const tenantDbMatches = await client.coefficient.findMany({
      where: {
        AND: [
          {
            OR: [
              { name: { contains: fallbackTag } },
              { description: { contains: fallbackTag } },
            ],
          },
          { accountBookId: accountBookId },
          { deletedAt: null },
        ],
      },
      orderBy: { emissionFactor: "desc" }, // Info: (20260521 - Tzuhan) 保守原則取最大
      take: 1,
    });

    if (tenantDbMatches.length > 0) return tenantDbMatches[0].id;

    // Info: (20260521 - Tzuhan) 軌道四：徹底無解，退回 null，交由外層觸發 AI_SPECULATIVE_STAGE_3
    return null;
  }

  static async findManyGlobal(
    params: {
      skip?: number;
      limit?: number;
      search?: string;
      category?: string;
      isVerified?: boolean;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || prisma;
    const { skip, limit, search, category, isVerified } = params;

    const where: Prisma.CoefficientWhereInput = {
      accountBookId: null,
      deletedAt: null,
    };

    if (category) {
      where.category = category;
    }

    if (isVerified !== undefined) {
      where.isVerified = isVerified;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { source: { contains: search, mode: "insensitive" } },
        { unit: { contains: search, mode: "insensitive" } },
      ];
    }

    return client.coefficient.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    });
  }

  static async countGlobal(
    params: {
      search?: string;
      category?: string;
      isVerified?: boolean;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || prisma;
    const { search, category, isVerified } = params;

    const where: Prisma.CoefficientWhereInput = {
      accountBookId: null,
      deletedAt: null,
    };

    if (category) {
      where.category = category;
    }

    if (isVerified !== undefined) {
      where.isVerified = isVerified;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { source: { contains: search, mode: "insensitive" } },
        { unit: { contains: search, mode: "insensitive" } },
      ];
    }

    return client.coefficient.count({
      where,
    });
  }

  static async createGlobal(
    data: {
      name: string;
      description: string;
      unit: string;
      emissionFactor: number | string | Prisma.Decimal;
      source: string;
      category?: string;
      versionYear?: string;
      isVerified?: boolean;
      userId?: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || prisma;
    const factorDecimal = new Prisma.Decimal(data.emissionFactor.toString());
    return client.coefficient.create({
      data: {
        name: data.name,
        description: data.description,
        unit: data.unit,
        emissionFactor: factorDecimal,
        source: data.source,
        category: data.category ?? LEGACY_STANDARD_COEFFICIENT_CATEGORY,
        versionYear: data.versionYear || null,
        isVerified: data.isVerified ?? true,
        userId: data.userId || null,
        accountBookId: null, // Info: (20260607 - Luphia) Always null for global
      },
    });
  }

  static async updateGlobal(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      unit: string;
      emissionFactor: number | string | Prisma.Decimal;
      source: string;
      category: string;
      versionYear: string | null;
      isVerified: boolean;
      userId: string | null;
    }>,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || prisma;
    const updateData: Prisma.CoefficientUncheckedUpdateInput = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (data.emissionFactor !== undefined) {
      updateData.emissionFactor = new Prisma.Decimal(
        data.emissionFactor.toString(),
      );
    }
    if (data.source !== undefined) updateData.source = data.source;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.versionYear !== undefined)
      updateData.versionYear = data.versionYear;
    if (data.isVerified !== undefined) updateData.isVerified = data.isVerified;
    if (data.userId !== undefined) updateData.userId = data.userId;

    return client.coefficient.update({
      where: { id },
      data: updateData,
    });
  }

  static async deleteGlobal(id: string, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.coefficient.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  static async importGlobalCoefficients(
    coefficients: {
      id: string;
      name: string;
      description?: string;
      unit: string;
      emissionFactor: string | number;
      source: string;
      category?: string;
    }[],
    userId?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx || prisma;
    const dataToInsert = coefficients.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description || "",
      unit: c.unit,
      emissionFactor: new Prisma.Decimal(c.emissionFactor.toString()),
      source: c.source,
      category: c.category || LEGACY_STANDARD_COEFFICIENT_CATEGORY,
      versionYear: null,
      isVerified: true,
      userId: userId || null,
      accountBookId: null,
    }));

    const chunkSize = 500;
    let count = 0;
    for (let i = 0; i < dataToInsert.length; i += chunkSize) {
      const chunk = dataToInsert.slice(i, i + chunkSize);
      const result = await client.coefficient.createMany({
        data: chunk,
        skipDuplicates: true,
      });
      count += result.count;
    }
    return count;
  }
}
