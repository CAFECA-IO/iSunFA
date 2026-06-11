import * as fs from "fs";
import * as path from "path";
import { stringify } from "csv-stringify/sync";
import {
  ICompanyPersona,
  IBomData,
  IManufacturingProcess,
  IProductBom,
  IMesWorkOrder,
} from "@/interfaces/cbam";
import { TAIPOWER_EMISSION_FACTOR_2023 } from "@/constants/esg";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFloat(min: number, max: number, decimals: number = 2) {
  const str = (Math.random() * (max - min) + min).toFixed(decimals);
  return MoneyUtil.toDecimal(str).toNumber();
}

export async function generateMESLogs(stockId: string, year: string = "2024") {
  const dataDir = path.resolve(process.cwd(), `data/${stockId}/${year}`);
  const mockSourcesDir = path.join(dataDir, "outputs", "mock_sources");
  const ingestionDir = path.join(dataDir, "outputs", "system_ingestion");

  if (!fs.existsSync(ingestionDir)) {
    fs.mkdirSync(ingestionDir, { recursive: true });
  }

  const bomFile = path.join(mockSourcesDir, "boms_and_precursors.json");
  const personaFile = path.join(
    dataDir,
    "outputs",
    `${stockId}_company_persona.json`,
  );
  const outFile = path.join(ingestionDir, "mes_work_orders.csv");

  if (!fs.existsSync(bomFile) || !fs.existsSync(personaFile)) {
    console.error(
      `❌ 找不到必備檔案 (${bomFile} 或 ${personaFile})。請確認之前的腳本已執行。`,
    );
    process.exit(1);
  }

  const bomData: IBomData = JSON.parse(fs.readFileSync(bomFile, "utf-8"));
  const persona: ICompanyPersona = JSON.parse(
    fs.readFileSync(personaFile, "utf-8"),
  );

  if (!persona.totalScope2Emissions_tCO2e || !persona.totalRevenue_NTD) {
    console.error(
      "❌ Persona 中缺少 totalScope2Emissions_tCO2e 或 totalRevenue_NTD，請重新執行 persona_generator.ts",
    );
    process.exit(1);
  }

  console.log(
    `🚀 [CBAM MES Generator] 開始運用 Top-Down Allocation 產生廠內能耗與工單紀錄...`,
  );

  const products = bomData.products;
  // Info: (20260604 - Tzuhan) 濾除委外製程 (例如：表面處理、電鍍通常由外部協力廠負責，不應出現在廠內電表紀錄)
  const inHouseProcesses = persona.manufacturingProcess.filter(
    (p: IManufacturingProcess) =>
      !p.description.includes("委外") && !p.stepName.includes("表面處理"),
  );
  // Info: (20260604 - Tzuhan) 校驗製程權重總和
  const totalWeight = inHouseProcesses.reduce(
    (sum, p) => sum + (p.processWeight_percent || 0),
    0,
  );
  if (totalWeight === 0) {
    console.warn("⚠️ 警告：畫像中的製程無 processWeight_percent，將平均分配。");
    inHouseProcesses.forEach(
      (p) => (p.processWeight_percent = 100 / inHouseProcesses.length),
    );
  } else if (Math.abs(totalWeight - 100) > 1) {
    console.warn(
      `⚠️ 警告：廠內製程權重總和為 ${totalWeight}%，已自動正規化至 100%。`,
    );
    inHouseProcesses.forEach(
      (p) =>
        (p.processWeight_percent =
          (p.processWeight_percent / totalWeight) * 100),
    );
  }

  const mesLogs: IMesWorkOrder[] = [];

  // Info: (20260604 - Tzuhan) 產品特徵擴充 (單價與重量)
  const productMeta = products.map((p: IProductBom) => {
    // Info: (20260604 - Tzuhan) 透過複雜度 alpha 聯動單價：高階品 180~200，標準品 100~120
    const isHighEnd =
      p.productId.includes("EV") || p.productId.includes("SSEX");
    const pricePerKg = isHighEnd
      ? getRandomFloat(180, 200)
      : getRandomFloat(100, 120);
    const unitWeight = p.bom[0].inputWeightKg * 0.85; // Info: (20260604 - Tzuhan) 假設淨重
    return { ...p, pricePerKg, unitWeight, isHighEnd };
  });

  const totalScope2EmissionsKg = persona.totalScope2Emissions_tCO2e * 1000;
  const totalRevenueNtd = persona.totalRevenue_NTD;

  let currentRevenue = 0;
  let accumulatedCarbon = 0;
  let workOrderCounter = 1;

  console.log(
    `📊 宏觀基準池 (Macro Pool): 總營收 ${totalRevenueNtd.toLocaleString()} NTD, 總碳排 ${totalScope2EmissionsKg.toLocaleString()} kgCO2e`,
  );

  while (currentRevenue < totalRevenueNtd) {
    const prod = productMeta[getRandomInt(0, productMeta.length - 1)];
    let targetOutputQty = getRandomInt(10000, 50000);

    let batchRevenueNtd = targetOutputQty * prod.unitWeight * prod.pricePerKg;
    let isLastOrder = false;

    // Info: (20260604 - Tzuhan) 餘額校正 (Mass Balance)
    if (currentRevenue + batchRevenueNtd >= totalRevenueNtd) {
      isLastOrder = true;
      batchRevenueNtd = totalRevenueNtd - currentRevenue;
      targetOutputQty = Math.floor(
        batchRevenueNtd / (prod.unitWeight * prod.pricePerKg),
      );
      if (targetOutputQty <= 0) targetOutputQty = 1;
    }

    currentRevenue += batchRevenueNtd;

    const workOrderId = `WO-${year}-${prod.productId.split("-")[1]}-${String(workOrderCounter).padStart(5, "0")}`;
    workOrderCounter++;

    // Info: (20260604 - Tzuhan) 工單排程時間
    // Info: (20260605 - AI) 使用 YYYY-MM-DD 強制轉換為 UTC 日期以避免時區偏差導致日期倒退到 2024-12-31
    const timestamp = new Date(`${year}-01-01`);
    timestamp.setDate(
      timestamp.getDate() +
        Math.floor((currentRevenue / totalRevenueNtd) * 360),
    );

    // Info: (20260604 - Tzuhan) 起始投入重量 (Mass Balance)
    let currentInputWeight = MoneyUtil.toDecimal(
      (targetOutputQty * prod.unitWeight * 1.05).toFixed(2),
    ).toNumber();

    // Info: (20260604 - Tzuhan) 分配碳排至各製程
    for (let i = 0; i < inHouseProcesses.length; i++) {
      const process = inHouseProcesses[i];
      const machineId = `${process.stepName.substring(0, 2)}-M${getRandomInt(1, 5)}`;

      let processCarbon = 0;

      // Info: (20260604 - Tzuhan) Top-Down Allocation Formula: E_batch = E_total * (C_batch / C_total) * W_process
      // Info: (20260604 - Tzuhan) alpha (產品複雜度) 已經反映在 batchRevenueNtd 的 pricePerKg 中
      if (isLastOrder && i === inHouseProcesses.length - 1) {
        // Info: (20260604 - Tzuhan) 確保總碳排餘額完全清零 (Mass Balance)
        processCarbon = totalScope2EmissionsKg - accumulatedCarbon;
      } else {
        processCarbon =
          totalScope2EmissionsKg *
          (batchRevenueNtd / totalRevenueNtd) *
          (process.processWeight_percent / 100);
      }

      accumulatedCarbon += processCarbon;

      // Info: (20260604 - Tzuhan) 根據排碳係數逆推耗電量
      const energyKwh = MoneyUtil.toDecimal(
        (processCarbon / TAIPOWER_EMISSION_FACTOR_2023).toFixed(2),
      ).toNumber();
      const durationHrs = MoneyUtil.toDecimal(
        (energyKwh / getRandomFloat(10, 50)).toFixed(1),
      ).toNumber(); // 推算合理加工時數

      // Info: (20260604 - Tzuhan) 模擬每一站的質量耗損
      const scrapWeight = MoneyUtil.toDecimal(
        (currentInputWeight * process.lossRate).toFixed(2),
      ).toNumber();
      const goodWeight = MoneyUtil.toDecimal(
        (currentInputWeight - scrapWeight).toFixed(2),
      ).toNumber();

      mesLogs.push({
        WorkOrderID: workOrderId,
        Timestamp: timestamp.toISOString().split("T")[0],
        ProductID: prod.productId,
        ProcessStep: process.stepName,
        MachineID: machineId,
        InputWeight_kg: currentInputWeight,
        GoodWeight_kg: goodWeight,
        ScrapWeight_kg: scrapWeight,
        DurationHrs: durationHrs > 0 ? durationHrs : 0.1,
        EnergyConsumed_kWh: energyKwh,
        LossRateAssumed: process.lossRate,
      });

      // Info: (20260604 - Tzuhan) 下一站的投入等於本站的良品產出
      currentInputWeight = goodWeight;
    }
  }

  mesLogs.sort(
    (a, b) => new Date(a.Timestamp).getTime() - new Date(b.Timestamp).getTime(),
  );

  const csvOutput = stringify(mesLogs, { header: true });
  fs.writeFileSync(outFile, csvOutput, "utf-8");

  console.log(
    `🎉 [SUCCESS] 運用 Top-Down 分配演算法完成 MES 工單產生：${outFile} (共 ${workOrderCounter - 1} 批工單, ${mesLogs.length} 筆製程紀錄)`,
  );
  console.log(
    `⚖️  [Mass Balance 核驗] 累積分配碳排: ${Math.round(accumulatedCarbon)} kgCO2e / 目標總碳排: ${Math.round(totalScope2EmissionsKg)} kgCO2e`,
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
  generateMESLogs(stockId, year).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
