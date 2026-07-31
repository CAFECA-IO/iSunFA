// Info: (20260724 - Tzuhan) 總結報表測試:分欄不混雜、逐段勾稽(各段相加=方案總計)、係數重算驗證、N/A、CSV 跳脫、legacy 係數修正

import { describe, it, expect } from "@jest/globals";
import {
  buildBatchSummaryCsv,
  buildPlanFromLegacyBatchItem,
} from "@/lib/utils/logistics_report";
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
  origin: "台北市, 信義區",
  dest: "Shanghai",
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

describe("buildBatchSummaryCsv", () => {
  const csv = buildBatchSummaryCsv(
    [crossSeaItem, domesticItem, fallbackFeederItem],
    [0, 1, 2],
    new Map([
      [0, ["route_1_sea_multimodal.pdf", "route_1_air_multimodal.pdf"]],
      [1, ["route_2_land_only.pdf"]],
      [2, ["route_3_sea_multimodal.pdf"]],
    ]),
    5000,
  );
  const lines = csv.split("\n");

  it("檔頭揭露公式與單一來源係數", () => {
    expect(lines[0]).toContain("CO2e(kg) = distance(km) x weight(t) x factor");
    expect(lines[0]).toContain(`LAND ${EMISSION_FACTORS.LAND}`);
    expect(lines[0]).toContain(`SEA ${EMISSION_FACTORS.SEA}`);
    expect(lines[0]).toContain(`AIR ${EMISSION_FACTORS.AIR}`);
  });

  it("欄位按方案分組且逐段展開(海運方案的陸運接駁段獨立成欄)", () => {
    expect(lines[1]).toContain("Sea Plan: Land Leg Origin->Port (km)");
    expect(lines[1]).toContain("Sea Plan: Sea Leg Port->Port (km)");
    expect(lines[1]).toContain("Sea Plan: Land Leg Port->Dest (km)");
    expect(lines[1]).toContain("Air Plan: Air Leg Airport->Airport (km)");
  });

  it("跨海路線:陸運欄 N/A,海運方案各段相加=方案總計(勾稽)", () => {
    // Info: (20260724 - Tzuhan) origin 含逗號 → 被引號包裹,直接以字串檢查
    const row = lines[2];
    expect(row).toContain('"台北市, 信義區"');
    const cells = row.replace('"台北市, 信義區",', "").split(",");
    // Info: (20260724 - Tzuhan) cells: [dest, weight, landDist, landCo2e, seaLeg1Km, seaLeg1Co2e, seaLegKm, seaLegCo2e, seaLeg3Km, seaLeg3Co2e, seaTotal, ...]
    expect(cells[2]).toBe("N/A");
    expect(cells[3]).toBe("N/A");
    const seaSum = MoneyUtil.toDecimal(cells[5]).plus(cells[7]).plus(cells[9]);
    expect(seaSum.toFixed(2)).toBe(MoneyUtil.toDecimal(cells[10]).toFixed(2));
  });

  it("國內路線:海空欄全為 N/A,不輸出誤導性的 0", () => {
    const row = lines[3];
    const cells = row.split(",");
    // Info: (20260724 - Tzuhan) 海運方案 7 欄(index 5-11)與空運方案 7 欄(index 12-18)皆 N/A
    for (let i = 5; i <= 18; i++) {
      expect(cells[i]).toBe("N/A");
    }
    expect(cells[3]).toBe("350.00");
  });

  it("直線 fallback 距離加 * 後綴且檔頭揭露說明(issue 07)", () => {
    expect(lines[0]).toContain("* = estimated distance");
    const row = lines[4];
    // Info: (20260728 - Tzuhan) 接駁陸段為 fallback → 標 *;真實海運主段不標
    expect(row).toContain("30.00*");
    expect(row).toContain("40.00*");
    expect(row).toContain(",800.00,");
    expect(row).not.toContain("800.00*");
  });

  it("Weight 欄用每列實際重量,缺漏時退回批次參數(issue 08)", () => {
    expect(lines[0]).toContain("Weight column = per-route weight");
    // Info: (20260728 - Tzuhan) 第 2 列(index 0/1)無自帶重量 → fallback 5000;第 4 列自帶 3000
    expect(lines[2].split(",")[3]).toBe("5000");
    expect(lines[4].split(",")[2]).toBe("3000");
  });

  it("Report Files 欄列出該路線的獨立 PDF 檔名", () => {
    expect(lines[2]).toContain(
      "route_1_sea_multimodal.pdf; route_1_air_multimodal.pdf",
    );
    expect(lines[3]).toContain("route_2_land_only.pdf");
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
