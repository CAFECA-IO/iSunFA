import { TaskType, TaskStatus } from "@/generated/client";
import { prisma } from "@/lib/prisma";

async function main() {
  let targetStockIds: string[] = [];
  let targetYears: number[] = [];

  // Info: (20260402 - Tzuhan) 解析參數
  const args = process.argv.slice(2);
  for (const arg of args) {
    // Info: (20260402 - Tzuhan) 支援逗號分隔，例如 "2023,2024" -> [2023, 2024]
    if (arg.startsWith("--year="))
      targetYears = arg.split("=")[1].split(",").map(Number);
    // Info: (20260402 - Tzuhan) 支援逗號分隔，例如 "1101,2330" -> ['1101', '2330']
    if (arg.startsWith("--stockId="))
      targetStockIds = arg
        .split("=")[1]
        .split(",")
        .map((s) => s.trim());
  }

  const currentYear = new Date().getFullYear();
  const taskTypes = [
    TaskType.FIN_REPORT,
    TaskType.FIN_DATA,
    TaskType.ESG_REPORT,
    TaskType.ESG_METRICS,
  ];

  // Info: (20260402 - Tzuhan) 撈取目標公司
  const companies = await prisma.company.findMany({
    where:
      targetStockIds.length > 0
        ? { stockId: { in: targetStockIds } }
        : { isActive: true },
  });

  const tasksToCreate = [];

  for (const company of companies) {
    let yearsToProcess = targetYears;

    // Info: (20260402 - Tzuhan) 情境：指定公司但未指定年份 -> 從上市年份抓到現在
    if (targetStockIds.length > 0 && targetYears.length === 0) {
      // Info: (20260402 - Tzuhan) 解析上市年份 (假設格式 YYYYMMDD 或 YYYMMDD)
      const listDate = company.listingDate || "";
      let startYear = 2010; // 預設最小值，因為 MOPS 太舊的資料可能拿不到

      if (listDate.length >= 4) {
        // Info: (20260402 - Tzuhan) 判斷是民國還是西元 (OpenAPI 兩者都有可能，需額外判斷，此處假設西元前四碼)
        const parsedYear = parseInt(listDate.substring(0, 4));
        if (parsedYear > 1900) startYear = Math.max(startYear, parsedYear);
      }

      for (let y = startYear; y <= currentYear; y++) {
        yearsToProcess.push(y);
      }
    }

    // Info: (20260402 - Tzuhan) 2024 為預設(如果什麼參數都沒給)
    if (yearsToProcess.length === 0) yearsToProcess = [2024];

    for (const year of yearsToProcess) {
      for (const type of taskTypes) {
        tasksToCreate.push({
          stockId: company.stockId,
          companyName: company.abbreviation ?? company.name,
          marketType: company.marketType,
          year,
          taskType: type,
          status: TaskStatus.PENDING,
          retryCount: 0,
        });
      }
    }
  }

  console.log(`🚀 準備開立 ${tasksToCreate.length} 個工單...`);
  const result = await prisma.reportDownloadTask.createMany({
    data: tasksToCreate,
    skipDuplicates: true,
  });
  console.log(`✅ 成功建立 ${result.count} 筆新任務。`);
}

main().catch(console.error);
