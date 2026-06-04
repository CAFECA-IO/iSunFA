import fs from "node:fs";
import path from "node:path";
import { reportDownloadTaskRepo } from "@/repositories/report_download_task.repo";
import { TaskType, TaskStatus, Prisma } from "@/generated";
import {
  downloadFinancialData,
  downloadFinancialReport,
} from "@/services/financial_report.download.service";
import { downloadEsgReport } from "@/services/esg_report.download.service";
import { downloadEsgMetrics } from "@/services/esg_metrics.download.service";
import { runWithConcurrency } from "@/lib/utils/concurrency";

async function main() {
  console.log("🚀 啟動終極下載主控台 (Commander)...");

  let isShuttingDown = false;
  process.on("SIGINT", () => {
    console.log("\n⚠️ [系統] 接收到中斷訊號 (Ctrl+C)，準備優雅關機...");
    console.log("請稍候，正在等待執行中的任務安全結束，不要強制關閉終端機！");
    isShuttingDown = true;
  });

  // Info: (20260408 - Tzuhan) 1. 解析 CLI 參數 (設定併發數與撈取上限)
  const args = process.argv.slice(2);
  const limit = parseInt(
    args.find((a) => a.startsWith("--limit="))?.split("=")[1] || "100",
  );
  const concurrency = parseInt(
    args.find((a) => a.startsWith("--concurrency="))?.split("=")[1] || "5",
  );
  const stockIdArg = args
    .find((a) => a.startsWith("--stockId="))
    ?.split("=")[1];
  const yearArg = args.find((a) => a.startsWith("--year="))?.split("=")[1];

  console.log(
    `⚙️ 設定：單次批次上限 = ${limit} 筆, 同時併發數 = ${concurrency}`,
  );

  // Info: (20260408 - Tzuhan) 2. 從資料庫撈取 PENDING 或「失敗但重試次數未達上限」的工單
  const whereClause: Prisma.ReportDownloadTaskWhereInput = {
    OR: [
      { status: TaskStatus.PENDING },
      { status: TaskStatus.FAILED, retryCount: { lt: 3 } },
    ],
  };
  if (stockIdArg && stockIdArg !== "ALL")
    whereClause.stockId = { in: stockIdArg.split(",") };
  if (yearArg && yearArg !== "ALL") whereClause.year = parseInt(yearArg);

  const pendingTasks = await reportDownloadTaskRepo.findMany({
    where: whereClause,
    take: limit,
    orderBy: { updatedAt: "asc" }, // Info: (20260408 - Tzuhan) 改用 updatedAt，讓很久沒動的優先處理
  });

  if (pendingTasks.length === 0) {
    console.log(
      `\n🎉 太棒了！目前資料庫中沒有任何 PENDING 的任務，所有報告皆已下載完畢。`,
    );
    return;
  }

  console.log(
    `\n📦 撈取了 ${pendingTasks.length} 筆 PENDING 任務，準備開始消化...`,
  );

  let successCount = 0;
  let failCount = 0;

  // Info: (20260408 - Tzuhan) 3. 建立併發任務池 (Task Factory)
  const taskFactories = pendingTasks.map((task) => async () => {
    if (isShuttingDown) return;

    // Info: (20260409 - Tzuhan) 隨機延遲 1-3 秒，避免對證交所造成瞬間流量衝擊
    const jitterMs = 1000 + Math.random() * 2000;
    await new Promise((resolve) => setTimeout(resolve, jitterMs));

    console.log(`⏳ [開始] ${task.stockId} - ${task.year} 年 ${task.taskType}`);

    const baseDir = path.join(
      process.cwd(),
      "data",
      task.stockId,
      task.year.toString(),
      "inputs",
      "raw_reports",
    );
    let savePath = "";
    let isSuccess = false;

    try {
      switch (task.taskType) {
        case TaskType.FIN_REPORT:
          savePath = path.join(baseDir, `${task.year}_FIN_REPORT.pdf`);
          isSuccess = await downloadFinancialReport(
            task.stockId,
            task.year,
            savePath,
          );
          break;
        case TaskType.FIN_DATA:
          savePath = path.join(baseDir, `${task.year}_FIN_DATA.json`);
          isSuccess = await downloadFinancialData(
            task.stockId,
            task.marketType,
            task.year,
            savePath,
          );
          break;
        case TaskType.ESG_REPORT:
          savePath = path.join(baseDir, `${task.year}_ESG_REPORT.pdf`);
          isSuccess = await downloadEsgReport(
            task.stockId,
            task.marketType as "sii" | "otc",
            task.year,
            savePath,
          );
          break;
        case TaskType.ESG_METRICS:
          savePath = path.join(baseDir, `${task.year}_ESG_METRICS.json`);
          isSuccess = await downloadEsgMetrics(
            task.stockId,
            task.year,
            savePath,
          );
          break;
      }

      // Info: (20260408 - Tzuhan) 📝 狀態回報 (將結果更新回資料庫)
      await reportDownloadTaskRepo.update({
        where: { id: task.id },
        data: {
          status: isSuccess ? TaskStatus.SUCCESS : TaskStatus.FAILED,
          filePath: isSuccess ? savePath : null,
          errorMsg: isSuccess ? null : "查無檔案、尚未上傳或非預期格式",
          retryCount: { increment: isSuccess ? 0 : 1 },
          updatedAt: new Date(),
        },
      });

      if (isSuccess) {
        successCount++;
        console.log(
          `✅ [成功] ${task.stockId} - ${task.year} 年 ${task.taskType}`,
        );
      } else {
        failCount++;
        console.log(
          `❌ [失敗] ${task.stockId} - ${task.year} 年 ${task.taskType}`,
        );
      }
    } catch (error) {
      console.error(`💥 [崩潰] ${task.stockId} - ${task.taskType}:`, error);
      if (savePath && fs.existsSync(savePath)) {
        fs.rmSync(savePath, { force: true });
        console.log(`🗑️ [清理] 已刪除不完整的檔案殘骸: ${savePath}`);
      }
      await reportDownloadTaskRepo.update({
        where: { id: task.id },
        data: {
          status: TaskStatus.FAILED,
          errorMsg: (error as Error).message,
          retryCount: { increment: 1 },
          updatedAt: new Date(),
        },
      });
      failCount++;
    }
  });
  // Info: (20260408 - Tzuhan) 4. 點火啟動！將所有任務交給併發控制器
  console.log(
    `\n🚦 [Commander] 開始執行併發任務 (Concurrency Limit: ${concurrency})...\n`,
  );
  const startTime = Date.now();

  await runWithConcurrency(taskFactories, concurrency);

  const dlqCount = await reportDownloadTaskRepo.count({
    where: { status: TaskStatus.FAILED, retryCount: { gte: 3 } },
  });

  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n🏁 [Commander] 批次執行完畢！共耗時 ${elapsedSec} 秒。`);
  console.log(`📊 統計：成功 ${successCount} 筆，失敗 ${failCount} 筆。`);

  if (dlqCount > 0) {
    console.log(
      `🚨 [警告] 目前資料庫中有 ${dlqCount} 筆任務已達到重試上限 (Dead Letter Queue)`,
    );
    console.log(`建議使用 Prisma Studio 手動檢查這些公司的異常狀態。`);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await reportDownloadTaskRepo.disconnect();
  });
