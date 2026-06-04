import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import {
  ICompanyPersona,
  IMesWorkOrder,
  IOutsourcedLog,
  IPersonaSupplierCategory,
  IPersonaSupplier,
  IManufacturingProcess,
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

export async function generateOutsourcedLogs(
  stockId: string,
  year: string = "2024",
) {
  const dataDir = path.resolve(process.cwd(), `data/${stockId}/${year}`);
  const cbamMocksDir = path.join(dataDir, "outputs", "cbam_mocks");
  const mesFile = path.join(cbamMocksDir, "mes_work_orders.csv");
  const personaFile = path.join(
    dataDir,
    "outputs",
    "e2e_roadmap-sprint1",
    `${stockId}_company_persona.json`,
  );
  const outFile = path.join(cbamMocksDir, "outsourced_processing_logs.csv");

  if (!fs.existsSync(mesFile) || !fs.existsSync(personaFile)) {
    console.error(`❌ 找不到必備檔案。請確認前面的腳本已執行。`);
    process.exit(1);
  }

  const mesData: IMesWorkOrder[] = parse(fs.readFileSync(mesFile, "utf-8"), {
    columns: true,
  });
  const persona: ICompanyPersona = JSON.parse(
    fs.readFileSync(personaFile, "utf-8"),
  );

  const outsourcedSuppliers =
    persona.topSuppliers
      .find(
        (s: IPersonaSupplierCategory) =>
          s.category.includes("委外") || s.category.includes("外包"),
      )
      ?.suppliers.map((s: IPersonaSupplier) => s.name) || [];
  const outsourcedProcesses = persona.manufacturingProcess.filter(
    (p: IManufacturingProcess) =>
      p.description.includes("委外") || p.stepName.includes("表面處理"),
  );

  if (outsourcedProcesses.length === 0 || outsourcedSuppliers.length === 0) {
    console.log("⚠️ 該畫像中無委外製程或委外供應商，跳過產出委外紀錄。");
    return;
  }

  console.log(
    `🚀 [CBAM Outsourced Generator] 開始產生委外加工(如電鍍)採購與能耗紀錄...`,
  );

  const uniqueWorkOrders = [
    ...new Set(mesData.map((r: IMesWorkOrder) => r.WorkOrderID)),
  ];
  const outsourcedLogs: IOutsourcedLog[] = [];
  let poCounter = 1;

  // Info: (20260604 - Tzuhan) 優化效能：使用 Map 來快取工單關聯
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
    const woTimestamp = woRecords[0].Timestamp;
    const productId = woRecords[0].ProductID;

    // Info: (20260604 - Tzuhan) 取用廠內製程的第一站投入重量作為委外的基準重量 (或是您可以依照真實順序調整)
    const totalInputWeightKg = Number(woRecords[0].InputWeight_kg);

    for (const oProc of outsourcedProcesses) {
      const supplier =
        outsourcedSuppliers[getRandomInt(0, outsourcedSuppliers.length - 1)];
      const poNumber = `PO-${year}-EXT-${String(poCounter).padStart(5, "0")}`;
      poCounter++;

      const lossRate = oProc.lossRate;
      const totalOutputWeightKg = parseFloat(
        (totalInputWeightKg * (1 - lossRate)).toFixed(2),
      );

      // Info: (20260604 - Tzuhan) 模擬電鍍廠/熱處理廠回報的碳排數據 (這通常是假的或推估的)
      let reportedCarbon = 0;
      if (oProc.energyIntensity.includes("高"))
        reportedCarbon = getRandomFloat(2.5, 4.0) * totalOutputWeightKg;
      else reportedCarbon = getRandomFloat(0.5, 1.5) * totalOutputWeightKg;

      const poDate = new Date(woTimestamp);
      poDate.setDate(poDate.getDate() + getRandomInt(2, 7)); // Info: (20260604 - Tzuhan) 委外通常在成型後幾天進行

      outsourcedLogs.push({
        PO_Number: poNumber,
        Ref_WorkOrderID: wo,
        ProductID: productId,
        SupplierName: supplier,
        ProcessName: oProc.stepName,
        DispatchDate: poDate.toISOString().split("T")[0],
        InputWeight_kg: totalInputWeightKg,
        OutputWeight_kg: totalOutputWeightKg,
        SupplierReportedCarbon_kgCO2e: parseFloat(reportedCarbon.toFixed(2)),
        ProcessingFee_NTD: Math.floor(
          totalInputWeightKg * getRandomFloat(10, 50),
        ),
      });
    }
  }

  outsourcedLogs.sort(
    (a, b) =>
      new Date(a.DispatchDate).getTime() - new Date(b.DispatchDate).getTime(),
  );

  const csvOutput = stringify(outsourcedLogs, { header: true });
  fs.writeFileSync(outFile, csvOutput, "utf-8");

  console.log(
    `🎉 [SUCCESS] 委外採購與碳排日誌已產生：${outFile} (共 ${outsourcedLogs.length} 筆)`,
  );
}

import url from "url";
const currentFilePath = url.fileURLToPath(import.meta.url);
if (
  process.argv[1] &&
  fs.realpathSync(process.argv[1]) === fs.realpathSync(currentFilePath)
) {
  const stockId = process.argv[2];
  if (!stockId) {
    console.error("❌ 請提供股票代號");
    process.exit(1);
  }
  generateOutsourcedLogs(stockId).catch(console.error);
}
