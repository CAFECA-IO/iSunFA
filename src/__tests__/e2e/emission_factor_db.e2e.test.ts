import { describe, it, beforeAll, afterAll, expect } from "@jest/globals";
import { prisma } from "@/lib/prisma";
import { EmissionFactorRepo } from "@/repositories/emission_factor.repo";

/**
 * Info: (20260904 - Emily) 搬進 `e2e/` 並改名(#6752)。
 *
 * 這支連的是**真資料庫**(`127.0.0.1:20021`),而它原本住在預設套件裡 ——
 * `jest.config.mjs` 只排除 `*.e2e.test.ts`,於是 docker 沒起的機器上 `npm test`
 *(husky pre-commit 會跑)就有五條紅,錯誤訊息是 `Can't reach database server`。
 *
 * 紅燈沒有分類,現場就會拿它去猜:2026-09-02 這五條紅被誤判成 `prisma generate`
 * 造成的 schema 漂移,差一步就去 `db push` 改一個根本沒問題的資料庫。
 * `reports/ui_test_plan.md` 早就記著「你本機 DB 起著的話應該會過」——
 * 也就是它是**已知**的,但處置是寫在文件裡叫人記得,不是讓工具自己分得開。
 *
 * 現在它與同層的 e2e 一樣:`npm test` 不跑、`npm run test:e2e` 明確執行。
 * 預設套件裡「非 e2e 卻真連 DB」的情況由 `db_tests_isolated.test.ts` 掃描釘住。
 */

// Info: (20260904 - Emily) 🛑 正式機實體隔離(與同層 e2e 一致):這支會建立與刪除 coefficient 列
if (process.env.NODE_ENV === "production") {
  throw new Error(
    "🚨 [FATAL] 嚴禁在正式機 (Production) 環境執行 E2E 測試,以免污染真實係數資料!",
  );
}

describe("EmissionFactorRepo Database Operations Test", () => {
  const createdIds: string[] = [];

  beforeAll(async () => {
    /**
     * Info: (20260904 - Emily) 先探一次連線,讓「DB 沒起」是一句看得懂的話,
     * 不是五條各自帶著 Prisma 堆疊的斷言失敗(#6752 的完成判準之一)。
     */
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      throw new Error(
        "這支 e2e 需要真資料庫(DATABASE_URL 指向的 postgres),但連不上 —— " +
          "先把 docker 起來再跑 `npm run test:e2e`。原始錯誤:" +
          // Info: (20260904 - Emily) Prisma 的訊息以換行開頭,取第一個非空行才是真正的原因
          (error instanceof Error
            ? (error.message
                .split("\n")
                .map((line) => line.trim())
                .find((line) => line.length > 0) ?? error.name)
            : String(error)),
      );
    }
  });

  afterAll(async () => {
    // Info: (20260608 - Luphia) Cleanup any records we created
    if (createdIds.length > 0) {
      await prisma.coefficient.deleteMany({
        where: {
          id: { in: createdIds },
        },
      });
    }
    await prisma.$disconnect();
  });

  it("should create a global carbon emission coefficient", async () => {
    const data = {
      name: "Test Global Coef " + Date.now(),
      description: "Test description",
      unit: "kgCO2e/test_unit",
      emissionFactor: "0.12345",
      source: "Test Source",
      category: "STANDARD",
      versionYear: "2026",
      isVerified: true,
    };

    const res = await EmissionFactorRepo.createGlobal(data);
    expect(res).toBeDefined();
    expect(res.id).toBeDefined();
    createdIds.push(res.id);

    expect(res.name).toBe(data.name);
    expect(res.accountBookId).toBeNull();
    expect(res.deletedAt).toBeNull();
    expect(res.emissionFactor.toString()).toBe("0.12345");
  });

  it("should query global coefficients with search, categories, and verification filters", async () => {
    const uniqueSuffix = "search_" + Date.now();

    // Info: (20260608 - Luphia) Create one verified standard, one unverified custom
    const c1 = await EmissionFactorRepo.createGlobal({
      name: "Global Coef A " + uniqueSuffix,
      description: "Description A",
      unit: "kgCO2e/unit_a",
      emissionFactor: "1.23",
      source: "Source A",
      category: "STANDARD",
      isVerified: true,
    });
    createdIds.push(c1.id);

    const c2 = await EmissionFactorRepo.createGlobal({
      name: "Global Coef B " + uniqueSuffix,
      description: "Description B",
      unit: "kgCO2e/unit_b",
      emissionFactor: "2.34",
      source: "Source B",
      category: "CUSTOM",
      isVerified: false,
    });
    createdIds.push(c2.id);

    // Info: (20260608 - Luphia) 1. Search filter
    const searchRes = await EmissionFactorRepo.findManyGlobal({
      search: uniqueSuffix,
    });
    expect(searchRes.length).toBe(2);

    const searchCount = await EmissionFactorRepo.countGlobal({
      search: uniqueSuffix,
    });
    expect(searchCount).toBe(2);

    // Info: (20260608 - Luphia) 2. Category filter
    const catRes = await EmissionFactorRepo.findManyGlobal({
      search: uniqueSuffix,
      category: "STANDARD",
    });
    expect(catRes.length).toBe(1);
    expect(catRes[0].id).toBe(c1.id);

    // Info: (20260608 - Luphia) 3. Verification filter
    const verifiedRes = await EmissionFactorRepo.findManyGlobal({
      search: uniqueSuffix,
      isVerified: true,
    });
    expect(verifiedRes.length).toBe(1);
    expect(verifiedRes[0].id).toBe(c1.id);
  });

  it("should update global coefficient attributes", async () => {
    const coef = await EmissionFactorRepo.createGlobal({
      name: "Coef Update Test",
      description: "Old description",
      unit: "kg",
      emissionFactor: "5.5",
      source: "Old Source",
    });
    createdIds.push(coef.id);

    const updated = await EmissionFactorRepo.updateGlobal(coef.id, {
      name: "Coef Update Test New",
      description: "New description",
      emissionFactor: "6.6",
      source: "New Source",
      isVerified: false,
    });

    expect(updated.name).toBe("Coef Update Test New");
    expect(updated.description).toBe("New description");
    expect(updated.emissionFactor.toString()).toBe("6.6");
    expect(updated.source).toBe("New Source");
    expect(updated.isVerified).toBe(false);
  });

  it("should soft-delete global coefficient and exclude it from active lookups", async () => {
    const coef = await EmissionFactorRepo.createGlobal({
      name: "Coef Delete Test",
      description: "Delete description",
      unit: "L",
      emissionFactor: "3.21",
      source: "Delete Source",
    });
    createdIds.push(coef.id);

    // Info: (20260608 - Luphia) Verify it is found active
    const activeById = await EmissionFactorRepo.getCoefficientById(coef.id);
    expect(activeById).not.toBeNull();

    // Info: (20260608 - Luphia) Soft delete it
    await EmissionFactorRepo.deleteGlobal(coef.id);

    // Info: (20260608 - Luphia) Verify deletedAt is set
    const dbRecord = await prisma.coefficient.findUnique({
      where: { id: coef.id },
    });
    expect(dbRecord).not.toBeNull();
    expect(dbRecord!.deletedAt).not.toBeNull();

    // Info: (20260608 - Luphia) Verify lookup by ID excludes it (returns null)
    const activeByIdAfter = await EmissionFactorRepo.getCoefficientById(
      coef.id,
    );
    expect(activeByIdAfter).toBeNull();

    // Info: (20260608 - Luphia) Verify getAllGlobalCoefficients excludes it
    const allGlobal = await EmissionFactorRepo.getAllGlobalCoefficients();
    const foundInAll = allGlobal.find((c) => c.id === coef.id);
    expect(foundInAll).toBeUndefined();
  });

  it("should batch import global coefficients and skip duplicates", async () => {
    const importId1 = "test-import-1-" + Date.now();
    const importId2 = "test-import-2-" + Date.now();

    const sampleCoefficients = [
      {
        id: importId1,
        name: "Imported Coef 1",
        unit: "kg",
        emissionFactor: 1.5,
        source: "Source 1",
      },
      {
        id: importId2,
        name: "Imported Coef 2",
        unit: "L",
        emissionFactor: 2.5,
        source: "Source 2",
      },
    ];

    const importedCount =
      await EmissionFactorRepo.importGlobalCoefficients(sampleCoefficients);
    expect(importedCount).toBe(2);
    createdIds.push(importId1, importId2);

    // Info: (20260608 - Luphia) Verify they exist in DB
    const c1 = await prisma.coefficient.findUnique({
      where: { id: importId1 },
    });
    expect(c1).not.toBeNull();
    expect(c1!.name).toBe("Imported Coef 1");

    // Info: (20260608 - Luphia) Try importing again (should skip duplicates and return 0 new imports)
    const secondImportCount =
      await EmissionFactorRepo.importGlobalCoefficients(sampleCoefficients);
    expect(secondImportCount).toBe(0);
  });
});
