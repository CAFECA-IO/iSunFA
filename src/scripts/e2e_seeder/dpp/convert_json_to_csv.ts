import fs from "fs";
import path from "path";

export async function convertJsonToCsv(
  stockId: string,
  year: string,
  options?: { baseDirOverride?: string; targetProductId?: string },
) {
  const baseDir =
    options?.baseDirOverride ||
    path.join(process.cwd(), "data", stockId, year, "outputs");

  const bomsJsonPath = path.join(
    baseDir,
    "mock_sources",
    "boms_and_precursors.json",
  );

  if (!fs.existsSync(bomsJsonPath)) {
    console.error(`BOMs JSON not found at ${bomsJsonPath}`);
    return;
  }

  const bomsData = JSON.parse(fs.readFileSync(bomsJsonPath, "utf-8"));

  // Info: (20260608 - Tzuhan) Convert BOMs to CSV
  const csvRows = [
    "ProductId,PrecursorName,SupplierName,CountryOfOrigin,IsCbamCovered,InputWeightKg,EmbeddedEmissionsKgCO2ePerKg",
  ];

  for (const product of bomsData.products) {
    if (
      options?.targetProductId &&
      product.productId !== options.targetProductId
    )
      continue;
    for (const bom of product.bom) {
      csvRows.push(
        `${product.productId},${bom.precursorName},${bom.supplierName},${bom.countryOfOrigin},${bom.isCbamCovered ? "Yes" : "No"},${bom.inputWeightKg},${bom.embeddedEmissionsKgCO2ePerKg}`,
      );
    }
  }

  const outCsvPath = path.join(
    baseDir,
    "mock_sources",
    "boms_and_precursors.csv",
  );
  if (!fs.existsSync(path.dirname(outCsvPath))) {
    fs.mkdirSync(path.dirname(outCsvPath), { recursive: true });
  }
  fs.writeFileSync(outCsvPath, csvRows.join("\n"));
  console.log(`✅ Converted BOMs to CSV: ${outCsvPath}`);
}

const stockId = process.argv[2];
const year = process.argv[3];
const targetProductId = process.argv[4];
if (stockId && year) {
  convertJsonToCsv(stockId, year, { targetProductId }).catch(console.error);
}
