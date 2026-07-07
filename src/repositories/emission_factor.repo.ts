import { Prisma } from "@/generated";
import { prisma } from "@/lib/prisma";
import { ALL_COEFFICIENTS } from "@/constants/true_esg_coefficients";
import { MOCK_EEIO_COEFFICIENTS } from "@/constants/mock_eeio_coefficients";

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

    const combinedStatic = [
      ...ALL_COEFFICIENTS,
      ...(process.env.ENABLE_DEMO_DATA === "true"
        ? MOCK_EEIO_COEFFICIENTS
        : []),
    ];
    const staticMatch = combinedStatic.find((c) => c.id === id);
    if (staticMatch) {
      return {
        id: staticMatch.id,
        name: staticMatch.name,
        description: staticMatch.description || "",
        unit: staticMatch.unit,
        emissionFactor: staticMatch.emissionFactor,
        source: staticMatch.source,
        category: staticMatch.category || "STANDARD",
        ghgFactors: (staticMatch as Record<string, unknown>).ghgFactors,
      };
    }

    const client = tx || prisma;
    const dbMatch = await client.coefficient.findUnique({
      where: { id },
    });
    if (dbMatch && dbMatch.deletedAt === null) {
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
    const combinedStatic = [
      ...ALL_COEFFICIENTS,
      ...(process.env.ENABLE_DEMO_DATA === "true"
        ? MOCK_EEIO_COEFFICIENTS
        : []),
    ];
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
        category: data.category ?? "STANDARD",
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
      category: c.category || "STANDARD",
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
