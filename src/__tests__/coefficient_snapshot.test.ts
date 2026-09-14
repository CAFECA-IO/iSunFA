import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";
import {
  assertSnapshotWithinBudget,
  buildCoefficientDictionary,
  parseGlobalCoefficientSnapshot,
  parseTenantCoefficientSnapshot,
  serializeGlobalCoefficients,
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
  it("在預算內回傳位元組數（與 JSON 上傳同源）", () => {
    const snapshot = [wireCoefficient()];
    expect(assertSnapshotWithinBudget(snapshot)).toBe(
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

  it("預設預算是 1 MB，且現況靜態字典在預算內（留約 3 倍成長）", () => {
    expect(MISSION_GLOBAL_COEFFICIENT_SNAPSHOT_MAX_BYTES).toBe(1024 * 1024);
    const staticOnly = Array.from(buildCoefficientDictionary([]).values());
    const bytes = assertSnapshotWithinBudget(staticOnly);
    expect(bytes).toBeLessThan(
      MISSION_GLOBAL_COEFFICIENT_SNAPSHOT_MAX_BYTES / 2,
    );
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
  });
});

describe("接線（§1.7：零件對了還要裝上去）", () => {
  const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

  /**
   * Info: (20260914 - Luphia) 兩個位置斷言（review 阻-2／建議-9）：
   * 全表查詢在 `Promise.all` **之前**（整張訂單一次），嵌入在 category 判斷
   * **之前**（每一份 mission 都有，不只 CERTIFICATE_ANALYSIS）。
   */
  it("發包端：全表查一次在 Promise.all 之前，嵌入不看 category", () => {
    const issuer = read("src/services/issue.service.ts");
    const fetchAt = issuer.indexOf(
      "await EmissionFactorRepo.getAllGlobalCoefficients()",
    );
    const promiseAllAt = issuer.indexOf(
      "const preparedItems = await Promise.all(",
    );
    const embedAt = issuer.indexOf(
      "missionData.prerequisiteData.globalCoefficients =",
    );
    /**
     * Info: (20260914 - Luphia) 錨在 accountBook 那一道閘（`accBookId &&`）——
     * 檔案裡另有兩處 `category === CERTIFICATE_ANALYSIS` 判斷（itemsToProcess 與
     * analysis 佔位），錨太短會抓到它們、把「嵌入在閘之前」量成相反的結論。
     */
    const categoryGateAt = issuer.indexOf(
      "if (accBookId && category === ANALYSIS_CATEGORY.CERTIFICATE_ANALYSIS) {",
    );
    expect(fetchAt).toBeGreaterThan(-1);
    expect(promiseAllAt).toBeGreaterThan(fetchAt);
    expect(embedAt).toBeGreaterThan(promiseAllAt);
    expect(categoryGateAt).toBeGreaterThan(embedAt);
    // Info: (20260914 - Luphia) 全表查詢恰好一次
    expect(
      issuer.match(/EmissionFactorRepo\.getAllGlobalCoefficients\(\)/g),
    ).toHaveLength(1);
    // Info: (20260914 - Luphia) 體積守門在序列化之後、Promise.all 之前（review 二輪中-2）
    const budgetAt = issuer.indexOf(
      "assertSnapshotWithinBudget(globalCoefficientSnapshot)",
    );
    expect(budgetAt).toBeGreaterThan(fetchAt);
    expect(budgetAt).toBeLessThan(promiseAllAt);
  });

  it("esg_parsing 讀 mission 快照，不再匯入 repo 或 prisma", () => {
    const skill = read("src/skills/document/esg_parsing.ts");
    expect(skill).toContain("buildCoefficientDictionary(");
    expect(skill).toContain("parseGlobalCoefficientSnapshot(mission.data)");
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
