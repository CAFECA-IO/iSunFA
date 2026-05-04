import { prisma } from "@/lib/prisma";

export const logisticsCoefficients = [
  // Info: (20260430 - Tzuhan) --- 陸運 (Road Freight) ---
  {
    id: "defra-2025-frt-003",
    name: "重型大貨車 (HGV) - 全硬體式 (All rigids) - 平均載重",
    description: "適用於一般長途配送之固定車身大客車/貨車。",
    emissionFactor: 0.22415,
    unit: "kg CO2e / tonne-km",
    source: "UK Government GHG Conversion Factors 2025 (DEFRA)",
  },
  {
    id: "defra-2025-frt-004",
    name: "重型聯結車 (HGV) - 全鉸接式 (All artics) - 平均載重",
    description: "適用於大型拖板車、聯結車之大宗物資運輸。",
    emissionFactor: 0.11289,
    unit: "kg CO2e / tonne-km",
    source: "UK Government GHG Conversion Factors 2025 (DEFRA)",
  },
  {
    id: "defra-2025-frt-005",
    name: "貨運火車 (Freight train)",
    description: "適用於透過鐵路運輸的大型設備或大宗原物料。",
    emissionFactor: 0.02613,
    unit: "kg CO2e / tonne-km",
    source: "UK Government GHG Conversion Factors 2025 (DEFRA)",
  },

  // Info: (20260430 - Tzuhan) --- 海運 (Sea freight) ---
  {
    id: "defra-2025-frt-006",
    name: "平均貨櫃船 (Average container ship)",
    description: "適用於全球跨國海運貨櫃運輸（如晶圓外銷、設備進口）。",
    emissionFactor: 0.01045,
    unit: "kg CO2e / tonne-km",
    source: "UK Government GHG Conversion Factors 2025 (DEFRA)",
  },
  {
    id: "defra-2025-frt-007",
    name: "散裝船 (Bulk carrier) - 平均數值",
    description: "適用於散裝原料海運（如廢鋼、鐵礦砂）。",
    emissionFactor: 0.0024,
    unit: "kg CO2e / tonne-km",
    source: "UK Government GHG Conversion Factors 2025 (DEFRA)",
  },

  // Info: (20260430 - Tzuhan) --- 空運 (Air freight) ---
  {
    id: "defra-2025-frt-010",
    name: "短程國際航空貨運 (Short-haul international)",
    description: "適用於亞太區域內空運。包含間接效應。",
    emissionFactor: 1.1542,
    unit: "kg CO2e / tonne-km",
    source: "UK Government GHG Conversion Factors 2025 (DEFRA)",
  },
  {
    id: "defra-2025-frt-011",
    name: "長程國際航空貨運 (Long-haul international)",
    description: "適用於跨洲際空運（如台灣飛歐美）。包含間接效應。",
    emissionFactor: 0.6023,
    unit: "kg CO2e / tonne-km",
    source: "UK Government GHG Conversion Factors 2025 (DEFRA)",
  },
];

export async function seedLogisticsCoefficients() {
  console.log("🌱 Starting to seed logistics emission coefficients...");
  for (const coef of logisticsCoefficients) {
    await prisma.coefficient.upsert({
      where: { id: coef.id },
      update: {
        name: coef.name,
        description: coef.description,
        emissionFactor: coef.emissionFactor,
        unit: coef.unit,
        source: coef.source,
      },
      create: {
        id: coef.id,
        name: coef.name,
        description: coef.description,
        emissionFactor: coef.emissionFactor,
        unit: coef.unit,
        source: coef.source,
      },
    });
    console.log(`✅ Upserted coefficient: ${coef.name}`);
  }
  console.log("🎉 Logistics coefficients seeding completed!");
}
