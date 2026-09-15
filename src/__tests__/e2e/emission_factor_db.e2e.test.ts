import { describe, it, beforeAll, afterAll, expect } from "@jest/globals";
import { prisma } from "@/lib/prisma";
import { EmissionFactorRepo } from "@/repositories/emission_factor.repo";
import { ALL_COEFFICIENTS } from "@/constants/true_esg_coefficients";

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

  /**
   * Info: (20260914 - Luphia) **資料庫的值贏**（PR #6650 review 三輪建議-10）。
   *
   * `getCoefficientById` 原本靜態命中就 return，與 mission 管線的字典（DB 蓋靜態）
   * 是兩套優先序：admin 改了官方係數之後，同一個 id 在管線與聊天機器人算出兩個
   * CO2e。這裡拿一個**靜態字典裡真的有**的 id，讓 DB 帶不同的值，斷言查到的是
   * DB 的。開發機的 DB 通常已經匯入過靜態字典（同 id 已存在），所以兩種情況都
   * 處理：沒有就建（cleanup 刪掉）、有就暫改再在 finally 還原。
   */
  it("should let the database row win over a static coefficient with the same id", async () => {
    const staticCoef = ALL_COEFFICIENTS[0];
    const probeFactor = "12345.5";
    expect(staticCoef.emissionFactor.toString()).not.toBe(probeFactor);

    const existing = await prisma.coefficient.findUnique({
      where: { id: staticCoef.id },
    });
    if (!existing) {
      await EmissionFactorRepo.importGlobalCoefficients([
        {
          id: staticCoef.id,
          name: staticCoef.name,
          unit: staticCoef.unit,
          emissionFactor: probeFactor,
          source: "e2e-db-wins",
        },
      ]);
      createdIds.push(staticCoef.id);
    } else {
      await prisma.coefficient.update({
        where: { id: staticCoef.id },
        data: { emissionFactor: probeFactor, deletedAt: null },
      });
    }

    try {
      const looked = await EmissionFactorRepo.getCoefficientById(staticCoef.id);
      expect(looked).not.toBeNull();
      expect(looked!.emissionFactor.toString()).toBe(probeFactor);
    } finally {
      if (existing) {
        await prisma.coefficient.update({
          where: { id: staticCoef.id },
          data: {
            emissionFactor: existing.emissionFactor,
            deletedAt: existing.deletedAt,
          },
        });
      }
    }
  });

  /**
   * Info: (20260915 - Luphia) **只認全球列**（PR #6650 review 四輪阻-2）。
   *
   * DB 優先之後，`getCoefficientById` 若不濾 `accountBookId: null`，任何一個帳本
   * 用保留 id 匯入一列就靜默重新定義了那個官方係數、對所有其他租戶生效。
   * 這裡建一個 e2e 帳本與它的租戶係數，斷言 `getCoefficientById` 對那個 id 回 null
   * ——租戶係數走 mission 快照的 `prerequisiteData.coefficients`，不走這支。
   * 自己建 team／accountBook／coefficient、自己清乾淨（CLAUDE.md §9 的 `e2e-book-` 前綴）。
   */
  it("should never return a tenant-scoped coefficient from getCoefficientById", async () => {
    const stamp = Date.now();
    const team = await prisma.team.create({
      data: { name: `e2e-coef-${stamp}` },
    });
    const bookId = `e2e-book-coef-${stamp}`;
    await prisma.accountBook.create({
      data: {
        id: bookId,
        name: `E2E 係數測試帳本 ${bookId}`,
        country: "tw",
        currency: "TWD",
        rule: "TW-GAAP",
        teamId: team.id,
      },
    });
    const tenantId = `e2e-tenant-coef-${stamp}`;
    try {
      await prisma.coefficient.create({
        data: {
          id: tenantId,
          name: "Tenant-only coefficient",
          description: "",
          unit: "kgCO2e/unit",
          emissionFactor: "99.5",
          source: "e2e",
          category: "STANDARD",
          isVerified: true,
          accountBookId: bookId,
        },
      });
      expect(await EmissionFactorRepo.getCoefficientById(tenantId)).toBeNull();
    } finally {
      await prisma.coefficient.deleteMany({ where: { id: tenantId } });
      await prisma.accountBook.deleteMany({ where: { id: bookId } });
      await prisma.team.deleteMany({ where: { id: team.id } });
    }
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
