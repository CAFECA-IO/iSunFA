import * as fs from "fs";
import * as path from "path";

export async function convertSpecsToCsv(
  stockId: string,
  year: string = "2024",
  options?: { baseDirOverride?: string; targetProductId?: string },
) {
  const dataDir = path.resolve(process.cwd(), `data/${stockId}/${year}`);
  const baseDir = options?.baseDirOverride || path.join(dataDir, "outputs");
  const mockSourcesDir = path.join(baseDir, "mock_sources");
  const bomPath = path.join(mockSourcesDir, "boms_and_precursors.json");

  if (!fs.existsSync(bomPath)) {
    console.error(`❌ Missing BOM file: ${bomPath}`);
    return;
  }

  const bomRaw = JSON.parse(fs.readFileSync(bomPath, "utf-8"));

  console.log(
    `🚀 [Specs CSV Converter] 開始為 ${bomRaw.products.length} 項產品生成 產品規格與技術手冊 CSV...`,
  );

  for (const product of bomRaw.products) {
    if (
      options?.targetProductId &&
      product.productId !== options.targetProductId
    )
      continue;
    const productId = product.productId;
    const productMockDir = path.join(baseDir, productId, "mock_sources");

    const specsPath = path.join(
      productMockDir,
      `${productId}_product_specs.json`,
    );
    const outFile = path.join(productMockDir, `${productId}_product_specs.csv`);

    if (!fs.existsSync(specsPath)) {
      console.warn(
        `⚠️ [${productId}] 找不到對應的 Specs JSON，跳過 CSV 產出。`,
      );
      continue;
    }

    const specsData = JSON.parse(fs.readFileSync(specsPath, "utf-8"));

    const csvLines = [
      "Category,Key,Value",
      `General,Product ID,${specsData.productId}`,
      `General,Product Name,${specsData.productName}`,
      `Durability,Physical Lifespan (Years),${specsData.durability?.physicalLifespanYears || "N/A"}`,
      `Durability,Max Operating Temp (C),${specsData.durability?.maxOperatingTemperature_C || "N/A"}`,
      `Durability,Operating Conditions,"${(specsData.durability?.operatingConditions || "N/A").replace(/"/g, '""')}"`,
      `Repair & Teardown,Is Repairable,${specsData.repairAndTeardown?.isRepairable ? "Yes" : "No"}`,
      `Repair & Teardown,Requires Special Tools,${specsData.repairAndTeardown?.requiresSpecialTools ? "Yes" : "No"}`,
      `Repair & Teardown,Tool List,"${(specsData.repairAndTeardown?.toolList || []).join(", ").replace(/"/g, '""')}"`,
      `Repair & Teardown,Teardown Effort,${specsData.repairAndTeardown?.teardownEffort || "N/A"}`,
      `Repair & Teardown,Guidelines,"${(specsData.repairAndTeardown?.guidelines || "N/A").replace(/"/g, '""')}"`,
      `Disposal,Recyclability Rate (%),${specsData.disposal?.recyclabilityRate_percent || "0"}`,
      `Disposal,Disposal Method,"${(specsData.disposal?.disposalMethod || "N/A").replace(/"/g, '""')}"`,
      `Disposal,Instructions,"${(specsData.disposal?.instructions || "N/A").replace(/"/g, '""')}"`,
    ];

    fs.writeFileSync(outFile, "\uFEFF" + csvLines.join("\n")); // Add BOM for excel support
    console.log(`✅ [${productId}] 生成 CSV 完成: ${outFile}`);
  }
}

// Support direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const stockId = process.argv[2];
  const year = process.argv[3];
  if (!stockId || !year) {
    console.error("Usage: npx tsx convert_specs_to_csv.ts <stockId> <year>");
    process.exit(1);
  }
  convertSpecsToCsv(stockId, year)
    .then(() => {
      console.log("Done.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Error:", err);
      process.exit(1);
    });
}
