// Info: (20260724 - Tzuhan) 總結報表測試:分欄不混雜、逐段勾稽(各段相加=方案總計)、係數重算驗證、N/A、CSV 跳脫、legacy 係數修正

import { describe, it, expect } from "@jest/globals";
import {
  buildBatchSummaryCsv,
  buildPlanFromLegacyBatchItem,
  getHeadlineCo2e,
} from "@/lib/utils/logistics_report";
import { ROUTE_MODE } from "@/constants/analysis";
import { EMISSION_FACTORS } from "@/constants/logistics";
import { MoneyUtil } from "@/lib/utils/money";
import { ILogisticsPlan, ITransportSegment } from "@/interfaces/logistics";
import { IMileageBatchResult } from "@/components/transportation_carbon_footprint_calculator/mileage_batch_results";

const leg = (
  distanceKm: number,
  co2eKg: string,
  realGeometry = true,
): ITransportSegment => ({
  success: true,
  distanceKm,
  co2eKg,
  geometry: realGeometry
    ? {
        type: "LineString",
        coordinates: [
          [121, 25],
          [122, 26],
          [123, 27],
        ],
      }
    : null,
});

// Info: (20260724 - Tzuhan) 跨海路線:陸運 fallback(不適用)、海空聯運皆適用
const crossSeaItem: IMileageBatchResult = {
  origin: { lat: 25.03, lng: 121.56, name: "台北市, 信義區" },
  dest: { lat: 31.23, lng: 121.47, name: "Shanghai" },
  mode: ROUTE_MODE.SEA_LAND,
  plan: {
    // Info: (20260729 - Tzuhan) issue 11:港口/機場節點含經緯度,CSV 逐段揭露端點座標
    exportPort: { name: "Keelung", lat: 25.13, lng: 121.74 },
    importPort: { name: "Shanghai Port", lat: 31.23, lng: 121.49 },
    exportAirport: { name: "TPE", lat: 25.08, lng: 121.23 },
    importAirport: { name: "PVG", lat: 31.14, lng: 121.8 },
    comparisonData: {
      success: true,
      plans: {
        landOnly: { success: false, distanceKm: 0, geometry: null },
        sea_multimodal: {
          land_origin_to_port: leg(30, "16.93"),
          sea_port_to_port: leg(800, "41.80"),
          land_port_to_dest: leg(40, "22.58"),
          total_co2eKg: "81.31",
        },
        air_multimodal: {
          land_origin_to_airport: leg(25, "14.11"),
          air_airport_to_airport: leg(690, "2077.94"),
          land_airport_to_dest: leg(30, "16.93"),
          total_co2eKg: "2108.98",
        },
      },
    },
  } as unknown as ILogisticsPlan,
};

// Info: (20260724 - Tzuhan) 國內短程:僅純陸運適用
const domesticItem: IMileageBatchResult = {
  origin: "Taipei",
  dest: "Kaohsiung",
  mode: ROUTE_MODE.LAND,
  plan: {
    exportPort: null,
    importPort: null,
    exportAirport: null,
    importAirport: null,
    comparisonData: {
      success: true,
      plans: {
        landOnly: leg(350, "197.56"),
        sea_multimodal: {
          land_origin_to_port: leg(30, "0"),
          sea_port_to_port: leg(320, "0"),
          land_port_to_dest: leg(20, "0"),
          total_co2eKg: "0",
        },
        air_multimodal: {
          land_origin_to_airport: leg(25, "0"),
          air_airport_to_airport: leg(300, "0"),
          land_airport_to_dest: leg(35, "0"),
          total_co2eKg: "0",
        },
      },
    },
  } as unknown as ILogisticsPlan,
};

// Info: (20260728 - Tzuhan) issue 07:接駁陸段為直線 fallback(OSRM 圖資範圍外),距離須標示 * 估算值
const fallbackFeederItem: IMileageBatchResult = {
  origin: "Paris",
  dest: "Berlin",
  mode: ROUTE_MODE.SEA_LAND,
  // Info: (20260728 - Tzuhan) issue 08:自帶每列重量,CSV Weight 欄應顯示 3000 而非批次參數
  weightKg: 3000,
  plan: {
    exportPort: null,
    importPort: null,
    exportAirport: null,
    importAirport: null,
    comparisonData: {
      success: true,
      plans: {
        landOnly: { success: false, distanceKm: 0, geometry: null },
        sea_multimodal: {
          land_origin_to_port: { ...leg(30, "16.93"), isFallback: true },
          sea_port_to_port: leg(800, "41.80"),
          land_port_to_dest: { ...leg(40, "22.58"), isFallback: true },
          total_co2eKg: "81.31",
        },
        air_multimodal: {
          land_origin_to_airport: { ...leg(25, "14.11"), isFallback: true },
          air_airport_to_airport: leg(690, "2077.94"),
          land_airport_to_dest: { ...leg(30, "16.93"), isFallback: true },
          total_co2eKg: "2108.98",
        },
      },
    },
  } as unknown as ILogisticsPlan,
};

// Info: (20260729 - Tzuhan) issue 10:海陸空聯運(5 段串聯)fixture
const seaLandAirItem: IMileageBatchResult = {
  origin: { lat: 50.08, lng: 14.42, name: "Prague" },
  dest: { lat: 41.88, lng: -87.62, name: "Chicago" },
  mode: ROUTE_MODE.SEA_LAND_AIR,
  weightKg: 4000,
  plan: {
    exportPort: { name: "Hamburg", lat: 53.55, lng: 9.99 },
    importPort: { name: "New York Port", lat: 40.67, lng: -74.04 },
    exportAirport: { name: "PRG", lat: 50.1, lng: 14.26 },
    importAirport: { name: "ORD", lat: 41.98, lng: -87.9 },
    comparisonData: {
      success: true,
      plans: {
        landOnly: { success: false, distanceKm: 0, geometry: null },
        sea_multimodal: {
          land_origin_to_port: leg(700, "316.09"),
          sea_port_to_port: leg(6200, "259.16"),
          land_port_to_dest: leg(1300, "587.03"),
          total_co2eKg: "1162.28",
        },
        air_multimodal: {
          land_origin_to_airport: leg(20, "9.03"),
          air_airport_to_airport: leg(7000, "16864.40"),
          land_airport_to_dest: leg(30, "13.55"),
          total_co2eKg: "16886.98",
        },
        sea_land_air_multimodal: {
          land_origin_to_port: leg(700, "316.09"),
          sea_port_to_port: leg(6200, "259.16"),
          land_port_to_airport: leg(30, "13.55"),
          air_airport_to_airport: leg(1200, "2891.04"),
          land_airport_to_dest: leg(25, "11.29"),
          total_co2eKg: "3491.13",
          transitAirport: { name: "JFK", lat: 40.64, lng: -73.78 },
          isApplicable: true,
        },
      },
    },
  } as unknown as ILogisticsPlan,
};

describe("buildBatchSummaryCsv (long format, issue 11)", () => {
  const csv = buildBatchSummaryCsv(
    [crossSeaItem, domesticItem, fallbackFeederItem],
    [0, 1, 2],
    new Map([
      [0, ["route_1_sea_multimodal.pdf", "route_1_air_multimodal.pdf"]],
      [1, ["route_2_land_only.pdf"]],
      [2, ["route_3_sea_multimodal.pdf"]],
    ]),
    5000,
    "20260729-1435",
  );
  const lines = csv.split("\n");
  const header = lines[1].split(",");
  const body = lines.slice(2);
  const cellsOf = (line: string): string[] => {
    // Info: (20260729 - Tzuhan) 測試用簡易 CSV 解析(支援雙引號包裹欄位)
    const out: string[] = [];
    let cur = "";
    let inQuote = false;
    for (const ch of line) {
      if (ch === '"') inQuote = !inQuote;
      else if (ch === "," && !inQuote) {
        out.push(cur);
        cur = "";
      } else cur += ch;
    }
    out.push(cur);
    return out;
  };
  const col = (line: string, name: string): string =>
    cellsOf(line)[header.indexOf(name)];

  it("檔頭揭露公式、單一來源係數與 long format 語意", () => {
    expect(lines[0]).toContain("CO2e(kg) = distance(km) x weight(t) x factor");
    expect(lines[0]).toContain(`LAND ${EMISSION_FACTORS.LAND}`);
    expect(lines[0]).toContain(`SEA ${EMISSION_FACTORS.SEA}`);
    expect(lines[0]).toContain(`AIR ${EMISSION_FACTORS.AIR}`);
    expect(lines[0]).toContain("One row per plan leg");
    expect(lines[0]).toContain("Estimated? = Y");
  });

  it("欄位含模式、端點名稱與經緯度、逐段係數與來源", () => {
    [
      "Plan",
      "Leg #",
      "Mode",
      "From Name",
      "From Lat",
      "From Lng",
      "To Name",
      "To Lat",
      "To Lng",
      "Distance (km)",
      "Estimated?",
      "Factor (kg CO2e/t-km)",
      "Factor Source",
      "Leg CO2e (kg)",
      "Plan Total CO2e (kg)",
    ].forEach((name) => expect(header).toContain(name));
  });

  it("同起訖點多方案分列:跨海路線出海運 3 段 + 空運 3 段,無陸運列", () => {
    const route1 = body.filter((line) => col(line, "Route #") === "1");
    expect(route1).toHaveLength(6);
    expect(
      route1.filter((l) => col(l, "Plan") === "Sea Multimodal"),
    ).toHaveLength(3);
    expect(
      route1.filter((l) => col(l, "Plan") === "Air Multimodal"),
    ).toHaveLength(3);
    // Info: (20260729 - Tzuhan) 陸運不適用 → 不產列(取代舊版 N/A 欄位)
    expect(route1.filter((l) => col(l, "Plan") === "Land Only")).toHaveLength(
      0,
    );
  });

  it("國內路線只出陸運 1 列(海空不適用不產列)", () => {
    const route2 = body.filter((line) => col(line, "Route #") === "2");
    expect(route2).toHaveLength(1);
    expect(col(route2[0], "Plan")).toBe("Land Only");
    expect(col(route2[0], "Mode")).toBe("LAND");
    expect(col(route2[0], "Distance (km)")).toBe("350.00");
  });

  it("逐段揭露端點經緯度與係數來源", () => {
    const seaLeg = body.find(
      (line) =>
        col(line, "Route #") === "1" &&
        col(line, "Plan") === "Sea Multimodal" &&
        col(line, "Mode") === "SEA",
    )!;
    expect(col(seaLeg, "From Name")).toBe("Keelung");
    expect(col(seaLeg, "From Lat")).toBe("25.13");
    expect(col(seaLeg, "To Name")).toBe("Shanghai Port");
    expect(col(seaLeg, "To Lng")).toBe("121.49");
    expect(col(seaLeg, "Factor (kg CO2e/t-km)")).toBe(EMISSION_FACTORS.SEA);
    expect(col(seaLeg, "Factor Source")).toContain("DEFRA");
  });

  it("各段相加 = 方案總計(勾稽),Plan Total 僅於末段填值", () => {
    const seaLegs = body.filter(
      (line) =>
        col(line, "Route #") === "1" && col(line, "Plan") === "Sea Multimodal",
    );
    const sum = seaLegs.reduce(
      (acc, line) => acc.plus(col(line, "Leg CO2e (kg)")),
      MoneyUtil.toDecimal(0),
    );
    expect(col(seaLegs[0], "Plan Total CO2e (kg)")).toBe("");
    expect(col(seaLegs[2], "Plan Total CO2e (kg)")).toBe("81.31");
    expect(sum.toFixed(2)).toBe("81.31");
  });

  it("fallback 段標示 Estimated? = Y,真實路網段為 N(issue 07)", () => {
    const legs = body.filter(
      (line) =>
        col(line, "Route #") === "3" && col(line, "Plan") === "Sea Multimodal",
    );
    expect(col(legs[0], "Estimated?")).toBe("Y");
    expect(col(legs[1], "Estimated?")).toBe("N");
    expect(col(legs[2], "Estimated?")).toBe("Y");
  });

  it("Weight 欄用每列實際重量,缺漏時退回批次參數(issue 08)", () => {
    expect(lines[0]).toContain("Weight column = per-route weight");
    const route1 = body.find((line) => col(line, "Route #") === "1")!;
    const route3 = body.find((line) => col(line, "Route #") === "3")!;
    expect(col(route1, "Weight (kg)")).toBe("5000");
    expect(col(route3, "Weight (kg)")).toBe("3000");
  });

  it("Plan Code 為首欄且同方案各段共用同一代碼(PDF/CSV 交叉索引)", () => {
    expect(header[0]).toBe("Plan Code");
    const seaLegs = body.filter(
      (line) =>
        col(line, "Route #") === "1" && col(line, "Plan") === "Sea Multimodal",
    );
    const airLegs = body.filter(
      (line) =>
        col(line, "Route #") === "1" && col(line, "Plan") === "Air Multimodal",
    );
    // Info: (20260729 - Tzuhan) 同方案 3 段共用 R01-SEA;空運方案為 R01-AIR,一眼可分辨群組
    expect(seaLegs.map((line) => col(line, "Plan Code"))).toEqual([
      "R01-SEA",
      "R01-SEA",
      "R01-SEA",
    ]);
    expect(airLegs.every((line) => col(line, "Plan Code") === "R01-AIR")).toBe(
      true,
    );
    // Info: (20260729 - Tzuhan) 第 2 條路線的陸運方案為 R02-LAND
    const route2 = body.find((line) => col(line, "Route #") === "2")!;
    expect(col(route2, "Plan Code")).toBe("R02-LAND");
  });

  it("檔頭揭露 Export ID 與 Plan Code 對照語意", () => {
    expect(lines[0]).toContain("Export ID: 20260729-1435");
    expect(lines[0]).toContain("Plan Code (R{route}-{MODE})");
  });

  it("Report Files 僅於方案末段填值", () => {
    const seaLegs = body.filter(
      (line) =>
        col(line, "Route #") === "1" && col(line, "Plan") === "Sea Multimodal",
    );
    expect(col(seaLegs[0], "Report Files")).toBe("");
    expect(col(seaLegs[2], "Report Files")).toContain(
      "route_1_sea_multimodal.pdf",
    );
  });
});

describe("buildPlanFromLegacyBatchItem", () => {
  it("海陸聯運 legacy:以 EMISSION_FACTORS 重算(修正舊版 0.01614 錯誤係數)且 Decimal 無浮點誤差", () => {
    const plan = buildPlanFromLegacyBatchItem(
      {
        origin: "A",
        dest: "B",
        landDistanceKm: 100,
        seaDistanceKm: 800,
      },
      5000,
    );
    const seaPlan = plan.comparisonData.plans.sea_multimodal;

    // Info: (20260724 - Tzuhan) 800km x 5t x 0.01045 = 41.80(舊係數 0.01614 會得 64.56,已修正)
    expect(seaPlan.sea_port_to_port.co2eKg).toBe("41.80");
    // Info: (20260724 - Tzuhan) 接駁陸段歸入第一段:100km x 5t x 0.11289 = 56.45
    expect(seaPlan.land_origin_to_port.co2eKg).toBe("56.45");
    expect(seaPlan.land_origin_to_port.distanceKm).toBe(100);
    // Info: (20260724 - Tzuhan) 勾稽:各段相加 = 方案總計
    expect(seaPlan.total_co2eKg).toBe("98.25");
  });

  it("純陸運 legacy:landOnly 成立且海空不成立", () => {
    const plan = buildPlanFromLegacyBatchItem(
      { origin: "A", dest: "B", landDistanceKm: 350 },
      1000,
    );
    expect(plan.comparisonData.plans.landOnly.success).toBe(true);
    expect(plan.comparisonData.plans.landOnly.co2eKg).toBe("39.51");
    expect(
      plan.comparisonData.plans.sea_multimodal.sea_port_to_port.success,
    ).toBe(false);
    expect(
      plan.comparisonData.plans.air_multimodal.air_airport_to_airport.success,
    ).toBe(false);
  });
});

// Info: (20260728 - Tzuhan) issue 09:批次標頭碳排徽章取值(修正聯運路線恆顯示 0)
describe("getHeadlineCo2e", () => {
  it("SEA_LAND 取海運方案總計而非 landOnly 的 0", () => {
    const headline = getHeadlineCo2e(crossSeaItem);
    expect(headline?.value).toBe("81.31");
    expect(headline?.isEstimated).toBe(false);
  });

  it("LAND 取陸運方案", () => {
    const headline = getHeadlineCo2e(domesticItem);
    expect(headline?.value).toBe("197.56");
    expect(headline?.isEstimated).toBe(false);
  });

  it("所選方案含 fallback 接駁段時標示估算", () => {
    const headline = getHeadlineCo2e(fallbackFeederItem);
    expect(headline?.value).toBe("81.31");
    expect(headline?.isEstimated).toBe(true);
  });

  it("無 mode 時依適用性引擎推導(跨海 → 海運總計)", () => {
    const headline = getHeadlineCo2e({ ...crossSeaItem, mode: undefined });
    expect(headline?.value).toBe("81.31");
  });

  it("無 plan 回傳 null", () => {
    expect(getHeadlineCo2e({ origin: "A", dest: "B" })).toBeNull();
  });
});

// Info: (20260729 - Tzuhan) issue 10:海陸空聯運在 CSV/標頭的呈現
describe("SEA_LAND_AIR plan (issue 10)", () => {
  const csv = buildBatchSummaryCsv(
    [seaLandAirItem],
    [0],
    new Map([[0, ["R01-SLA_sea_land_air_multimodal.pdf"]]]),
    1000,
    "20260729-1500",
  );
  const lines = csv.split("\n");
  const header = lines[1].split(",");
  const body = lines.slice(2);
  const col = (line: string, name: string): string =>
    line.split(",")[header.indexOf(name)];

  it("CSV 以 5 段成列且不需新增欄位(long format 效益)", () => {
    const slaRows = body.filter(
      (line) => col(line, "Plan") === "Sea-Land-Air Multimodal",
    );
    expect(slaRows).toHaveLength(5);
    expect(slaRows.map((line) => col(line, "Mode"))).toEqual([
      "LAND",
      "SEA",
      "LAND",
      "AIR",
      "LAND",
    ]);
    expect(lines[1].split(",")).toHaveLength(header.length);
  });

  it("中轉機場端點揭露(進口港 → 中轉機場 → 目的機場)", () => {
    const slaRows = body.filter(
      (line) => col(line, "Plan") === "Sea-Land-Air Multimodal",
    );
    expect(col(slaRows[2], "From Name")).toBe("New York Port");
    expect(col(slaRows[2], "To Name")).toBe("JFK");
    expect(col(slaRows[3], "From Name")).toBe("JFK");
    expect(col(slaRows[3], "To Name")).toBe("ORD");
    expect(col(slaRows[3], "From Lat")).toBe("40.64");
  });

  it("各段相加 = 方案總計(5 段勾稽)", () => {
    const slaRows = body.filter(
      (line) => col(line, "Plan") === "Sea-Land-Air Multimodal",
    );
    const sum = slaRows.reduce(
      (acc, line) => acc.plus(col(line, "Leg CO2e (kg)")),
      MoneyUtil.toDecimal(0),
    );
    expect(sum.toFixed(2)).toBe("3491.13");
    expect(col(slaRows[4], "Plan Total CO2e (kg)")).toBe("3491.13");
  });

  it("海陸空聯運的方案代碼為 R01-SLA(5 段共用)", () => {
    const slaRows = body.filter(
      (line) => col(line, "Plan") === "Sea-Land-Air Multimodal",
    );
    expect(slaRows.every((line) => col(line, "Plan Code") === "R01-SLA")).toBe(
      true,
    );
  });

  it("標頭碳排取三模式方案自身總計,不再誤用空運方案", () => {
    const headline = getHeadlineCo2e(seaLandAirItem);
    expect(headline?.value).toBe("3491.13");
    expect(headline?.isEstimated).toBe(false);
  });
});
