import { describe, expect, it } from "@jest/globals";
import {
  compareFactorSetTotals,
  DEFAULT_FACTOR_SET,
  factorSetDeltaRatio,
  formatFactorSetVersion,
  FactorSetEnum,
  FACTOR_SET_ORDER,
  formatFactorSource,
  LOGISTICS_FACTOR_SETS,
  resolveFactorSet,
  type IEmissionFactorEntry,
} from "@/constants/logistics_factor_sets";
import {
  TRUE_COEFFICIENT_DATA_DEFRA_PART_2,
  TRUE_COEFFICIENT_DATA_TAIWAN,
} from "@/constants/true_esg_coefficients";

/**
 * Info: (20260801 - Luphia) 係數組的防漂移測試。
 *
 * 係數值在 logistics_factor_sets 重打了一次 —— 那是為了避免前端為了三個係數
 * 而載入 1,293 筆的係數庫。重打就有漂移風險,故在此以 coefficientId 對回
 * true_esg_coefficients 逐欄斷言:係數庫換版而某筆數值或來源改變時,
 * 測試失敗而非讓報告靜默印出過期的係數。
 */
describe("LOGISTICS_FACTOR_SETS 對係數庫的一致性", () => {
  /**
   * Info: (20260801 - Luphia) 只取實際持有這六筆的兩個匯出,而非彙總全部 1,293 筆:
   * 斷言的對象是這六筆,拉進整個係數庫只會讓測試變慢且無助於檢出漂移。
   */
  const byId = new Map(
    [
      ...TRUE_COEFFICIENT_DATA_TAIWAN,
      ...TRUE_COEFFICIENT_DATA_DEFRA_PART_2,
    ].map((item) => [item.id, item] as const),
  );

  const allEntries: [string, string, IEmissionFactorEntry][] = Object.entries(
    LOGISTICS_FACTOR_SETS,
  ).flatMap(([setKey, set]) =>
    Object.entries(set).map(
      ([mode, entry]) =>
        [setKey, mode, entry as IEmissionFactorEntry] as [
          string,
          string,
          IEmissionFactorEntry,
        ],
    ),
  );

  it.each(allEntries)(
    "%s / %s 的 coefficientId 存在於係數庫",
    (_s, _m, entry) => {
      expect(byId.has(entry.coefficientId)).toBe(true);
    },
  );

  it.each(allEntries)("%s / %s 的係數值與係數庫一致", (_s, _m, entry) => {
    expect(byId.get(entry.coefficientId)?.emissionFactor).toBe(entry.factor);
  });

  it.each(allEntries)("%s / %s 的品項名稱與係數庫一致", (_s, _m, entry) => {
    expect(byId.get(entry.coefficientId)?.name).toBe(entry.itemName);
  });

  /**
   * Info: (20260801 - Luphia) 單位必須是 t-km 基準。公式為
   * 距離(km) × 重量(公噸) × 係數,單位若換成每公升或每車公里,整個計算就錯了。
   */
  it.each(allEntries)("%s / %s 的單位為延噸公里基準", (_s, _m, entry) => {
    const unit = byId.get(entry.coefficientId)?.unit ?? "";
    expect(unit).toMatch(/tkm|tonne\.km/);
  });
});

describe("係數組的組態", () => {
  it("預設為環境部", () => {
    expect(DEFAULT_FACTOR_SET).toBe(FactorSetEnum.MOENV);
  });

  it("選單順序以預設組居首", () => {
    expect(FACTOR_SET_ORDER[0]).toBe(DEFAULT_FACTOR_SET);
  });

  /**
   * Info: (20260801 - Luphia) 未知或缺值退回預設而不 throw:
   * 係數組是顯示層的選擇,一個過期的請求不該讓整批匯出失敗。
   */
  it.each([undefined, "", "NOT_A_SET"])("輸入 %s 時退回預設組", (input) => {
    expect(resolveFactorSet(input)).toBe(
      LOGISTICS_FACTOR_SETS[DEFAULT_FACTOR_SET],
    );
  });
});

/**
 * Info: (20260801 - Luphia) 來源字串必須揭露區域與年份。
 *
 * 環境部產品碳足跡資訊網收錄的海運與空運係數,生產區域是**美國**、
 * 公告年份為 2016 / 2017 —— 只寫「環境部」會讓查核者誤以為那是臺灣本土係數。
 * 這一項是本次改用環境部係數的前提條件,固化以免日後被簡化掉。
 */
describe("formatFactorSource 的揭露", () => {
  it("環境部海運揭露美國區域與 2016 年", () => {
    const text = formatFactorSource(
      LOGISTICS_FACTOR_SETS[FactorSetEnum.MOENV].SEA,
    );
    expect(text).toContain("美國");
    expect(text).toContain("2016");
  });

  it("環境部空運揭露美國區域與 2017 年", () => {
    const text = formatFactorSource(
      LOGISTICS_FACTOR_SETS[FactorSetEnum.MOENV].AIR,
    );
    expect(text).toContain("美國");
    expect(text).toContain("2017");
  });

  it("環境部陸運揭露臺灣區域與 2022 年", () => {
    const text = formatFactorSource(
      LOGISTICS_FACTOR_SETS[FactorSetEnum.MOENV].LAND,
    );
    expect(text).toContain("臺灣");
    expect(text).toContain("2022");
  });

  // Info: (20260801 - Luphia) DEFRA 未標區域年份,不可憑空補上
  it("DEFRA 不虛構區域或年份", () => {
    const text = formatFactorSource(
      LOGISTICS_FACTOR_SETS[FactorSetEnum.DEFRA].AIR,
    );
    expect(text).toContain("UK DEFRA 2025");
    expect(text).not.toMatch(/公告/);
  });
});

/**
 * Info: (20260801 - Luphia) 版本標籤以「組代碼 + 各模式公告年份」構成。
 * 不另立人工版號:版號要人維護且會忘記更新,而年份直接來自係數本身,
 * 換係數必然改變標籤。
 */
describe("formatFactorSetVersion", () => {
  it("環境部組含三個模式的公告年份且去重排序", () => {
    expect(
      formatFactorSetVersion(
        FactorSetEnum.MOENV,
        LOGISTICS_FACTOR_SETS[FactorSetEnum.MOENV],
      ),
    ).toBe("MOENV/2016-2017-2022");
  });

  // Info: (20260801 - Luphia) DEFRA 未標公告年份,不虛構補上
  it("DEFRA 組僅有組代碼", () => {
    expect(
      formatFactorSetVersion(
        FactorSetEnum.DEFRA,
        LOGISTICS_FACTOR_SETS[FactorSetEnum.DEFRA],
      ),
    ).toBe("DEFRA");
  });
});

/**
 * Info: (20260801 - Luphia) 換組的影響完全取決於路線組成,故必須以實際段落試算。
 * 給一個「約 ±X%」的通用數字會在半數情況下誤導 —— 以下兩個案例即為證明:
 *   以長程空運為主   DEFRA / MOENV = 0.52（−48%）
 *   純陸運           DEFRA / MOENV = 0.86（−14%）
 */
describe("compareFactorSetTotals", () => {
  const airHeavy = [
    { mode: "LAND", distanceKm: 21.91 },
    { mode: "AIR", distanceKm: 9716.63 },
    { mode: "LAND", distanceKm: 16.1 },
  ];

  it("重現 R02 兩組的總排放", () => {
    const impacts = compareFactorSetTotals(airHeavy, 1000);
    const moenv = impacts.find((i) => i.setKey === FactorSetEnum.MOENV);
    const defra = impacts.find((i) => i.setKey === FactorSetEnum.DEFRA);
    expect(moenv?.totalCo2eKg).toBeCloseTo(11276.27, 1);
    expect(defra?.totalCo2eKg).toBeCloseTo(5856.62, 1);
  });

  it("空運為主與純陸運的換組倍數明顯不同", () => {
    const air = factorSetDeltaRatio(
      compareFactorSetTotals(airHeavy, 1000),
      FactorSetEnum.MOENV,
      FactorSetEnum.DEFRA,
    );
    const land = factorSetDeltaRatio(
      compareFactorSetTotals([{ mode: "LAND", distanceKm: 500 }], 1000),
      FactorSetEnum.MOENV,
      FactorSetEnum.DEFRA,
    );
    expect(air).toBeCloseTo(0.5194, 3);
    expect(land).toBeCloseTo(0.8618, 3);
  });

  it("忽略未知模式與距離不可用的段落", () => {
    const impacts = compareFactorSetTotals(
      [
        { mode: "RAIL", distanceKm: 100 },
        { mode: "LAND" },
        { mode: "LAND", distanceKm: 100 },
      ],
      1000,
    );
    expect(
      impacts.find((i) => i.setKey === FactorSetEnum.MOENV)?.totalCo2eKg,
    ).toBeCloseTo(13.1, 6);
  });

  /**
   * Info: (20260801 - Luphia) 算不出來就回 undefined,不以 0 或 1 充數 ——
   * 1 會被讀成「沒有差異」,而事實是「無從比較」。
   */
  it.each([
    ["無可用段落", [] as { mode?: string; distanceKm?: number }[], 1000],
    ["全部為未知模式", [{ mode: "RAIL", distanceKm: 5 }], 1000],
    ["重量為零", [{ mode: "LAND", distanceKm: 100 }], 0],
    ["重量為負", [{ mode: "LAND", distanceKm: 100 }], -5],
  ])("%s 時不給總計也不給倍數", (_label, legs, weight) => {
    const impacts = compareFactorSetTotals(legs, weight);
    expect(impacts.every((i) => i.totalCo2eKg === undefined)).toBe(true);
    expect(
      factorSetDeltaRatio(impacts, FactorSetEnum.MOENV, FactorSetEnum.DEFRA),
    ).toBeUndefined();
  });
});
