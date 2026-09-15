import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";
import {
  assertSnapshotWithinBudget,
  snapshotWireBytes,
  buildCoefficientDictionary,
  parseGlobalCoefficientSnapshot,
  parseTenantCoefficientSnapshot,
  serializeGlobalCoefficients,
  isFiniteDecimalString,
  isValidGhgFactors,
  type ISnapshotCoefficient,
} from "@/lib/worker/coefficient_snapshot";
import { MISSION_GLOBAL_COEFFICIENT_SNAPSHOT_MAX_BYTES } from "@/constants/worker_node";
import { VoucherPipelineOrchestrator } from "@/services/voucher.pipeline.orchestrator";
import { ALL_COEFFICIENTS } from "@/constants/true_esg_coefficients";
import { LEGACY_STANDARD_COEFFICIENT_CATEGORY } from "@/constants/esg";
import type { IAggregatedDocumentResult } from "@/skills/utils/document_parser_db_sync";

/**
 * Info: (20260907 - Luphia) 排放係數字典的任務快照（PR #6650 收尾）。
 *
 * 被守護的不變式：外部運算節點**零資料庫**——字典由發包端嵌進 mission.json
 * 隨 IPFS 過界。這一組分三層：
 *
 * 1. 純函式：parse（不可信輸入的逐筆過濾）、merge（快照蓋過靜態的優先序）、
 *    serialize（Decimal→字串、null 欄位收斂）。判斷收斂成純函式直接測
 *   （checklist §1.11 的做法欄），不 mock。
 * 2. 行為：orchestrator 以**快照提供的（非靜態）**係數算出碳排——證明整條
 *    「發包端字典 → 洗淨管線」在沒有資料庫的世界裡走得通。
 * 3. 接線掃描：發包端真的嵌、消費端真的讀（§1.7——零件對了還要裝上去）。
 */

const wireCoefficient = (
  over: Partial<ISnapshotCoefficient> = {},
): ISnapshotCoefficient => ({
  id: "snap-test-1",
  name: "Snapshot Test Coefficient",
  description: "for tests",
  unit: "TWD",
  emissionFactor: "0.5",
  source: "Test_Source",
  category: LEGACY_STANDARD_COEFFICIENT_CATEGORY,
  ...over,
});

describe("parseGlobalCoefficientSnapshot：mission.json 是不可信輸入", () => {
  it("正常快照逐筆讀出", () => {
    const parsed = parseGlobalCoefficientSnapshot({
      prerequisiteData: { globalCoefficients: [wireCoefficient()] },
    });
    expect(parsed).toEqual([wireCoefficient()]);
  });

  /**
   * Info: (20260907 - Luphia) 缺席回空陣列不拋錯：快照通道上線前發出、
   * 還在管線裡的舊 mission 沒有這個欄位，要以靜態字典走完。
   */
  it.each([
    ["沒有 prerequisiteData", {}],
    ["prerequisiteData 不是物件", { prerequisiteData: "x" }],
    ["globalCoefficients 缺席", { prerequisiteData: {} }],
    [
      "globalCoefficients 不是陣列",
      { prerequisiteData: { globalCoefficients: {} } },
    ],
  ])("%s → 空陣列（舊 mission 的靜默通道是刻意的）", (_label, data) => {
    expect(
      parseGlobalCoefficientSnapshot(data as Record<string, unknown>),
    ).toEqual([]);
  });

  /**
   * Info: (20260907 - Luphia) **逐筆**過濾壞形狀，不是整包丟棄：一筆壞資料
   * 不該讓整份字典消失（mission.json 走 IPFS，內容視為不可信）。
   * `emissionFactor` 是 number 也算壞形狀——線上形狀規定字串
   *（Decimal 進 JSON number 會踩浮點），發包端序列化器保證這件事，
   * 讀取端不替它擦屁股。
   */
  it("壞形狀逐筆剔除，好的留下", () => {
    const parsed = parseGlobalCoefficientSnapshot({
      prerequisiteData: {
        globalCoefficients: [
          wireCoefficient(),
          null,
          "junk",
          { id: "no-other-fields" },
          { ...wireCoefficient({ id: "num-factor" }), emissionFactor: 0.5 },
          wireCoefficient({ id: "snap-test-2" }),
        ],
      },
    });
    expect(parsed.map((c) => c.id)).toEqual(["snap-test-1", "snap-test-2"]);
  });
});

describe("buildCoefficientDictionary：靜態 < 全球快照 < 租戶（資料庫的值贏）", () => {
  it("靜態字典整套都在（快照缺席＝舊行為的靜態半邊）", () => {
    const dictionary = buildCoefficientDictionary([]);
    ALL_COEFFICIENTS.forEach((c) => {
      expect(dictionary.get(c.id)?.name).toBe(c.name);
    });
  });

  /**
   * Info: (20260914 - Luphia) 快照蓋過靜態——**這是行為變更，不是等價改寫**
   *（review #6650 需修-4；決定：DB 值贏，Luphia 2026-09-14）。拆分前
   * orchestrator 的 `getCoefficientById` 是靜態贏；統一成 DB 贏是為了讓 admin
   * 修正官方係數對重新發包的 mission 生效。這條釘的就是那個決定。
   */
  it("快照與靜態撞 id 時，快照贏（DB 值贏的決定）", () => {
    const staticId = ALL_COEFFICIENTS[0].id;
    const dictionary = buildCoefficientDictionary([
      wireCoefficient({ id: staticId, name: "OVERRIDDEN" }),
    ]);
    expect(dictionary.get(staticId)?.name).toBe("OVERRIDDEN");
  });

  it("快照獨有的 id 查得到", () => {
    const dictionary = buildCoefficientDictionary([wireCoefficient()]);
    expect(dictionary.get("snap-test-1")?.emissionFactor).toBe("0.5");
  });

  /**
   * Info: (20260914 - Luphia) 租戶自訂係數（review 需修-5）：prompt 把它們餵給
   * 模型當候選，模型挑了就要解得到。租戶排最後——per-book 是最具體的覆寫。
   */
  it("租戶係數查得到，且撞 id 時蓋過全球快照", () => {
    const dictionary = buildCoefficientDictionary(
      [wireCoefficient({ id: "shared-id", name: "GLOBAL" })],
      [
        wireCoefficient({ id: "shared-id", name: "TENANT" }),
        wireCoefficient({ id: "tenant-only" }),
      ],
    );
    expect(dictionary.get("shared-id")?.name).toBe("TENANT");
    expect(dictionary.get("tenant-only")).toBeDefined();
  });
});

describe("assertSnapshotWithinBudget：每份 mission 都背的體積要有上界（review 二輪中-2）", () => {
  /**
   * Info: (20260914 - Luphia) 量的是**出貨形狀**（review 三輪需修-8）：issue.service
   * 以 indent-2 序列化整份 mission.json，快照巢狀在 `prerequisiteData` 下。
   * 第二版量 compact 陣列，比實際上傳少 25%。
   */
  it("在預算內回傳位元組數，且量的是 indent-2 巢狀形狀而不是 compact", () => {
    const snapshot = [wireCoefficient()];
    const wire = Buffer.byteLength(
      JSON.stringify(
        { prerequisiteData: { globalCoefficients: snapshot } },
        null,
        2,
      ),
      "utf8",
    );
    expect(assertSnapshotWithinBudget(snapshot)).toBe(wire);
    expect(snapshotWireBytes(snapshot)).toBe(wire);
    expect(wire).toBeGreaterThan(
      Buffer.byteLength(JSON.stringify(snapshot), "utf8"),
    );
  });

  /**
   * Info: (20260914 - Luphia) 超過就拋、不裁切：靜默裁掉一半字典比拒發更糟
   *（§2.1 的形狀）。用小預算注入，不必造出 1 MB 的陣列。
   */
  it("超過預算拋錯，訊息帶位元組數與筆數", () => {
    const snapshot = [wireCoefficient(), wireCoefficient({ id: "snap-2" })];
    expect(() => assertSnapshotWithinBudget(snapshot, 10)).toThrow(
      /over the 10-byte budget/,
    );
    expect(() => assertSnapshotWithinBudget(snapshot, 10)).toThrow(/2 rows/);
  });

  it("預設預算是 1 MB，且現況靜態字典的出貨形狀在預算內（約 2.3 倍成長空間）", () => {
    expect(MISSION_GLOBAL_COEFFICIENT_SNAPSHOT_MAX_BYTES).toBe(1024 * 1024);
    const staticOnly = Array.from(buildCoefficientDictionary([]).values());
    const bytes = assertSnapshotWithinBudget(staticOnly);
    expect(bytes).toBeLessThan(MISSION_GLOBAL_COEFFICIENT_SNAPSHOT_MAX_BYTES);
    // Info: (20260914 - Luphia) 上界靈敏度：把預算設成 compact 的位元組數，出貨形狀就該被拒
    const compact = Buffer.byteLength(JSON.stringify(staticOnly), "utf8");
    expect(() => assertSnapshotWithinBudget(staticOnly, compact)).toThrow(
      /over the/,
    );
  });
});

/**
 * Info: (20260915 - Luphia) 值要是有限十進位數（review 四輪需修-5）：`"0.509 kg"`
 * 原本通過 `typeof === "string"`，進 `MoneyUtil.toDecimal` 的 catch 變成 0，ESG 紀錄
 * 寫 emissions = 0 而 mission 報成功。守衛在最外層擋掉，壞的那一筆剔除、其餘保留。
 */
describe("係數值守衛：emissionFactor／ghgFactors 必須是有限數（四輪需修-5）", () => {
  it.each([
    ["0.509", true],
    ["  1e-3 ", true],
    ["-2.5", true],
    ["0.509 kg", false],
    ["", false],
    ["NaN", false],
    ["Infinity", false],
    ["abc", false],
  ])("isFiniteDecimalString(%j) → %s", (value, expected) => {
    expect(isFiniteDecimalString(value)).toBe(expected);
  });

  it("非字串一律不是十進位字串（number 也不是——線上形狀是字串）", () => {
    expect(isFiniteDecimalString(0.5)).toBe(false);
    expect(isFiniteDecimalString(null)).toBe(false);
    expect(isFiniteDecimalString(undefined)).toBe(false);
  });

  it.each([
    [undefined, true],
    [null, true],
    [{ CO2: 1.2, CH4: "0.01" }, true],
    [{ CO2: "abc" }, false],
    [{ CO2: Number.NaN }, false],
    [["1", "2"], false],
    ["1.2", false],
  ])("isValidGhgFactors(%j) → %s", (value, expected) => {
    expect(isValidGhgFactors(value)).toBe(expected);
  });

  it("parseGlobalCoefficientSnapshot 剔除壞值的那一筆、保留好的", () => {
    const parsed = parseGlobalCoefficientSnapshot({
      prerequisiteData: {
        globalCoefficients: [
          wireCoefficient({ id: "good" }),
          wireCoefficient({
            id: "bad-unit-in-value",
            emissionFactor: "0.509 kg",
          }),
          wireCoefficient({ id: "bad-ghg", ghgFactors: { CO2: "n/a" } }),
          wireCoefficient({
            id: "good-ghg",
            ghgFactors: { CO2: "0.9", CH4: 0.001 },
          }),
        ],
      },
    });
    expect(parsed.map((c) => c.id)).toEqual(["good", "good-ghg"]);
  });
});

describe("parseTenantCoefficientSnapshot：租戶係數走同一支型別守衛", () => {
  it("讀 prerequisiteData.coefficients，壞形狀逐筆剔除", () => {
    const parsed = parseTenantCoefficientSnapshot({
      prerequisiteData: {
        coefficients: [wireCoefficient({ id: "t-1" }), { id: "junk" }],
      },
    });
    expect(parsed.map((c) => c.id)).toEqual(["t-1"]);
  });

  it("缺席回空陣列", () => {
    expect(parseTenantCoefficientSnapshot({})).toEqual([]);
    expect(parseTenantCoefficientSnapshot({ prerequisiteData: {} })).toEqual(
      [],
    );
  });
});

describe("serializeGlobalCoefficients：發包端的唯一序列化器", () => {
  it("Decimal 形狀轉字串、null 欄位收斂", () => {
    const rows = [
      {
        id: "db-1",
        name: "DB Coef",
        description: null,
        unit: "kWh",
        // Info: (20260907 - Luphia) 結構型別只要求 toString——Prisma.Decimal 滿足
        emissionFactor: { toString: () => "0.509" },
        source: "MOENV",
        category: null,
        ghgFactors: { CO2: "0.5" },
      },
    ];
    expect(serializeGlobalCoefficients(rows)).toEqual([
      {
        id: "db-1",
        name: "DB Coef",
        description: "",
        unit: "kWh",
        emissionFactor: "0.509",
        source: "MOENV",
        category: undefined,
        ghgFactors: { CO2: "0.5" },
      },
    ]);
  });

  it("序列化的輸出通過讀取端的形狀檢查（兩端同一份契約）", () => {
    const wire = serializeGlobalCoefficients([
      {
        id: "db-1",
        name: "DB Coef",
        description: null,
        unit: "kWh",
        emissionFactor: { toString: () => "0.509" },
        source: "MOENV",
        category: null,
        ghgFactors: null,
      },
    ]);
    const roundTripped = parseGlobalCoefficientSnapshot({
      prerequisiteData: {
        globalCoefficients: JSON.parse(JSON.stringify(wire)),
      },
    });
    expect(roundTripped).toHaveLength(1);
    expect(roundTripped[0].id).toBe("db-1");
  });
});

describe("orchestrator 以快照係數計算（無資料庫的世界）", () => {
  /**
   * Info: (20260907 - Luphia) 係數 id **不在靜態字典裡**——算得出碳排的唯一
   * 可能是字典參數真的被用上。這條在改動前的世界（getCoefficientById 查 DB）
   * 沒有資料庫就得不到值；現在它在 jest 裡直接綠，正是零 DB 的證明。
   */
  it("快照提供的（非靜態）係數算得出碳排", async () => {
    const payload: IAggregatedDocumentResult = {
      esg: {
        activityType: "ELECTRICITY_USAGE",
        vendor: "Test Vendor",
        amount: 100,
        unit: "kWh",
        coefficientId: "snap-only-electricity",
      },
    };
    const dictionary = buildCoefficientDictionary([
      wireCoefficient({
        id: "snap-only-electricity",
        unit: "kWh",
        emissionFactor: "0.509",
      }),
    ]);

    const result = await VoucherPipelineOrchestrator.executePipeline(
      payload,
      "TWD",
      "TW",
      dictionary,
    );
    // Info: (20260907 - Luphia) 100 kWh × 0.509 = 50.9（MoneyUtil 高精度乘法）
    expect(String(result.esg?.emissions)).toBe("50.9");
  });

  /**
   * Info: (20260907 - Luphia) 不帶字典直呼 executePipeline 的呼叫端（測試、
   * 種子腳本）要拿到**靜態字典**的行為——預設值若是空 Map，它們會連靜態
   * 係數都查不到、靜默跳過計算（改動前走的是 getCoefficientById 的
   * 「靜態先」分支）。斷言「算得出值」：預設塌成空 Map 的世界裡是 undefined。
   */
  it("不帶字典時的預設是靜態字典（不是空 Map）", async () => {
    const staticCoef = ALL_COEFFICIENTS[0];
    const payload: IAggregatedDocumentResult = {
      esg: {
        activityType: "ELECTRICITY_USAGE",
        vendor: "Test Vendor",
        amount: 1,
        unit: staticCoef.unit,
        coefficientId: staticCoef.id,
      },
    };
    const result = await VoucherPipelineOrchestrator.executePipeline(
      payload,
      "TWD",
      "TW",
    );
    expect(result.esg?.emissions).toBeDefined();
  });

  it("字典查不到 id 時跳過計算、不拋錯（與舊行為一致）", async () => {
    const payload: IAggregatedDocumentResult = {
      esg: {
        activityType: "ELECTRICITY_USAGE",
        vendor: "Test Vendor",
        amount: 100,
        unit: "kWh",
        coefficientId: "nobody-has-this-id",
      },
    };
    const result = await VoucherPipelineOrchestrator.executePipeline(
      payload,
      "TWD",
      "TW",
      buildCoefficientDictionary([]),
    );
    expect(result.esg?.emissions).toBeUndefined();
    // Info: (20260914 - Luphia) 但要留下痕跡（review 三輪需修-5）：aiNote 帶上查不到的 id
    expect(result.esg?.aiNote).toContain("nobody-has-this-id");
    expect(result.esg?.aiNote).toContain("不在任務係數字典中");
  });
});

describe("接線（§1.7：零件對了還要裝上去）", () => {
  const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

  /**
   * Info: (20260914 - Luphia) 位置斷言（review 阻-2／建議-9／三輪阻-1／三輪需修-5）：
   * 全表查詢與體積守門在**鎖定訂單之前**（超過預算不動訂單、不進 mint／approve
   * 之後那條會回滾成 PAID 重試的路）；全球快照與租戶係數的嵌入都在 category 判斷
   * **之前**（每一份 mission 都有，不只 CERTIFICATE_ANALYSIS）；租戶查詢也在
   * `Promise.all` 之前（整張訂單一次）。
   */
  it("發包端：守門在鎖單之前，全球與租戶係數的嵌入都不看 category", () => {
    const issuer = read("src/services/issue.service.ts");
    const fetchAt = issuer.indexOf(
      "await EmissionFactorRepo.getAllGlobalCoefficients()",
    );
    const budgetAt = issuer.indexOf(
      "assertSnapshotWithinBudget(globalCoefficientSnapshot)",
    );
    const lockAt = issuer.indexOf("data: { status: ORDER_STATUS.EXECUTING }");
    const tenantFetchAt = issuer.indexOf("await esgRepo.getEsgCoefficients(");
    const promiseAllAt = issuer.indexOf(
      "const preparedItems = await Promise.all(",
    );
    const embedAt = issuer.indexOf(
      "missionData.prerequisiteData.globalCoefficients =",
    );
    const tenantEmbedAt = issuer.indexOf(
      "missionData.prerequisiteData.coefficients = tenantCoefficients;",
    );
    /**
     * Info: (20260914 - Luphia) 錨在 accountBook JSON 那一道閘——檔案裡另有兩處
     * `category === CERTIFICATE_ANALYSIS` 判斷（itemsToProcess 與 analysis 佔位），
     * 錨太短會抓到它們、把「嵌入在閘之前」量成相反的結論。
     */
    const categoryGateAt = issuer.indexOf(
      "if (category === ANALYSIS_CATEGORY.CERTIFICATE_ANALYSIS) {\n            missionData.accountBook = tenantAccountBook;",
    );
    expect(fetchAt).toBeGreaterThan(-1);
    expect(budgetAt).toBeGreaterThan(fetchAt);
    expect(lockAt).toBeGreaterThan(budgetAt);
    expect(tenantFetchAt).toBeGreaterThan(lockAt);
    expect(promiseAllAt).toBeGreaterThan(tenantFetchAt);
    expect(embedAt).toBeGreaterThan(promiseAllAt);
    expect(tenantEmbedAt).toBeGreaterThan(embedAt);
    expect(categoryGateAt).toBeGreaterThan(tenantEmbedAt);
    /**
     * Info: (20260914 - Luphia) 位置斷言看不見**包在外面的條件**：把租戶嵌入重新
     * 包進 `&& category === CERTIFICATE_ANALYSIS` 時行序不變、上面全綠（突變 M5 抓到
     * 的洞）。所以釘住守著它的那個 `if` 的本文：只看帳本存在，沒有 category。
     */
    expect(issuer).toContain(
      "if (tenantAccountBook) {\n          missionData.prerequisiteData.coefficients = tenantCoefficients;",
    );
    // Info: (20260914 - Luphia) 全表與租戶查詢各恰好一次
    expect(
      issuer.match(/EmissionFactorRepo\.getAllGlobalCoefficients\(\)/g),
    ).toHaveLength(1);
    expect(issuer.match(/esgRepo\.getEsgCoefficients\(/g)).toHaveLength(1);
    // Info: (20260914 - Luphia) 超過預算：記 error、return null，不 throw 進訂單的 try
    const refuseAt = issuer.indexOf("Refusing to issue order");
    expect(refuseAt).toBeGreaterThan(budgetAt);
    expect(refuseAt).toBeLessThan(lockAt);
    expect(issuer.slice(refuseAt, lockAt)).toContain("return null;");
  });

  it("esg_parsing 讀 mission 快照（全球＋租戶），不再匯入 repo 或 prisma", () => {
    const skill = read("src/skills/document/esg_parsing.ts");
    expect(skill).toContain("buildCoefficientDictionary(");
    expect(skill).toContain("parseGlobalCoefficientSnapshot(mission.data)");
    // Info: (20260915 - Luphia) 四輪需修-4：候選集要含租戶自訂係數，否則永遠選不到
    expect(skill).toContain(
      "parseGlobalCoefficientSnapshot(mission.data),\n          parseTenantCoefficientSnapshot(mission.data),",
    );
    expect(skill).not.toContain('from "@/repositories/emission_factor.repo"');
    expect(skill).not.toContain('from "@/lib/prisma"');
  });

  it("orchestrator 查字典參數，不再匯入 repo", () => {
    const orchestrator = read("src/services/voucher.pipeline.orchestrator.ts");
    // Info: (20260907 - Luphia) 兩個呼叫點都要在——精確計數（§1.15 的計數紀律）
    const hits =
      orchestrator.match(
        /coefficientDictionary\.get\(fileResult\.esg\.coefficientId\)/g,
      ) ?? [];
    expect(hits).toHaveLength(2);
    expect(orchestrator).not.toContain(
      'from "@/repositories/emission_factor.repo"',
    );
  });

  it("executor 把 mission 快照字典傳進洗淨管線", () => {
    const executor = read("src/services/mission.executor.service.ts");
    expect(executor).toContain("buildCoefficientDictionary(");
    expect(executor).toContain("parseGlobalCoefficientSnapshot(missionData)");
    // Info: (20260914 - Luphia) 租戶係數也進字典（需修-5）
    expect(executor).toContain("parseTenantCoefficientSnapshot(missionData)");
    expect(executor).toContain("coefficientDictionary,");
  });

  /**
   * Info: (20260907 - Luphia) 快照模組自己必須零 prisma——它活在運算節點的
   * 匯入圖裡。匯入圖層級由 worker_node_isolation.test.ts 守全圖，
   * 這一條把最可能被「順手加回去」的單檔釘死。
   */
  it("coefficient_snapshot 模組零 prisma、零 repo", () => {
    const snapshotModule = read("src/lib/worker/coefficient_snapshot.ts");
    expect(snapshotModule).not.toContain("@/lib/prisma");
    expect(snapshotModule).not.toContain("@/repositories/");
  });
});
