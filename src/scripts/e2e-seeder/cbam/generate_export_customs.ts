import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import {
  IBomData,
  IMesWorkOrder,
  ICustomsExportLog,
  IProductBom,
} from "@/interfaces/cbam";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFloat(min: number, max: number, decimals: number = 2) {
  const str = (Math.random() * (max - min) + min).toFixed(decimals);
  return parseFloat(str);
}

export async function generateCustomsLogs(
  stockId: string,
  year: string = "2024",
) {
  const dataDir = path.resolve(process.cwd(), `data/${stockId}/${year}`);
  const mockSourcesDir = path.join(dataDir, "outputs", "mock_sources");
  const ingestionDir = path.join(dataDir, "outputs", "system_ingestion");
  
  if (!fs.existsSync(ingestionDir)) {
    fs.mkdirSync(ingestionDir, { recursive: true });
  }

  const bomFile = path.join(mockSourcesDir, "boms_and_precursors.json");
  const mesFile = path.join(ingestionDir, "mes_work_orders.csv");
  const outFile = path.join(ingestionDir, "customs_export_declarations.csv");

  if (!fs.existsSync(mesFile) || !fs.existsSync(bomFile)) {
    console.error(`❌ 找不到必備檔案。請確認前面的腳本已執行。`);
    process.exit(1);
  }

  const mesData: IMesWorkOrder[] = parse(fs.readFileSync(mesFile, "utf-8"), {
    columns: true,
  });
  const bomData: IBomData = JSON.parse(fs.readFileSync(bomFile, "utf-8"));

  console.log(`🚀 [CBAM Customs Generator] 開始產生出口報關單紀錄...`);

  const uniqueWorkOrders = [
    ...new Set(mesData.map((r: IMesWorkOrder) => r.WorkOrderID)),
  ];
  const customsLogs: ICustomsExportLog[] = [];
  let invoiceCounter = 1;

  const euDestinations = ["Germany", "France", "Italy", "Spain", "Netherlands"];

  // Info: (20260604 - Tzuhan) 優化效能：使用 Map 來快取工單關聯，避免 O(N^2) 的陣列過濾
  const mesDataByWO = new Map<string, IMesWorkOrder[]>();
  for (const r of mesData) {
    if (!mesDataByWO.has(r.WorkOrderID)) {
      mesDataByWO.set(r.WorkOrderID, []);
    }
    mesDataByWO.get(r.WorkOrderID)!.push(r);
  }

  for (const wo of uniqueWorkOrders) {
    const woRecords = mesDataByWO.get(wo);
    if (!woRecords || woRecords.length === 0) continue;

    // Info: (20260604 - Tzuhan) 假設出貨日期為該批工單最後一個製程的後 7~14 天
    const lastProcessTime = woRecords[woRecords.length - 1].Timestamp;
    const exportDate = new Date(lastProcessTime);
    exportDate.setDate(exportDate.getDate() + getRandomInt(7, 14));

    const productId = woRecords[0].ProductID;
    const productBom = bomData.products.find(
      (p: IProductBom) => p.productId === productId,
    );

    if (!productBom) continue;

    // Info: (20260604 - Tzuhan) Mass Balance 質量守恆計算 (與 MES 連動)
    // Info: (20260604 - Tzuhan) 直接取用 MES 該工單最後一站的產出良品重，作為本次出口的淨重
    const finalProcess = woRecords[woRecords.length - 1];
    const totalNetWeightKg = Number(finalProcess.GoodWeight_kg);

    // Info: (20260604 - Tzuhan) 從 BOM 表推算單件淨重
    const mainMaterial = productBom.bom.find((b) => b.isCbamCovered);
    const unitNetWeightKg = mainMaterial
      ? mainMaterial.inputWeightKg * 0.85
      : 0.05;

    // Info: (20260604 - Tzuhan) 反推件數
    const baseQty = Math.floor(totalNetWeightKg / unitNetWeightKg);

    // Info: (20260604 - Tzuhan) 精準計算包裝材重量 (Gross - Net)
    // Info: (20260604 - Tzuhan) 找出 BOM 中不屬於 CBAM 管制的項目 (例如紙箱)
    const packagingMaterial = productBom.bom.find((b) => !b.isCbamCovered);
    const packagingWeightKg = packagingMaterial
      ? packagingMaterial.inputWeightKg * baseQty
      : totalNetWeightKg * 0.05;
    const grossWeightKg = parseFloat(
      (totalNetWeightKg + packagingWeightKg).toFixed(2),
    );

    const invoiceNo = `INV-EU-${year}-${String(invoiceCounter).padStart(5, "0")}`;
    invoiceCounter++;

    customsLogs.push({
      InvoiceNo: invoiceNo,
      Ref_WorkOrderID: wo, // Info: (20260604 - Tzuhan) 建立資料追溯鏈 (Traceability)
      ExportDate: exportDate.toISOString().split("T")[0],
      DestinationCountry:
        euDestinations[getRandomInt(0, euDestinations.length - 1)],
      CountryOfOrigin: "Taiwan", // Info: (20260604 - Tzuhan) CBAM 必備欄位：原產國
      Exporter_EORI: `TW${stockId}${getRandomInt(100000, 999999)}`, // Info: (20260604 - Tzuhan) 海關 EORI 識別碼
      ProductID: productId,
      ProductName: productBom.productName,
      CN_Code: productBom.cnCode,
      Quantity_pcs: baseQty,
      NetWeight_kg: totalNetWeightKg,
      GrossWeight_kg: grossWeightKg,
      FOB_Value_USD: Math.floor(totalNetWeightKg * getRandomFloat(3, 8)), // Info: (20260604 - Tzuhan) 假設每公斤 FOB 價值 3~8 美金
    });
  }

  customsLogs.sort(
    (a, b) =>
      new Date(a.ExportDate).getTime() - new Date(b.ExportDate).getTime(),
  );

  const csvOutput = stringify(customsLogs, { header: true });
  fs.writeFileSync(outFile, csvOutput, "utf-8");

  console.log(
    `🎉 [SUCCESS] 歐盟出口報關與商業發票已產生：${outFile} (共 ${customsLogs.length} 筆)`,
  );
}

import url from "url";
const currentFilePath = url.fileURLToPath(import.meta.url);
if (
  process.argv[1] &&
  fs.realpathSync(process.argv[1]) === fs.realpathSync(currentFilePath)
) {
  const stockId = process.argv[2];
  const year = process.argv[3] || "2024";
  if (!stockId) {
    console.error("❌ 請提供股票代號");
    process.exit(1);
  }
  generateCustomsLogs(stockId, year).catch((e) => { console.error(e); process.exit(1); });
}
